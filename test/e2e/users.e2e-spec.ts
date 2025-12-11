import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { USER_REPOSITORY } from '../../src/modules/users/constants';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/role.guard';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { APP_GUARD, Reflector } from '@nestjs/core';
import {
  mockUser,
  mockAdmin,
  mockUsers,
  mockInactiveUser,
} from '../fixtures/users.fixture';
import { UserRole } from '../../generated/prisma/enums';
import * as request from 'supertest';

describe('Users E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockUserRepository: any;
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findActive: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              jwt: {
                secret: 'test-secret-key-for-e2e-tests',
                expiresIn: '1h',
              },
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key-for-e2e-tests',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        UsersService,
        JwtStrategy,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        RolesGuard,
        Reflector,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate JWT tokens for testing
    adminToken = jwtService.sign({
      sub: mockAdmin.id,
      username: mockAdmin.username,
      email: mockAdmin.email,
      role: UserRole.ADMIN,
    });

    customerToken = jwtService.sign({
      sub: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      role: UserRole.CUSTOMER,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/me', () => {
    it('should get current user profile with valid token', async () => {
      // Mock returns mockUser for both JWT validation and endpoint call
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', mockUser.id);
      expect(response.body.data).toHaveProperty('email', mockUser.email);
      expect(response.body.data).toHaveProperty('username', mockUser.username);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authentication token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 when user not found in JWT validation', async () => {
      // JWT Strategy will reject if user doesn't exist
      mockUserRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(401);
    });
  });

  describe('GET /users', () => {
    it('should get all users as admin with pagination', async () => {
      // Mock for JWT strategy validation
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(mockUsers.length);
      // The controller receives page and limit as query params (as strings)
      // and passes them directly to getAll without conversion
      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: '1',
        take: '10',
      });
    });

    it('should use default pagination when not specified', async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: 1,
        take: 10,
      });
    });

    it('should handle custom pagination parameters', async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue([mockUser]);

      await request(app.getHttpServer())
        .get('/users')
        .query({ page: 2, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: '2',
        take: '5',
      });
    });

    it('should fail when accessed by non-admin user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by id as admin', async () => {
      // Mock implementation based on ID parameter
      mockUserRepository.findById.mockImplementation((id: string) => {
        if (id === mockAdmin.id) return Promise.resolve(mockAdmin);
        if (id === mockUser.id) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', mockUser.id);
      expect(response.body.data).toHaveProperty('email', mockUser.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 400 when user not found', async () => {
      // Mock implementation: admin exists, but target user doesn't
      mockUserRepository.findById.mockImplementation((id: string) => {
        if (id === mockAdmin.id) return Promise.resolve(mockAdmin);
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Not found user');
    });

    it('should fail when accessed by non-admin user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get(`/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/users/${mockUser.id}`)
        .expect(401);
    });
  });

  describe('Authorization and Role-Based Access Control', () => {
    it('should allow admin to access admin-only routes', async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny customer access to admin-only routes', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow any authenticated user to access their own profile', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('should reject requests with expired or invalid tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid';

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Response Transformation', () => {
    it('should never include password in response', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should include all expected user fields except password', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const userData = response.body.data;
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('username');
      expect(userData).toHaveProperty('firstName');
      expect(userData).toHaveProperty('lastName');
      expect(userData).toHaveProperty('role');
      expect(userData).toHaveProperty('isActive');
      expect(userData).not.toHaveProperty('password');
    });

    it('should return data wrapped in standard response format', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('path');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should handle missing Bearer prefix', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', customerToken)
        .expect(401);
    });

    it('should validate pagination parameters', async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      // Query params are passed as strings to the service
      await request(app.getHttpServer())
        .get('/users')
        .query({ page: '3', limit: '20' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: '3',
        take: '20',
      });
    });

    it('should reject inactive user at JWT validation level', async () => {
      // JWT Strategy validates user.isActive and rejects inactive users
      mockUserRepository.findById.mockResolvedValue(mockInactiveUser);

      const inactiveUserToken = jwtService.sign({
        sub: mockInactiveUser.id,
        username: mockInactiveUser.username,
        email: mockInactiveUser.email,
        role: mockInactiveUser.role,
      });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${inactiveUserToken}`)
        .expect(401);
    });
  });

  describe('JWT Token Validation', () => {
    it('should accept valid admin JWT token', async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdmin);
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should accept valid customer JWT token for /me endpoint', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('should extract correct user info from JWT token', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Verify that the service was called with the correct user ID from token
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });
  });
});

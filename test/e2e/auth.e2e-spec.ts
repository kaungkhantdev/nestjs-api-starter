import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { USER_REPOSITORY } from '../../src/modules/users/constants';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../../src/modules/auth/strategies/local.strategy';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { mockUser } from '../fixtures/users.fixture';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';

jest.mock('bcrypt');

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockUserRepository: any;

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
      controllers: [AuthController],
      providers: [
        AuthService,
        UsersService,
        JwtStrategy,
        LocalStrategy,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
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
      }),
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user', async () => {
      const registerData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        ...registerData,
        id: 'new-user-id',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', registerData.email);
      expect(response.body.user).toHaveProperty(
        'username',
        registerData.username,
      );
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail registration for existing email', async () => {
      const registerData = {
        email: mockUser.email,
        username: 'newuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com',
        // missing username, password, firstName, lastName
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        username: mockUser.username,
        password: 'password123',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('id', mockUser.id);
      expect(response.body.user).toHaveProperty('username', mockUser.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail login with invalid password', async () => {
      const loginData = {
        username: mockUser.username,
        password: 'wrongpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail login for non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockUserRepository.findByUsername.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should validate required login fields', async () => {
      const invalidData = {
        username: 'testuser',
        // missing password
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate valid JWT token on login', async () => {
      const loginData = {
        username: mockUser.username,
        password: 'password123',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(201);

      const token = response.body.accessToken;
      const decoded = jwtService.verify(token);

      expect(decoded).toHaveProperty('sub', mockUser.id);
      expect(decoded).toHaveProperty('email', mockUser.email);
      expect(decoded).toHaveProperty('role', mockUser.role);
    });

    it('should generate valid JWT token on registration', async () => {
      const registerData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        ...registerData,
        id: 'new-user-id',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const token = response.body.accessToken;
      const decoded = jwtService.verify(token);

      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('email', registerData.email);
    });
  });
});

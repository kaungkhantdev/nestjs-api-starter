import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { USER_REPOSITORY } from '../../src/modules/users/constants';
import { createMockUser } from '../fixtures/users.fixture';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

/**
 * Integration tests for user registration -> login flow
 * These tests verify that multiple services work together correctly
 */
describe('User Registration Flow (Integration)', () => {
  let authService: AuthService;
  let usersService: UsersService;
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
                secret: 'integration-test-secret',
                expiresIn: '1h',
              },
            }),
          ],
        }),
        JwtModule.register({
          secret: 'integration-test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        UsersService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Lifecycle', () => {
    it('should complete registration -> login -> profile access flow', async () => {
      // Step 1: Registration
      const registrationData = {
        email: 'integration@example.com',
        username: 'integrationuser',
        password: 'password123',
        firstName: 'Integration',
        lastName: 'Test',
      };

      const createdUser = createMockUser({
        ...registrationData,
        id: 'integration-user-id',
        password: 'hashed-password',
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const registrationResult = await authService.register(registrationData);

      expect(registrationResult).toHaveProperty('accessToken');
      expect(registrationResult.user.email).toBe(registrationData.email);

      // Verify JWT contains correct data
      const registrationToken = jwtService.verify(
        registrationResult.accessToken,
      );
      expect(registrationToken.sub).toBe(createdUser.id);

      // Step 2: Login with same credentials
      mockUserRepository.findByUsername.mockResolvedValue(createdUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResult = await authService.login({
        username: registrationData.username,
        password: registrationData.password,
      });

      expect(loginResult).toHaveProperty('accessToken');
      expect(loginResult.user.id).toBe(createdUser.id);

      // Verify login token is valid
      const loginToken = jwtService.verify(loginResult.accessToken);
      expect(loginToken.sub).toBe(createdUser.id);

      // Step 3: Access profile using token payload
      mockUserRepository.findById.mockResolvedValue(createdUser);

      const userProfile = await usersService.getFindById(loginToken.sub);

      expect(userProfile).toBeDefined();
      expect(userProfile?.email).toBe(registrationData.email);
    });

    it('should prevent duplicate registration', async () => {
      const existingUser = createMockUser({
        email: 'existing@example.com',
        username: 'existinguser',
      });

      // First registration succeeds
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(existingUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const firstResult = await authService.register({
        email: existingUser.email,
        username: existingUser.username,
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      });

      expect(firstResult).toHaveProperty('accessToken');

      // Second registration with same email fails
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        authService.register({
          email: existingUser.email,
          username: 'newusername',
          password: 'password123',
          firstName: 'Another',
          lastName: 'User',
        }),
      ).rejects.toThrow('User already exists');
    });

    it('should handle login failure after registration', async () => {
      const user = createMockUser({
        email: 'faillogin@example.com',
        username: 'failloginuser',
      });

      // Registration
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await authService.register({
        email: user.email,
        username: user.username,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      // Login with wrong password
      mockUserRepository.findByUsername.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          username: user.username,
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Token Validation Across Services', () => {
    it('should validate token payload matches user data', async () => {
      const user = createMockUser();

      mockUserRepository.findByUsername.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResult = await authService.login({
        username: user.username,
        password: 'password123',
      });

      const tokenPayload = jwtService.verify(loginResult.accessToken);

      // Token payload should match user data
      expect(tokenPayload.sub).toBe(user.id);
      expect(tokenPayload.email).toBe(user.email);
      expect(tokenPayload.role).toBe(user.role);
      expect(tokenPayload.username).toBe(user.username);
    });

    it('should allow service access with valid token payload', async () => {
      const user = createMockUser();

      // Login to get token
      mockUserRepository.findByUsername.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResult = await authService.login({
        username: user.username,
        password: 'password123',
      });

      const tokenPayload = jwtService.verify(loginResult.accessToken);

      // Use token payload to access user service
      mockUserRepository.findById.mockResolvedValue(user);

      const userFromService = await usersService.getFindById(tokenPayload.sub);

      expect(userFromService?.id).toBe(user.id);
    });
  });
});

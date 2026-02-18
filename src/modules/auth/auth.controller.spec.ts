import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { mockUser } from '../../../test/fixtures/users.fixture';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Partial<Response>;

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    const registerMockResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'new-user-id',
        email: registerDto.email,
        username: registerDto.username,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: mockUser.role,
      },
    };

    it('should call authService.register with correct dto', async () => {
      authService.register.mockResolvedValue(registerMockResponse);

      const result = await controller.register(
        registerDto,
        mockResponse as Response,
      );

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        accessToken: registerMockResponse.accessToken,
        user: registerMockResponse.user,
      });
    });

    it('should set refreshToken cookie on successful registration', async () => {
      authService.register.mockResolvedValue(registerMockResponse);

      await controller.register(registerDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        registerMockResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should return auth response without refreshToken', async () => {
      authService.register.mockResolvedValue(registerMockResponse);

      const result = await controller.register(
        registerDto,
        mockResponse as Response,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', registerDto.email);
    });

    it('should propagate errors from authService', async () => {
      const error = new Error('User already exists');
      authService.register.mockRejectedValue(error);

      await expect(
        controller.register(registerDto, mockResponse as Response),
      ).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    const loginDto = {
      username: 'testuser',
      password: 'password123',
    };

    it('should call authService.login with correct dto', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockResponse as Response);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        accessToken: mockAuthResponse.accessToken,
        user: mockAuthResponse.user,
      });
    });

    it('should set refreshToken cookie on successful login', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should return auth response without refreshToken', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockResponse as Response);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should propagate errors from authService', async () => {
      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValue(error);

      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    const mockRefreshResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    it('should return new access token for valid refresh token', async () => {
      const mockRequest = {
        cookies: { refreshToken: 'valid-refresh-token' },
      } as Partial<Request> as Request;

      authService.refresh.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(
        mockRequest,
        mockResponse as Response,
      );

      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual({ accessToken: mockRefreshResponse.accessToken });
    });

    it('should rotate refresh token cookie', async () => {
      const mockRequest = {
        cookies: { refreshToken: 'valid-refresh-token' },
      } as Partial<Request> as Request;

      authService.refresh.mockResolvedValue(mockRefreshResponse);

      await controller.refresh(mockRequest, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockRefreshResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should throw UnauthorizedException when no refresh token in cookies', async () => {
      const mockRequest = {
        cookies: {},
      } as Partial<Request> as Request;

      await expect(
        controller.refresh(mockRequest, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.refresh(mockRequest, mockResponse as Response),
      ).rejects.toThrow('No refresh token');
    });

    it('should propagate errors from authService', async () => {
      const mockRequest = {
        cookies: { refreshToken: 'invalid-token' },
      } as Partial<Request> as Request;

      authService.refresh.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        controller.refresh(mockRequest, mockResponse as Response),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should clear refreshToken cookie', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        mockUser.id,
        mockResponse as Response,
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/api/v1/auth/refresh',
      });
      expect(result).toEqual({ success: true });
    });

    it('should return success true', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        mockUser.id,
        mockResponse as Response,
      );

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('me', () => {
    it('should return user without password', () => {
      const result = controller.me(mockUser);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).toHaveProperty('username', mockUser.username);
    });

    it('should include all user fields except password', () => {
      const result = controller.me(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });
  });
});

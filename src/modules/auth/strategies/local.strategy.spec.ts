import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { LocalStrategy } from './local.strategy';
import { mockUserWithoutPassword } from '../../../../test/fixtures/users.fixture';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mochAuthService = {
      validateCredentials: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mochAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateCredentials.mockResolvedValue(
        mockUserWithoutPassword,
      );

      const result = await strategy.validate(
        mockUserWithoutPassword.username,
        'password123',
      );
      expect(authService.validateCredentials).toHaveBeenCalledWith(
        mockUserWithoutPassword.username,
        'password123',
      );
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should propagate UnauthorizedException from authService', async () => {
      authService.validateCredentials.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        strategy.validate('testuser', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate Account inactive error', async () => {
      authService.validateCredentials.mockRejectedValue(
        new UnauthorizedException('Account is inactive'),
      );

      await expect(
        strategy.validate('inactiveuser', 'password123'),
      ).rejects.toThrow('Account is inactive');
    });
  });
});

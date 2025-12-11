import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import {
  mockUser,
  mockInactiveUser,
} from '../../../../test/fixtures/users.fixture';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.secret') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const mockUsersService = {
      getFindById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when JWT secret is not defined', () => {
      const configWithoutSecret = {
        get: jest.fn().mockReturnValue(null),
      };

      expect(
        () =>
          new JwtStrategy(
            configWithoutSecret as unknown as ConfigService,
            {} as UsersService,
          ),
      ).toThrow('JWT secret is not defined in configuration');
    });
  });

  describe('validate', () => {
    const mockPayload: JwtPayload = {
      sub: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      role: mockUser.role,
    };

    it('should return user data for valid payload', async () => {
      usersService.getFindById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);
      expect(usersService.getFindById).toHaveBeenCalledWith(mockPayload.sub);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.getFindById.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      usersService.getFindById.mockResolvedValue(mockInactiveUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

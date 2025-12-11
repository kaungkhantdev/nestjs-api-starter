import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  mockUser,
  mockUsers,
  mockAdmin,
} from '../../../test/fixtures/users.fixture';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      getFindById: jest.fn(),
      getAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      usersService.getFindById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockUser.id);

      expect(usersService.getFindById).toHaveBeenCalledWith(mockUser.id);
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw BadRequestException when user not found', async () => {
      usersService.getFindById.mockResolvedValue(null);

      await expect(controller.getProfile('nonexistent-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getProfile('nonexistent-id')).rejects.toThrow(
        'Not found user',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users with default pagination', async () => {
      usersService.getAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(usersService.getAll).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(mockUsers);
    });

    it('should return users with custom pagination', async () => {
      usersService.getAll.mockResolvedValue(mockUsers);

      await controller.findAll(2, 5);

      expect(usersService.getAll).toHaveBeenCalledWith(2, 5);
    });

    it('should handle empty results', async () => {
      usersService.getAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by id without password', async () => {
      usersService.getFindById.mockResolvedValue(mockAdmin);

      const result = await controller.findOne(mockAdmin.id);

      expect(usersService.getFindById).toHaveBeenCalledWith(mockAdmin.id);
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', mockAdmin.id);
    });

    it('should throw BadRequestException when user not found', async () => {
      usersService.getFindById.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        'Not found user',
      );
    });
  });
});

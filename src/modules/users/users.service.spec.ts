import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { USER_REPOSITORY } from './constants';
import { IUserRepository } from './repositories/users.repository.interface';
import {
  mockUser,
  mockUsers,
  createMockUser,
} from '../../../test/fixtures/users.fixture';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findActive: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(USER_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await service.getUserByUsername('testuser');

      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      const result = await service.getUserByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getFindById', () => {
    it('should return user when found', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getFindById('user-123');

      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await service.getFindById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users with default pagination', async () => {
      const activeUsers = mockUsers.filter((u) => u.isActive);
      userRepository.findActive.mockResolvedValue(activeUsers);

      const result = await service.getActiveUsers();

      expect(userRepository.findActive).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(activeUsers);
    });

    it('should return active users with custom pagination', async () => {
      const activeUsers = mockUsers.filter((u) => u.isActive);
      userRepository.findActive.mockResolvedValue(activeUsers);

      await service.getActiveUsers(2, 5);

      expect(userRepository.findActive).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
      });
    });

    it('should calculate correct skip for different pages', async () => {
      userRepository.findActive.mockResolvedValue([]);

      await service.getActiveUsers(3, 10);

      expect(userRepository.findActive).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
      });
    });
  });

  describe('createUser', () => {
    const userData = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'hashedpassword',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create user when email does not exist', async () => {
      const newUser = createMockUser({ ...userData, id: 'new-id' });
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(newUser);

      const result = await service.createUser(userData);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(newUser);
    });

    it('should throw error when email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.createUser(userData)).rejects.toThrow(
        'User already exists',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should skip email check when email is not provided', async () => {
      const userDataWithoutEmail = { ...userData, email: undefined };
      const newUser = createMockUser({ id: 'new-id' });
      userRepository.create.mockResolvedValue(newUser);

      await service.createUser(userDataWithoutEmail);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all users with pagination', async () => {
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.getAll(0, 10);

      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(mockUsers);
    });

    it('should pass skip and take correctly', async () => {
      userRepository.findAll.mockResolvedValue([]);

      await service.getAll(20, 5);

      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 20,
        take: 5,
      });
    });
  });
});

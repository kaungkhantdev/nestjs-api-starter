import { Inject, Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import {
  IUsersRepository,
  USER_REPOSITORY,
} from './repositories/users.repository.interface';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/users.response.dto';

type CreateUserInput = Pick<
  User,
  'email' | 'username' | 'password' | 'firstName' | 'lastName'
>;
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getFindById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getUserByUsername(email: string): Promise<User | null> {
    return this.usersRepository.findByUsername(email);
  }

  async getActiveUsers(page = 1, limit = 10): Promise<User[]> {
    return this.usersRepository.findActive({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async createUser(data: CreateUserInput): Promise<User> {
    // Check if exists
    const existing =
      data.email && (await this.usersRepository.findByEmail(data.email));
    // console.log(existing);
    if (existing) {
      throw new Error('User already exists');
    }

    const safeData: CreateUserInput = {
      email: data.email,
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    return await this.usersRepository.create(safeData);
  }

  async getAll(
    page: number,
    limit: number,
  ): Promise<PaginatedUsersResponseDto> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ skip, take: limit }),
      this.usersRepository.count(),
    ]);

    return {
      items: plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      }),
      page,
      limit,
      total,
    };
  }

  async setRefreshTokenHash(
    userId: string,
    refreshTokenHash: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshTokenHash, 10);
    await this.usersRepository.update(userId, {
      refreshTokenHash: hash,
    });
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash: null });
  }
}

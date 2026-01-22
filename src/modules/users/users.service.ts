import { Inject, Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/client';
import {
  IUsersRepository,
  USER_REPOSITORY,
} from './repositories/users.repository.interface';

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

  async createUser(data: Partial<User>): Promise<User> {
    // Check if exists
    const existing =
      data.email && (await this.usersRepository.findByEmail(data.email));
    // console.log(existing);
    if (existing) {
      throw new Error('User already exists');
    }
    return this.usersRepository.create(data);
  }

  async getAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ skip, take: limit }),
      this.usersRepository.count(),
    ]);

    return {
      items: users,
      page,
      limit,
      total,
    };
  }
}

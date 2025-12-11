import { Inject, Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/client';
import { USER_REPOSITORY } from './constants';
import { IUserRepository } from './repositories/users.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getFindById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getUserByUsername(email: string): Promise<User | null> {
    return this.userRepository.findByUsername(email);
  }

  async getActiveUsers(page = 1, limit = 10): Promise<User[]> {
    return this.userRepository.findActive({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async createUser(data: Partial<User>): Promise<User> {
    // Check if exists
    const existing =
      data.email && (await this.userRepository.findByEmail(data.email));
    // console.log(existing);
    if (existing) {
      throw new Error('User already exists');
    }
    return this.userRepository.create(data);
  }

  async getAll(skip: number, take: number) {
    return this.userRepository.findAll({ skip, take });
  }
}

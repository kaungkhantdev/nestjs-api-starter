import { User } from 'generated/prisma/client';
import { IRepository } from '@/core/repository';

/**
 * User-specific repository interface
 * Extends generic IRepository and adds domain-specific methods
 */
export interface IUsersRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findActive(params?: { skip?: number; take?: number }): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol('IUsersRepository');

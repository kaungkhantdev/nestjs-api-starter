import { User } from 'generated/prisma/client';
import { IRepository } from '@/shared/repositories/interfaces';

/**
 * User-specific repository interface
 * Extends generic IRepository and adds domain-specific methods
 */
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findActive(params?: { skip?: number; take?: number }): Promise<User[]>;
}

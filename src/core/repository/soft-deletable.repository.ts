import { PrismaService } from '@/core/database/prisma.service';
import { GenericRepository } from './generic.repository';
import { ISoftDeletable } from './interfaces';
import {
  DefaultTypeMap,
  FindAllParams,
  ModelName,
  RepositoryTypeMap,
  SoftDeletableEntity,
} from './types';

/**
 * Soft-Deletable Repository
 *
 * Open/Closed Principle: Extends GenericRepository without modifying it
 * Use for entities that should be recoverable after deletion
 *
 * Features:
 * - softDelete(): Sets deletedAt timestamp instead of hard delete
 * - restore(): Clears deletedAt to recover entity
 * - findAll(): Automatically excludes soft-deleted records
 * - findAllWithDeleted(): Includes soft-deleted records
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository extends SoftDeletableRepository<User> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'User');
 *   }
 *
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findOne({ email, deletedAt: null });
 *   }
 * }
 * ```
 */
export class SoftDeletableRepository<
  T extends SoftDeletableEntity,
  M extends RepositoryTypeMap = DefaultTypeMap,
>
  extends GenericRepository<T, M>
  implements ISoftDeletable<T, M>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  // ========================================
  // Soft Delete Operations
  // ========================================

  async softDelete(id: string): Promise<T> {
    return await this.update(id, { deletedAt: new Date() } as M['UpdateInput']);
  }

  async restore(id: string): Promise<T> {
    return await this.update(id, { deletedAt: null } as M['UpdateInput']);
  }

  /**
   * Find all records including soft-deleted ones
   */
  async findAllWithDeleted(params?: FindAllParams<M>): Promise<T[]> {
    return await super.findAll(params);
  }

  // ========================================
  // Overridden Methods (exclude soft-deleted by default)
  // ========================================

  /**
   * Find all active (non-deleted) records
   */
  override async findAll(params?: FindAllParams<M>): Promise<T[]> {
    const where = {
      ...(params?.where as Record<string, unknown>),
      deletedAt: null,
    };
    return await super.findAll({ ...params, where } as FindAllParams<M>);
  }

  /**
   * Find by ID only if not soft-deleted
   */
  override async findById(
    id: string,
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null> {
    return await this.findOne(
      { id, deletedAt: null } as M['WhereInput'],
      options,
    );
  }

  /**
   * Find one active (non-deleted) record matching the criteria
   */
  override async findOne(
    where: M['WhereInput'],
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null> {
    return await super.findOne(
      {
        ...(where as Record<string, unknown>),
        deletedAt: null,
      } as M['WhereInput'],
      options,
    );
  }

  /**
   * Count only active (non-deleted) records
   */
  override async count(where?: M['WhereInput']): Promise<number> {
    return await super.count({
      ...(where as Record<string, unknown>),
      deletedAt: null,
    } as M['WhereInput']);
  }

  /**
   * Check existence only for non-deleted records
   */
  override async exists(id: string): Promise<boolean> {
    const result = await this.count({ id } as M['WhereInput']);
    return result > 0;
  }
}

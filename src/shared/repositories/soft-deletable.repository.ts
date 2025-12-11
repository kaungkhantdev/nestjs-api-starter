import { PrismaService } from '@/database/prisma.service';
import { GenericRepository } from './generic.repository';
import { ISoftDeletable } from './interfaces';
import { FindAllParams, ModelName, SoftDeletableEntity } from './types';

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
export class SoftDeletableRepository<T extends SoftDeletableEntity>
  extends GenericRepository<T>
  implements ISoftDeletable<T>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  // ========================================
  // Soft Delete Operations
  // ========================================

  async softDelete(id: string): Promise<T> {
    return this.update(id, { deletedAt: new Date() } as unknown);
  }

  async restore(id: string): Promise<T> {
    return this.update(id, { deletedAt: null } as unknown);
  }

  /**
   * Find all records including soft-deleted ones
   */
  async findAllWithDeleted(params?: FindAllParams): Promise<T[]> {
    return super.findAll(params);
  }

  // ========================================
  // Overridden Methods (exclude soft-deleted by default)
  // ========================================

  /**
   * Find all active (non-deleted) records
   */
  override async findAll(params?: FindAllParams): Promise<T[]> {
    const where = {
      ...(params?.where as Record<string, unknown>),
      deletedAt: null,
    };
    return super.findAll({ ...params, where });
  }

  /**
   * Find by ID only if not soft-deleted
   */
  override async findById(id: string, include?: unknown): Promise<T | null> {
    return this.findOne({ id, deletedAt: null }, include);
  }

  /**
   * Check existence only for non-deleted records
   */
  override async exists(id: string): Promise<boolean> {
    const result = await this.count({ id, deletedAt: null });
    return result > 0;
  }
}

import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { IBulkRepository, IRepository, ITransactional } from './interfaces';
import { WriteRepository } from './write.repository';
import { BatchResult, ModelName } from './types';

/**
 * Generic Repository
 *
 * Full CRUD + Bulk Operations + Transaction Support
 * Use this as the default repository for most entities
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CategoryRepository extends GenericRepository<Category> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'Category');
 *   }
 * }
 * ```
 */
export class GenericRepository<T>
  extends WriteRepository<T>
  implements IBulkRepository, ITransactional, IRepository<T>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  // ========================================
  // Bulk Operations
  // ========================================

  async createMany(
    data: unknown[],
    skipDuplicates = true,
  ): Promise<BatchResult> {
    return this.model.createMany({ data, skipDuplicates });
  }

  async updateMany(where: unknown, data: unknown): Promise<BatchResult> {
    return this.model.updateMany({ where, data });
  }

  async deleteMany(where: unknown): Promise<BatchResult> {
    return this.model.deleteMany({ where });
  }

  // ========================================
  // Transaction Support
  // ========================================

  async transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return this.prisma.$transaction(fn);
  }
}

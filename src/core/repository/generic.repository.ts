import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { IBulkRepository, IRepository, ITransactional } from './interfaces';
import { WriteRepository } from './write.repository';
import {
  BatchResult,
  DefaultTypeMap,
  ModelName,
  RepositoryTypeMap,
} from './types';

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
export class GenericRepository<T, M extends RepositoryTypeMap = DefaultTypeMap>
  extends WriteRepository<T, M>
  implements IBulkRepository<M>, ITransactional, IRepository<T, M>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  // ========================================
  // Bulk Operations
  // ========================================

  async createMany(
    data: M['CreateInput'][],
    skipDuplicates = true,
  ): Promise<BatchResult> {
    return await this.model.createMany({ data, skipDuplicates });
  }

  async updateMany(
    where: M['WhereInput'],
    data: M['UpdateInput'],
  ): Promise<BatchResult> {
    return await this.model.updateMany({ where, data });
  }

  async deleteMany(where: M['WhereInput']): Promise<BatchResult> {
    return await this.model.deleteMany({ where });
  }

  // ========================================
  // Transaction Support
  // ========================================

  async transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return await this.prisma.$transaction(fn);
  }
}

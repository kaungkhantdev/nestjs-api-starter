import { PrismaService } from '@/database/prisma.service';
import { BaseRepository } from './base.repository';
import { IReadRepository } from './interfaces';
import { FindAllParams, ModelName } from './types';

/**
 * Read Repository
 *
 * Single Responsibility: Query operations only
 * Use this when you need read-only access to data (e.g., reporting services)
 */
export class ReadRepository<T>
  extends BaseRepository<T>
  implements IReadRepository<T>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  async findById(id: string, include?: unknown): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include,
    }) as Promise<T | null>;
  }

  async findOne(where: unknown, include?: unknown): Promise<T | null> {
    return this.model.findFirst({ where, include }) as Promise<T | null>;
  }

  async findAll(params?: FindAllParams): Promise<T[]> {
    return this.model.findMany(params ?? {}) as Promise<T[]>;
  }

  async count(where?: unknown): Promise<number> {
    return this.model.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.model.count({ where: { id } });
    return result > 0;
  }
}

import { PrismaService } from '@/core/database/prisma.service';
import { BaseRepository } from './base.repository';
import { IReadRepository } from './interfaces';
import {
  DefaultTypeMap,
  FindAllParams,
  ModelName,
  RepositoryTypeMap,
} from './types';

/**
 * Read Repository
 *
 * Single Responsibility: Query operations only
 * Use this when you need read-only access to data (e.g., reporting services)
 */
export class ReadRepository<T, M extends RepositoryTypeMap = DefaultTypeMap>
  extends BaseRepository<T>
  implements IReadRepository<T, M>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  async findById(
    id: string,
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null> {
    return await this.model.findUnique({
      where: { id },
      ...(options?.include && { include: options.include }),
      ...(options?.select && { select: options.select }),
    });
  }

  async findOne(
    where: M['WhereInput'],
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null> {
    return await this.model.findFirst({
      where,
      ...(options?.include && { include: options.include }),
      ...(options?.select && { select: options.select }),
    });
  }

  async findAll(params?: FindAllParams<M>): Promise<T[]> {
    return await this.model.findMany(params ?? {});
  }

  async count(where?: M['WhereInput']): Promise<number> {
    return await this.model.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.model.count({ where: { id } });
    return result > 0;
  }
}

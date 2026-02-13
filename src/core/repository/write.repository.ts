import { PrismaService } from '@/core/database/prisma.service';
import { IWriteRepository } from './interfaces';
import { ReadRepository } from './read.repository';
import {
  DefaultTypeMap,
  ModelName,
  PrismaDelegate,
  RepositoryTypeMap,
} from './types';

/**
 * Write Repository
 *
 * Single Responsibility: Single-entity mutation operations
 * Extends ReadRepository to also provide query capabilities
 */
export class WriteRepository<T, M extends RepositoryTypeMap = DefaultTypeMap>
  extends ReadRepository<T, M>
  implements IWriteRepository<T, M>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  async create(data: M['CreateInput']): Promise<T> {
    return await this.model.create({ data });
  }

  async update(id: string, data: M['UpdateInput']): Promise<T> {
    return await this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return await this.model.delete({ where: { id } });
  }

  async upsert(
    where: M['WhereUniqueInput'],
    create: M['CreateInput'],
    update: M['UpdateInput'],
  ): Promise<T> {
    return await this.model.upsert({ where, create, update });
  }

  async findOrCreate(
    where: M['WhereInput'],
    create: M['CreateInput'],
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const delegate = (tx as unknown as Record<string, PrismaDelegate<T>>)[
        this.modelName
      ];
      const existing = await delegate.findFirst({ where });
      if (existing) return existing;
      return delegate.create({ data: create });
    });
  }
}

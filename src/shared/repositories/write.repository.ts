import { PrismaService } from '@/database/prisma.service';
import { IWriteRepository } from './interfaces';
import { ReadRepository } from './read.repository';
import { ModelName } from './types';

/**
 * Write Repository
 *
 * Single Responsibility: Single-entity mutation operations
 * Extends ReadRepository to also provide query capabilities
 */
export class WriteRepository<T>
  extends ReadRepository<T>
  implements IWriteRepository<T>
{
  constructor(prisma: PrismaService, modelName: ModelName) {
    super(prisma, modelName);
  }

  async create(data: unknown): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: unknown): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async upsert(where: unknown, create: unknown, update: unknown): Promise<T> {
    return this.model.upsert({ where, create, update });
  }

  async findOrCreate(where: unknown, create: unknown): Promise<T> {
    const existing = await this.findOne(where);
    return existing ?? this.create(create);
  }
}

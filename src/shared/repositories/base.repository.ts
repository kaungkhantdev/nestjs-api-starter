import { PrismaService } from '@/database/prisma.service';
import { ModelName, PrismaDelegate } from './types';

/**
 * Base Repository
 *
 * Single Responsibility: Only handles Prisma model access initialization
 * All repositories extend this to get access to the Prisma delegate
 */
export abstract class BaseRepository<T> {
  protected readonly model: PrismaDelegate<T>;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: ModelName,
  ) {
    this.model = (prisma as unknown as Record<string, PrismaDelegate<T>>)[
      modelName
    ];

    if (!this.model) {
      throw new Error(`Model "${modelName}" not found in Prisma client`);
    }
  }
}

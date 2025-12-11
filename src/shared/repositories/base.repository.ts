import { PrismaService } from '@/database/prisma.service';
import { ModelName, PrismaDelegate } from './types';

/**
 * Base Repository
 *
 * Single Responsibility: Only handles Prisma model access initialization
 * All repositories extend this to get access to the Prisma delegate
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class BaseRepository<T> {
  protected readonly model: PrismaDelegate;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: ModelName,
  ) {
    this.model = (prisma as unknown as Record<string, PrismaDelegate>)[
      modelName
    ];

    if (!this.model) {
      throw new Error(`Model "${modelName}" not found in Prisma client`);
    }
  }
}

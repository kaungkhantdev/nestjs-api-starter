import { Prisma } from 'generated/prisma/client';

// ============================================
// Prisma Types
// ============================================

export type PrismaDelegate<T = any> = {
  findUnique: (args: Record<string, any>) => Promise<T | null>;
  findFirst: (args?: Record<string, any>) => Promise<T | null>;
  findMany: (args?: Record<string, any>) => Promise<T[]>;
  create: (args: Record<string, any>) => Promise<T>;
  update: (args: Record<string, any>) => Promise<T>;
  delete: (args: Record<string, any>) => Promise<T>;
  count: (args?: Record<string, any>) => Promise<number>;
  upsert: (args: Record<string, any>) => Promise<T>;
  createMany: (args: Record<string, any>) => Promise<BatchResult>;
  updateMany: (args: Record<string, any>) => Promise<BatchResult>;
  deleteMany: (args: Record<string, any>) => Promise<BatchResult>;
};

export type ModelName = Prisma.ModelName;

// ============================================
// Query Types
// ============================================

export interface FindAllParams {
  skip?: number;
  take?: number;
  where?: unknown;
  orderBy?: unknown;
  include?: unknown;
  select?: unknown;
}

export interface BatchResult {
  count: number;
}

// ============================================
// Soft Delete Entity Type
// ============================================

export interface SoftDeletableEntity {
  deletedAt?: Date | null;
}

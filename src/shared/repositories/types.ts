import { Prisma } from 'generated/prisma/client';

// ============================================
// Prisma Types
// ============================================

export type PrismaDelegate = {
  findUnique: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
  upsert: (args: unknown) => Promise<unknown>;
  createMany: (args: unknown) => Promise<BatchResult>;
  updateMany: (args: unknown) => Promise<BatchResult>;
  deleteMany: (args: unknown) => Promise<BatchResult>;
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

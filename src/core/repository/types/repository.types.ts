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
// Repository Type Map
// ============================================

/**
 * Defines the input types for a repository.
 * Consumers can supply Prisma-generated types for full type safety.
 *
 * @example
 * ```typescript
 * type UserTypeMap = {
 *   WhereInput: Prisma.UserWhereInput;
 *   WhereUniqueInput: Prisma.UserWhereUniqueInput;
 *   CreateInput: Prisma.UserCreateInput;
 *   UpdateInput: Prisma.UserUpdateInput;
 *   OrderByInput: Prisma.UserOrderByWithRelationInput;
 *   Include: Prisma.UserInclude;
 *   Select: Prisma.UserSelect;
 * };
 * ```
 */
export interface RepositoryTypeMap {
  WhereInput: unknown;
  WhereUniqueInput: unknown;
  CreateInput: unknown;
  UpdateInput: unknown;
  OrderByInput: unknown;
  Include: unknown;
  Select: unknown;
}

/**
 * Default type map using unknown for all types.
 * Used when consumers don't need strict typing.
 */
export type DefaultTypeMap = RepositoryTypeMap;

// ============================================
// Query Types
// ============================================

export interface FindAllParams<M extends RepositoryTypeMap = DefaultTypeMap> {
  skip?: number;
  take?: number;
  where?: M['WhereInput'];
  orderBy?: M['OrderByInput'];
  include?: M['Include'];
  select?: M['Select'];
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

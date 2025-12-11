import { Prisma } from 'generated/prisma/client';
import { BatchResult, FindAllParams } from './types';

// ============================================
// Interface Segregation Principle
// Clients should not be forced to depend on interfaces they don't use
// ============================================

/**
 * Read-only operations interface
 * Use when you only need to query data (e.g., reporting, analytics)
 */
export interface IReadRepository<T> {
  findById(id: string, include?: unknown): Promise<T | null>;
  findOne(where: unknown, include?: unknown): Promise<T | null>;
  findAll(params?: FindAllParams): Promise<T[]>;
  count(where?: unknown): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Write operations interface
 * Use when you need to mutate single entities
 */
export interface IWriteRepository<T> {
  create(data: unknown): Promise<T>;
  update(id: string, data: unknown): Promise<T>;
  delete(id: string): Promise<T>;
  upsert(where: unknown, create: unknown, update: unknown): Promise<T>;
  findOrCreate(where: unknown, create: unknown): Promise<T>;
}

/**
 * Bulk operations interface
 * Use when you need to handle multiple entities at once
 */
export interface IBulkRepository {
  createMany(data: unknown[], skipDuplicates?: boolean): Promise<BatchResult>;
  updateMany(where: unknown, data: unknown): Promise<BatchResult>;
  deleteMany(where: unknown): Promise<BatchResult>;
}

/**
 * Soft delete operations interface
 * Use for entities that should be recoverable after deletion
 */
export interface ISoftDeletable<T> {
  softDelete(id: string): Promise<T>;
  restore(id: string): Promise<T>;
  findAllWithDeleted(params?: FindAllParams): Promise<T[]>;
}

/**
 * Transaction support interface
 * Use when you need to perform multiple operations atomically
 */
export interface ITransactional {
  transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}

/**
 * Combined repository interface for full CRUD + bulk operations
 */
export interface IRepository<T>
  extends
    IReadRepository<T>,
    IWriteRepository<T>,
    IBulkRepository,
    ITransactional {}

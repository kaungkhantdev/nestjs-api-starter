import { Prisma } from 'generated/prisma/client';
import {
  BatchResult,
  DefaultTypeMap,
  FindAllParams,
  RepositoryTypeMap,
} from '../types';

// ============================================
// Interface Segregation Principle
// Clients should not be forced to depend on interfaces they don't use
// ============================================

/**
 * Read-only operations interface
 * Use when you only need to query data (e.g., reporting, analytics)
 */
export interface IReadRepository<
  T,
  M extends RepositoryTypeMap = DefaultTypeMap,
> {
  findById(
    id: string,
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null>;
  findOne(
    where: M['WhereInput'],
    options?: { include?: M['Include']; select?: M['Select'] },
  ): Promise<T | null>;
  findAll(params?: FindAllParams<M>): Promise<T[]>;
  count(where?: M['WhereInput']): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Write operations interface
 * Use when you need to mutate single entities
 */
export interface IWriteRepository<
  T,
  M extends RepositoryTypeMap = DefaultTypeMap,
> {
  create(data: M['CreateInput']): Promise<T>;
  update(id: string, data: M['UpdateInput']): Promise<T>;
  delete(id: string): Promise<T>;
  upsert(
    where: M['WhereUniqueInput'],
    create: M['CreateInput'],
    update: M['UpdateInput'],
  ): Promise<T>;
  findOrCreate(where: M['WhereInput'], create: M['CreateInput']): Promise<T>;
}

/**
 * Bulk operations interface
 * Use when you need to handle multiple entities at once
 */
export interface IBulkRepository<M extends RepositoryTypeMap = DefaultTypeMap> {
  createMany(
    data: M['CreateInput'][],
    skipDuplicates?: boolean,
  ): Promise<BatchResult>;
  updateMany(
    where: M['WhereInput'],
    data: M['UpdateInput'],
  ): Promise<BatchResult>;
  deleteMany(where: M['WhereInput']): Promise<BatchResult>;
}

/**
 * Soft delete operations interface
 * Use for entities that should be recoverable after deletion
 */
export interface ISoftDeletable<
  T,
  M extends RepositoryTypeMap = DefaultTypeMap,
> {
  softDelete(id: string): Promise<T>;
  restore(id: string): Promise<T>;
  findAllWithDeleted(params?: FindAllParams<M>): Promise<T[]>;
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
export interface IRepository<T, M extends RepositoryTypeMap = DefaultTypeMap>
  extends
    IReadRepository<T, M>,
    IWriteRepository<T, M>,
    IBulkRepository<M>,
    ITransactional {}

# Repository Pattern Refactoring Guide

This guide explains the real-world approaches for implementing a type-safe, consistent repository pattern with Prisma in NestJS.

## Table of Contents

- [Overview](#overview)
- [Architecture Options](#architecture-options)
- [Proposed Implementation](#proposed-implementation)
- [Module Template](#module-template)
- [Comparison](#comparison)
- [File Structure](#file-structure)

## Overview

The main issue with generic repositories is losing Prisma's type safety when using `unknown` types. This guide provides a better approach using Prisma's inferred types.

## Architecture Options

### Option 1: Typed Repository with Prisma Inference (Recommended)

```
src/shared/repositories/
├── base/
│   ├── repository.interface.ts      # Generic interface with proper types
│   ├── repository.base.ts           # Base implementation
│   └── repository.factory.ts        # Factory for creating typed repos
├── decorators/
│   └── repository.decorator.ts      # @Repository() decorator
├── types/
│   └── index.ts                     # Shared types
└── index.ts
```

### Option 2: Module Template Pattern

Consistent structure for every module:

```
src/modules/{module-name}/
├── dto/
│   ├── create-{name}.dto.ts
│   ├── update-{name}.dto.ts
│   ├── {name}-response.dto.ts
│   └── {name}-query.dto.ts
├── repositories/
│   ├── {name}.repository.interface.ts
│   └── {name}.repository.ts
├── mappers/
│   └── {name}.mapper.ts             # Entity <-> DTO transformation
├── {name}.controller.ts
├── {name}.service.ts
└── {name}.module.ts
```

## Proposed Implementation

### 1. Improved Type-Safe Base Repository

```typescript
// src/shared/repositories/types/prisma.types.ts
import { PrismaClient, Prisma } from 'generated/prisma/client';

// Extract model names from Prisma
export type ModelName = Prisma.ModelName;

// Get the delegate type for a model
export type PrismaDelegate<M extends ModelName> = PrismaClient[Uncapitalize<M>];

// Get the entity type for a model
export type PrismaEntity<M extends ModelName> =
  Awaited<ReturnType<PrismaDelegate<M>['findFirst']>>;

// Get the WhereInput type for a model
export type WhereInput<M extends ModelName> =
  NonNullable<Parameters<PrismaDelegate<M>['findFirst']>[0]>['where'];

// Get the CreateInput type for a model
export type CreateInput<M extends ModelName> =
  NonNullable<Parameters<PrismaDelegate<M>['create']>[0]>['data'];

// Get the UpdateInput type for a model
export type UpdateInput<M extends ModelName> =
  NonNullable<Parameters<PrismaDelegate<M>['update']>[0]>['data'];

// Get the Include type for a model
export type IncludeInput<M extends ModelName> =
  NonNullable<Parameters<PrismaDelegate<M>['findFirst']>[0]>['include'];

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### 2. Type-Safe Repository Interface

```typescript
// src/shared/repositories/base/repository.interface.ts
import { Prisma } from 'generated/prisma/client';
import {
  ModelName,
  PrismaEntity,
  WhereInput,
  CreateInput,
  UpdateInput,
  IncludeInput,
  PaginationParams,
  PaginatedResult,
} from '../types/prisma.types';

export interface IBaseRepository<M extends ModelName> {
  // Read operations
  findById(id: string, include?: IncludeInput<M>): Promise<PrismaEntity<M> | null>;
  findOne(where: WhereInput<M>, include?: IncludeInput<M>): Promise<PrismaEntity<M> | null>;
  findMany(params?: {
    where?: WhereInput<M>;
    include?: IncludeInput<M>;
    orderBy?: any;
    skip?: number;
    take?: number;
  }): Promise<PrismaEntity<M>[]>;
  findManyPaginated(
    params: PaginationParams & { where?: WhereInput<M>; include?: IncludeInput<M> }
  ): Promise<PaginatedResult<PrismaEntity<M>>>;
  count(where?: WhereInput<M>): Promise<number>;
  exists(where: WhereInput<M>): Promise<boolean>;

  // Write operations
  create(data: CreateInput<M>): Promise<PrismaEntity<M>>;
  createMany(data: CreateInput<M>[]): Promise<{ count: number }>;
  update(id: string, data: UpdateInput<M>): Promise<PrismaEntity<M>>;
  updateMany(where: WhereInput<M>, data: UpdateInput<M>): Promise<{ count: number }>;
  delete(id: string): Promise<PrismaEntity<M>>;
  deleteMany(where: WhereInput<M>): Promise<{ count: number }>;
  upsert(
    where: WhereInput<M>,
    create: CreateInput<M>,
    update: UpdateInput<M>
  ): Promise<PrismaEntity<M>>;

  // Transaction
  transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}
```

### 3. Type-Safe Base Repository Implementation

```typescript
// src/shared/repositories/base/repository.base.ts
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from 'generated/prisma/client';
import {
  ModelName,
  PrismaEntity,
  PrismaDelegate,
  WhereInput,
  CreateInput,
  UpdateInput,
  IncludeInput,
  PaginationParams,
  PaginatedResult,
} from '../types/prisma.types';
import { IBaseRepository } from './repository.interface';

export abstract class BaseRepository<M extends ModelName>
  implements IBaseRepository<M>
{
  protected readonly model: PrismaDelegate<M>;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: M,
  ) {
    const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    this.model = (prisma as any)[modelKey];

    if (!this.model) {
      throw new Error(`Model "${modelName}" not found in Prisma client`);
    }
  }

  // ========================================
  // Read Operations
  // ========================================

  async findById(
    id: string,
    include?: IncludeInput<M>,
  ): Promise<PrismaEntity<M> | null> {
    return this.model.findUnique({ where: { id } as any, include } as any);
  }

  async findOne(
    where: WhereInput<M>,
    include?: IncludeInput<M>,
  ): Promise<PrismaEntity<M> | null> {
    return this.model.findFirst({ where, include } as any);
  }

  async findMany(params?: {
    where?: WhereInput<M>;
    include?: IncludeInput<M>;
    orderBy?: any;
    skip?: number;
    take?: number;
  }): Promise<PrismaEntity<M>[]> {
    return this.model.findMany(params as any);
  }

  async findManyPaginated(
    params: PaginationParams & { where?: WhereInput<M>; include?: IncludeInput<M> },
  ): Promise<PaginatedResult<PrismaEntity<M>>> {
    const { page, limit, where, include } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.findMany({ where, include, skip, take: limit } as any),
      this.model.count({ where } as any),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async count(where?: WhereInput<M>): Promise<number> {
    return this.model.count({ where } as any);
  }

  async exists(where: WhereInput<M>): Promise<boolean> {
    const count = await this.model.count({ where } as any);
    return count > 0;
  }

  // ========================================
  // Write Operations
  // ========================================

  async create(data: CreateInput<M>): Promise<PrismaEntity<M>> {
    return this.model.create({ data } as any);
  }

  async createMany(data: CreateInput<M>[]): Promise<{ count: number }> {
    return this.model.createMany({ data, skipDuplicates: true } as any);
  }

  async update(id: string, data: UpdateInput<M>): Promise<PrismaEntity<M>> {
    return this.model.update({ where: { id } as any, data } as any);
  }

  async updateMany(
    where: WhereInput<M>,
    data: UpdateInput<M>,
  ): Promise<{ count: number }> {
    return this.model.updateMany({ where, data } as any);
  }

  async delete(id: string): Promise<PrismaEntity<M>> {
    return this.model.delete({ where: { id } as any } as any);
  }

  async deleteMany(where: WhereInput<M>): Promise<{ count: number }> {
    return this.model.deleteMany({ where } as any);
  }

  async upsert(
    where: WhereInput<M>,
    create: CreateInput<M>,
    update: UpdateInput<M>,
  ): Promise<PrismaEntity<M>> {
    return this.model.upsert({ where, create, update } as any);
  }

  // ========================================
  // Transaction
  // ========================================

  async transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return this.prisma.$transaction(fn);
  }
}
```

### 4. Soft-Deletable Extension

```typescript
// src/shared/repositories/base/soft-deletable.repository.ts
import { PrismaService } from '@/database/prisma.service';
import { ModelName, PrismaEntity, WhereInput, PaginationParams, PaginatedResult } from '../types/prisma.types';
import { BaseRepository } from './repository.base';

export interface SoftDeletable {
  deletedAt: Date | null;
}

export abstract class SoftDeletableRepository<
  M extends ModelName,
> extends BaseRepository<M> {
  constructor(prisma: PrismaService, modelName: M) {
    super(prisma, modelName);
  }

  // Soft delete instead of hard delete
  async softDelete(id: string): Promise<PrismaEntity<M>> {
    return this.update(id, { deletedAt: new Date() } as any);
  }

  async restore(id: string): Promise<PrismaEntity<M>> {
    return this.update(id, { deletedAt: null } as any);
  }

  // Override to exclude soft-deleted by default
  override async findById(id: string, include?: any): Promise<PrismaEntity<M> | null> {
    return this.findOne({ id, deletedAt: null } as any, include);
  }

  override async findOne(where: WhereInput<M>, include?: any): Promise<PrismaEntity<M> | null> {
    return super.findOne({ ...where, deletedAt: null } as any, include);
  }

  override async findMany(params?: any): Promise<PrismaEntity<M>[]> {
    return super.findMany({
      ...params,
      where: { ...params?.where, deletedAt: null },
    });
  }

  override async findManyPaginated(
    params: PaginationParams & { where?: WhereInput<M> },
  ): Promise<PaginatedResult<PrismaEntity<M>>> {
    return super.findManyPaginated({
      ...params,
      where: { ...params.where, deletedAt: null } as any,
    });
  }

  // Methods to include deleted records
  async findByIdWithDeleted(id: string, include?: any): Promise<PrismaEntity<M> | null> {
    return super.findById(id, include);
  }

  async findManyWithDeleted(params?: any): Promise<PrismaEntity<M>[]> {
    return super.findMany(params);
  }
}
```

## Module Template

### 5. Users Repository Interface

```typescript
// src/modules/users/repositories/users.repository.interface.ts
import { Prisma, User } from 'generated/prisma/client';
import { IBaseRepository } from '@/shared/repositories';
import { PaginatedResult } from '@/shared/repositories/types/prisma.types';

export interface IUsersRepository extends IBaseRepository<'User'> {
  // Domain-specific methods only
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findActiveUsers(page: number, limit: number): Promise<PaginatedResult<User>>;
  findByRole(role: Prisma.UserRole): Promise<User[]>;
}

export const USERS_REPOSITORY = Symbol('IUsersRepository');
```

### 6. Users Repository Implementation

```typescript
// src/modules/users/repositories/users.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { SoftDeletableRepository, PaginatedResult } from '@/shared/repositories';
import { IUsersRepository } from './users.repository.interface';

@Injectable()
export class UsersRepository
  extends SoftDeletableRepository<'User'>
  implements IUsersRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, 'User');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ username });
  }

  async findActiveUsers(page: number, limit: number): Promise<PaginatedResult<User>> {
    return this.findManyPaginated({
      page,
      limit,
      where: { isActive: true },
    });
  }

  async findByRole(role: Prisma.UserRole): Promise<User[]> {
    return this.findMany({ where: { role } });
  }
}
```

### 7. Entity Mapper Pattern

```typescript
// src/modules/users/mappers/user.mapper.ts
import { User, Prisma } from 'generated/prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserDto } from '../dto/create-user.dto';

export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // password is excluded
    };
  }

  static toResponseList(users: User[]): UserResponseDto[] {
    return users.map(this.toResponse);
  }

  static toCreateInput(dto: CreateUserDto, hashedPassword: string): Prisma.UserCreateInput {
    return {
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? 'CUSTOMER',
    };
  }
}
```

### 8. Clean Service Layer

```typescript
// src/modules/users/users.service.ts
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { User } from 'generated/prisma/client';
import { PaginatedResult } from '@/shared/repositories/types/prisma.types';
import { IUsersRepository, USERS_REPOSITORY } from './repositories/users.repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: IUsersRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findByUsername(username);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await hash(dto.password, 10);

    try {
      return await this.repository.create(
        UserMapper.toCreateInput(dto, hashedPassword),
      );
    } catch (error) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findById(id); // Throws if not found

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await hash(dto.password, 10);
    }

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<User> {
    await this.findById(id); // Throws if not found
    return this.repository.softDelete(id);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<User>> {
    return this.repository.findManyPaginated({ page, limit });
  }

  async findActiveUsers(page: number, limit: number): Promise<PaginatedResult<User>> {
    return this.repository.findActiveUsers(page, limit);
  }
}
```

### 9. Clean Controller Layer

```typescript
// src/modules/users/users.controller.ts
import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { UserMapper } from './mappers/user.mapper';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    return UserMapper.toResponse(user);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.usersService.findAll(query.page, query.limit);
    return {
      ...result,
      items: UserMapper.toResponseList(result.items),
    };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return UserMapper.toResponse(user);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return UserMapper.toResponse(user);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto);
    return UserMapper.toResponse(user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.usersService.delete(id);
    return { message: 'User deleted successfully' };
  }
}
```

### 10. Shared Pagination DTO

```typescript
// src/common/dto/pagination-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;
}
```

## Comparison

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Type Safety** | `unknown` everywhere | Prisma-inferred types |
| **Pagination** | Manual in service | Built into repository |
| **Password Handling** | Manual in controller | Mapper handles it |
| **Error Handling** | Generic `Error` | Proper NestJS exceptions |
| **Naming** | Inconsistent | Consistent `findX` pattern |
| **Soft Delete** | Missing overrides | Complete coverage |
| **Validation** | Missing | DTO validation |

## File Structure

### Summary

```
src/
├── common/
│   └── dto/
│       └── pagination-query.dto.ts
├── shared/
│   └── repositories/
│       ├── base/
│       │   ├── repository.interface.ts
│       │   ├── repository.base.ts
│       │   └── soft-deletable.repository.ts
│       ├── types/
│       │   └── prisma.types.ts
│       └── index.ts
└── modules/
    └── users/
        ├── dto/
        │   ├── create-user.dto.ts
        │   ├── update-user.dto.ts
        │   └── user-response.dto.ts
        ├── repositories/
        │   ├── users.repository.interface.ts
        │   └── users.repository.ts
        ├── mappers/
        │   └── user.mapper.ts
        ├── users.controller.ts
        ├── users.service.ts
        └── users.module.ts
```

## Best Practices

### 1. Repository Layer
- Only add domain-specific methods (inherited CRUD is enough for basic operations)
- Use `findOne` with filters instead of duplicating `findById`
- Keep repositories thin - no business logic

### 2. Service Layer
- Handle business logic and validation
- Use proper NestJS exceptions (`NotFoundException`, `ConflictException`)
- Catch Prisma error codes for constraint violations

### 3. Controller Layer
- Use DTOs for input validation
- Use Mappers for output transformation
- Keep controllers thin - delegate to services

### 4. Mapper Layer
- Centralize entity-to-DTO transformations
- Exclude sensitive fields (passwords, tokens)
- Handle nested relations if needed

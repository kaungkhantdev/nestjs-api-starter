# Pagination Guide

This guide explains how pagination works in this NestJS API starter project, including the automatic transformation of paginated responses via the Transform Interceptor.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Response Format](#response-format)
- [Implementation](#implementation)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

The pagination system in this project provides a consistent, standardized way to handle paginated API responses. It uses:

- **Transform Interceptor**: Automatically detects and transforms paginated data
- **Type-safe interfaces**: Ensures consistency across all paginated responses
- **Rich metadata**: Includes pagination details like total pages, hasNext, hasPrev flags

## How It Works

### 1. Transform Interceptor Detection

The [TransformInterceptor](../src/common/interceptors/transform.interceptor.ts) automatically detects paginated responses by checking if the returned data contains all required pagination properties:

```typescript
private isPaginate(data: unknown): data is PaginationResult<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'page' in data &&
    'limit' in data &&
    'total' in data
  );
}
```

### 2. Automatic Response Transformation

When paginated data is detected, the interceptor:

1. Extracts `items`, `page`, `limit`, and `total` from the service response
2. Calculates additional metadata (`totalPages`, `hasNext`, `hasPrev`)
3. Wraps the response in a standardized format with full pagination metadata

## Response Format

### Service Layer Return Type

Services should return data matching the `PaginationResult<T>` interface:

```typescript
interface PaginationResult<T> {
  items: T[];      // Array of items for current page
  page: number;    // Current page number (1-indexed)
  limit: number;   // Items per page
  total: number;   // Total count of all items
}
```

### Final API Response

The Transform Interceptor automatically converts the service response into:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T[];  // The items array
  meta: {
    statusCode: number;
    timestamp: string;
    path: string;
    requestId: string;
    pagination: {
      page: number;        // Current page number
      limit: number;       // Items per page
      total: number;       // Total count of items
      totalPages: number;  // Calculated: Math.ceil(total / limit)
      hasNext: boolean;    // Calculated: page < totalPages
      hasPrev: boolean;    // Calculated: page > 1
    };
  };
}
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "email": "user1@example.com",
      "username": "user1"
    },
    {
      "id": "uuid-2",
      "email": "user2@example.com",
      "username": "user2"
    }
  ],
  "meta": {
    "statusCode": 200,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/users?page=2&limit=10",
    "requestId": "uuid-request-id",
    "pagination": {
      "page": 2,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

## Implementation

### Step 1: Controller Setup

Add query parameters for `page` and `limit` with default values:

```typescript
@Get()
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Page number (default: 1)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Number of items per page (default: 10)',
  example: 10,
})
async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
  return await this.usersService.getAll(page, limit);
}
```

**Reference**: See [users.controller.ts:97-98](../src/modules/users/users.controller.ts#L97-L98)

### Step 2: Service Implementation

Implement the service method to return `PaginationResult<T>`:

```typescript
async getAll(page: number, limit: number) {
  // Calculate skip for database query
  const skip = (page - 1) * limit;

  // Fetch items and total count in parallel
  const [users, total] = await Promise.all([
    this.usersRepository.findAll({ skip, take: limit }),
    this.usersRepository.count(),
  ]);

  // Return pagination result (will be auto-transformed by interceptor)
  return {
    items: users,
    page,
    limit,
    total,
  };
}
```

**Reference**: See [users.service.ts:43-56](../src/modules/users/users.service.ts#L43-L56)

### Step 3: Repository Methods

Ensure your repository supports pagination:

```typescript
interface IUsersRepository {
  findAll(options: { skip: number; take: number }): Promise<User[]>;
  count(): Promise<number>;
}
```

**Prisma Example**:

```typescript
async findAll({ skip, take }: { skip: number; take: number }): Promise<User[]> {
  return this.prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

async count(): Promise<number> {
  return this.prisma.user.count();
}
```

## Usage Examples

### Basic Pagination Request

```bash
# First page with default limit (10)
GET /users?page=1

# Second page with 20 items
GET /users?page=2&limit=20

# Third page with 50 items
GET /users?page=3&limit=50
```

## Best Practices

### 1. Validate Input Parameters

Always validate and sanitize page and limit parameters:

```typescript
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
) {
  // Ensure positive integers
  const validPage = Math.max(1, parseInt(String(page)));
  const validLimit = Math.min(100, Math.max(1, parseInt(String(limit))));

  return await this.service.getAll(validPage, validLimit);
}
```

### 2. Set Maximum Limit

Prevent excessive data fetching by capping the limit:

```typescript
const MAX_LIMIT = 100;
const validLimit = Math.min(MAX_LIMIT, limit);
```

### 3. Use Parallel Queries

Fetch items and count in parallel for better performance:

```typescript
// Good: Parallel execution
const [items, total] = await Promise.all([
  this.repository.findAll({ skip, take: limit }),
  this.repository.count(),
]);

// Bad: Sequential execution
const items = await this.repository.findAll({ skip, take: limit });
const total = await this.repository.count(); // Waits for items first
```

**Reference**: See [users.service.ts:45-48](../src/modules/users/users.service.ts#L45-L48)

### 4. Add Filters to Pagination

Combine pagination with filtering:

```typescript
async getAll(page: number, limit: number, filters?: { status?: string }) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.repository.findAll({ skip, take: limit, where: filters }),
    this.repository.count({ where: filters }),
  ]);

  return { items, page, limit, total };
}
```

### 5. Add Sorting Support

Include ordering in paginated queries:

```typescript
async getAll(
  page: number,
  limit: number,
  orderBy?: { field: string; direction: 'asc' | 'desc' },
) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.repository.findAll({
      skip,
      take: limit,
      orderBy: orderBy || { createdAt: 'desc' },
    }),
    this.repository.count(),
  ]);

  return { items, page, limit, total };
}
```

### 6. Document Your Endpoints

Use Swagger decorators to document pagination parameters:

```typescript
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Page number (default: 1)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Number of items per page (default: 10, max: 100)',
  example: 10,
})
```

**Reference**: See [users.controller.ts:73-86](../src/modules/users/users.controller.ts#L73-L86)

### 7. Handle Edge Cases

```typescript
// Empty results
if (total === 0) {
  return {
    items: [],
    page: 1,
    limit,
    total: 0,
  };
}

// Page number exceeds available pages
const totalPages = Math.ceil(total / limit);
if (page > totalPages) {
  // Option 1: Return last page
  const lastPage = Math.max(1, totalPages);
  return await this.getAll(lastPage, limit);

  // Option 2: Return empty with metadata
  return {
    items: [],
    page,
    limit,
    total,
  };
}
```

## Key Interfaces

All pagination-related interfaces are defined in [response.interface.ts](../src/common/interfaces/response.interface.ts):

- `PaginationResult<T>`: Service layer return type
- `PaginationMeta`: Pagination metadata in API response
- `ApiResponse<T>`: Final API response wrapper
- `ResponseMeta`: Response metadata including optional pagination

## Architecture Overview

```
┌─────────────────┐
│   Controller    │  Receives page & limit from query params
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │  Returns PaginationResult<T>
└────────┬────────┘  { items, page, limit, total }
         │
         ▼
┌─────────────────┐
│   Repository    │  Executes findAll({ skip, take })
└─────────────────┘  and count() in parallel
         │
         ▼
┌─────────────────┐
│  Transform      │  Detects pagination structure
│  Interceptor    │  Calculates totalPages, hasNext, hasPrev
└────────┬────────┘  Wraps in ApiResponse<T>
         │
         ▼
┌─────────────────┐
│   API Response  │  Returns standardized format
└─────────────────┘  with data and meta.pagination
```

## Summary

The pagination system provides:

- **Automatic transformation**: No manual response building needed
- **Consistent format**: All paginated endpoints return the same structure
- **Rich metadata**: Includes helpful flags like `hasNext` and `hasPrev`
- **Type safety**: TypeScript interfaces ensure correctness
- **Performance**: Parallel queries for items and count
- **Flexibility**: Works with any entity type through generics

To add pagination to a new endpoint:

1. Accept `page` and `limit` query parameters in your controller
2. Return `{ items, page, limit, total }` from your service
3. The Transform Interceptor handles the rest automatically!

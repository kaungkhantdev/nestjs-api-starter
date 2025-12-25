# Decorators Guide

This guide explains how to use the custom decorators available in this NestJS API starter project for authentication, authorization, and request handling.

## Table of Contents

- [Overview](#overview)
- [Available Decorators](#available-decorators)
  - [@Public](#public)
  - [@Roles](#roles)
  - [@CurrentUser](#currentuser)
- [Implementation Details](#implementation-details)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Creating Custom Decorators](#creating-custom-decorators)

## Overview

Decorators in this project provide a declarative way to:

- **Control authentication**: Mark routes as public or protected
- **Manage authorization**: Restrict routes to specific user roles
- **Access request data**: Extract authenticated user information

All custom decorators are located in [src/common/decorators/](../src/common/decorators/)

## Available Decorators

### @Public

The `@Public()` decorator marks a route as publicly accessible, bypassing JWT authentication.

**Location**: [src/common/decorators/public.decorator.ts](../src/common/decorators/public.decorator.ts)

#### How It Works

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

The decorator sets metadata that is read by [JwtAuthGuard](../src/common/guards/jwt-auth.guard.ts#L12-L16) to determine if authentication should be skipped.

#### Usage

```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  // No @Public() - requires authentication
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

#### When to Use

- Registration endpoints
- Login endpoints
- Public information endpoints
- Health check endpoints
- Documentation endpoints

**Reference**: See [auth.controller.ts:19](../src/modules/auth/auth.controller.ts#L19) and [auth.controller.ts:40](../src/modules/auth/auth.controller.ts#L40)

---

### @Roles

The `@Roles()` decorator restricts route access to users with specific roles.

**Location**: [src/common/decorators/roles.decorator.ts](../src/common/decorators/roles.decorator.ts)

#### How It Works

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

The decorator accepts one or more roles and sets metadata that is read by [RolesGuard](../src/common/guards/role.guard.ts#L10-L22) to verify user authorization.

#### Usage

```typescript
import { UserRole } from 'generated/prisma/enums';

@Controller('users')
export class UsersController {
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.getAll();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('profile')
  // No @Roles() - accessible to any authenticated user
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

#### Multiple Roles

When multiple roles are provided, the user must have at least one of the specified roles:

```typescript
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
// User with ADMIN OR MODERATOR role can access
```

#### Authorization Flow

1. Request arrives at protected route
2. JwtAuthGuard authenticates the user
3. User object is attached to request
4. RolesGuard checks if user's role matches required roles
5. Access is granted or denied

**Reference**: See [users.controller.ts:106](../src/modules/users/users.controller.ts#L106)

---

### @CurrentUser

The `@CurrentUser()` decorator extracts the authenticated user from the request.

**Location**: [src/common/decorators/current-user.decorator.ts](../src/common/decorators/current-user.decorator.ts)

#### How It Works

```typescript
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

This is a parameter decorator that:
- Extracts the user object from the request
- Optionally returns a specific property if a key is provided
- Works only on authenticated routes (after JwtAuthGuard)

#### Usage

**Get entire user object:**

```typescript
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  console.log(user.id, user.email, user.role);
  return user;
}
```

**Get specific user property:**

```typescript
@Get('my-posts')
async getMyPosts(@CurrentUser('id') userId: string) {
  return this.postsService.findByUserId(userId);
}

@Delete(':id')
async deletePost(
  @Param('id') postId: string,
  @CurrentUser('id') userId: string,
) {
  return this.postsService.delete(postId, userId);
}
```

#### Type Safety

For better type safety, define the user type:

```typescript
import { User } from 'generated/prisma';

@Get('profile')
async getProfile(@CurrentUser() user: User) {
  // TypeScript knows the user shape
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}
```

**Reference**: See [users.controller.ts:58](../src/modules/users/users.controller.ts#L58)

---

## Implementation Details

### Guard Configuration

The decorators work in conjunction with guards configured in your application:

```typescript
// app.module.ts or main.ts
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard, // Global authentication
},
{
  provide: APP_GUARD,
  useClass: RolesGuard, // Global authorization
}
```

### Execution Order

1. **JwtAuthGuard**: Checks if route is public, authenticates JWT
2. **RolesGuard**: Checks if user has required roles
3. **Route Handler**: Executes with authenticated user

### User Object

After authentication, the user object is attached to the request:

```typescript
interface RequestUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  // ... other user properties
}
```

---

## Usage Examples

### Example 1: Public Registration

```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

### Example 2: Role-Based Access

```typescript
@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return this.usersService.getAll();
  }

  @Post('users/:id/ban')
  @Roles(UserRole.ADMIN)
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id);
  }
}
```

### Example 3: User-Specific Data

```typescript
@Controller('posts')
export class PostsController {
  @Get('my-posts')
  async getMyPosts(@CurrentUser('id') userId: string) {
    return this.postsService.findByUserId(userId);
  }

  @Post()
  async createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.postsService.create({ ...dto, authorId: userId });
  }

  @Patch(':id')
  async updatePost(
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    // Verify ownership
    const post = await this.postsService.findOne(postId);
    if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Cannot update post');
    }
    return this.postsService.update(postId, dto);
  }
}
```

### Example 4: Combining Decorators

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.usersService.getAll(page, limit);
  }

  @Get('me')
  // Authenticated users only, no specific role required
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

### Example 5: Public with Optional User

Sometimes you want a route to be public but still access user info if available:

```typescript
@Controller('posts')
export class PostsController {
  @Get()
  @Public()
  async findAll(@CurrentUser() user?: User) {
    // Public route, but can customize based on user
    if (user) {
      return this.postsService.findAllWithUserPreferences(user.id);
    }
    return this.postsService.findAll();
  }
}
```

Note: This requires modifying JwtAuthGuard to not throw on missing token for public routes.

---

## Best Practices

### 1. Default to Secure

Make authentication the default by using global guards:

```typescript
// Good: Secure by default
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Must explicitly mark public routes
@Get('health')
@Public()
async health() {
  return { status: 'ok' };
}
```

### 2. Use Type Safety

Always type your user parameter:

```typescript
// Good: Type-safe
async getProfile(@CurrentUser() user: User) {
  return user.email; // TypeScript knows user shape
}

// Bad: No type safety
async getProfile(@CurrentUser() user: any) {
  return user.email; // No IDE support
}
```

### 3. Extract Only What You Need

Use property extraction for cleaner code:

```typescript
// Good: Only need ID
async getMyPosts(@CurrentUser('id') userId: string) {
  return this.postsService.findByUserId(userId);
}

// Less ideal: Extract entire user just for ID
async getMyPosts(@CurrentUser() user: User) {
  return this.postsService.findByUserId(user.id);
}
```

### 4. Document Role Requirements

Use Swagger decorators to document authorization:

```typescript
@Delete(':id')
@Roles(UserRole.ADMIN)
@ApiOperation({ summary: 'Delete user (Admin only)' })
@ApiBearerAuth()
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

### 5. Validate User Access

Always verify user has access to the resource:

```typescript
@Patch('posts/:id')
async updatePost(
  @Param('id') id: string,
  @Body() dto: UpdatePostDto,
  @CurrentUser() user: User,
) {
  const post = await this.postsService.findOne(id);

  // Verify ownership or admin role
  if (post.authorId !== user.id && user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Cannot update this post');
  }

  return this.postsService.update(id, dto);
}
```

### 6. Use Roles Appropriately

Don't overuse roles when ownership checks are better:

```typescript
// Bad: Using roles for user-specific data
@Get('profile')
@Roles(UserRole.USER)
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Good: Just require authentication
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

### 7. Combine with DTOs

Use decorators with validation DTOs:

```typescript
@Post()
async create(
  @Body() createDto: CreatePostDto,
  @CurrentUser('id') authorId: string,
) {
  return this.postsService.create({
    ...createDto,
    authorId, // Automatically set from token
  });
}
```

---

## Creating Custom Decorators

### Metadata-based Decorator

For simple metadata:

```typescript
import { SetMetadata } from '@nestjs/common';

export const SKIP_LOGGING_KEY = 'skipLogging';
export const SkipLogging = () => SetMetadata(SKIP_LOGGING_KEY, true);

// Usage
@Get('health')
@SkipLogging()
async health() {
  return { status: 'ok' };
}
```

### Parameter Decorator

For extracting request data:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip;
  },
);

// Usage
@Post('login')
@Public()
async login(@Body() dto: LoginDto, @IpAddress() ip: string) {
  return this.authService.login(dto, ip);
}
```

### Composite Decorator

Combine multiple decorators:

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

export function AdminOnly(summary: string) {
  return applyDecorators(
    Roles(UserRole.ADMIN),
    ApiOperation({ summary: `${summary} (Admin only)` }),
    ApiBearerAuth(),
    ApiResponse({ status: 403, description: 'Forbidden - Admin role required' }),
  );
}

// Usage
@Get('users')
@AdminOnly('Get all users')
async findAll() {
  return this.usersService.getAll();
}
```

### Request Header Decorator

```typescript
export const ApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-api-key'];
  },
);

// Usage
@Post('webhook')
@Public()
async webhook(@ApiKey() apiKey: string, @Body() payload: any) {
  if (apiKey !== process.env.WEBHOOK_API_KEY) {
    throw new UnauthorizedException('Invalid API key');
  }
  return this.webhookService.handle(payload);
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Incoming Request                      │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  JwtAuthGuard    │
                  │  (Global)        │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ Check @Public    │
                  │ metadata         │
                  └────────┬─────────┘
                           │
            ┌──────────────┴───────────────┐
            │                              │
         Yes│@Public                   No │Protected
            │                              │
            ▼                              ▼
    ┌───────────────┐           ┌──────────────────┐
    │ Skip Auth     │           │ Validate JWT     │
    └───────┬───────┘           └────────┬─────────┘
            │                            │
            │                   ┌────────▼──────────┐
            │                   │ Attach user to    │
            │                   │ request object    │
            │                   └────────┬──────────┘
            │                            │
            └────────────┬───────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  RolesGuard      │
               │  (Global)        │
               └────────┬─────────┘
                        │
               ┌────────▼─────────┐
               │ Check @Roles     │
               │ metadata         │
               └────────┬─────────┘
                        │
         ┌──────────────┴───────────────┐
         │                              │
      None│No roles          Required  │Has roles
         │                              │
         ▼                              ▼
  ┌─────────────┐           ┌──────────────────┐
  │ Allow       │           │ Check user.role  │
  │ Access      │           │ matches required │
  └──────┬──────┘           └────────┬─────────┘
         │                           │
         │                  ┌────────┴──────────┐
         │                  │                   │
         │               Match              No Match
         │                  │                   │
         │                  ▼                   ▼
         │          ┌──────────────┐   ┌───────────────┐
         │          │ Allow Access │   │ 403 Forbidden │
         │          └──────┬───────┘   └───────────────┘
         │                 │
         └─────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │  Route Handler   │
         │  @CurrentUser    │
         │  extracts user   │
         └──────────────────┘
```

---

## Summary

The decorator system provides:

- **@Public**: Mark routes as publicly accessible
- **@Roles**: Restrict access to specific user roles
- **@CurrentUser**: Extract authenticated user from request

Key principles:

1. Secure by default with global guards
2. Explicit public route marking with @Public
3. Role-based authorization with @Roles
4. Easy user access with @CurrentUser
5. Type-safe and declarative
6. Works seamlessly with NestJS ecosystem

To protect a new route:

1. Routes are protected by default
2. Use @Roles() for role-specific access
3. Use @CurrentUser() to access authenticated user
4. Only use @Public() for truly public endpoints

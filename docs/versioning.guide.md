# API Versioning Guide

This guide explains how API versioning is implemented in this NestJS application.

## Configuration

API versioning is configured in [main.ts](../src/main.ts) using URI-based versioning:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'api/v',
});
```

## URL Structure

With this configuration, all API endpoints follow this pattern:
```
http://localhost:3000/api/v{version}/{endpoint}
```

### Examples:
- `http://localhost:3000/api/v1/auth/login`
- `http://localhost:3000/api/v1/auth/register`
- `http://localhost:3000/api/v1/users`
- `http://localhost:3000/api/v1/users/me`

## Implementing Versioning in Controllers

### Controller-Level Versioning

Apply versioning to an entire controller:

```typescript
@Controller({ path: 'users', version: '1' })
export class UsersController {
  // All routes in this controller will be under /api/v1/users
}
```

### Multiple Versions

Support multiple versions of the same controller:

```typescript
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  // Routes under /api/v1/users
}

@Controller({ path: 'users', version: '2' })
export class UsersV2Controller {
  // Routes under /api/v2/users
}
```

### Route-Level Versioning

Apply versioning to specific routes within a controller:

```typescript
@Controller('users')
export class UsersController {

  @Get()
  @Version('1')
  findAllV1() {
    // Available at /api/v1/users
  }

  @Get()
  @Version('2')
  findAllV2() {
    // Available at /api/v2/users
  }
}
```

### Version Neutrality

Create routes that work across all versions:

```typescript
@Get('health')
@Version(VERSION_NEUTRAL)
healthCheck() {
  // Available at both /api/v1/users/health and /api/v2/users/health
}
```

## Current Implementation

The following controllers are currently versioned:

### Authentication (v1)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Users (v1)
- `GET /api/v1/users` - Get all users (Admin only)
- `GET /api/v1/users/me` - Get current user profile
- `GET /api/v1/users/:id` - Get user by ID (Admin only)

## Best Practices

1. **Default Version**: Always specify a default version in the configuration
2. **Deprecation Strategy**: When introducing a new version, maintain the old version for a transition period
3. **Documentation**: Keep Swagger documentation updated for each version
4. **Breaking Changes Only**: Only create new versions for breaking changes
5. **Version Naming**: Use simple numeric versions (1, 2, 3) rather than semantic versioning

## Migration Strategy

When creating a new API version:

1. Create a new controller with the updated version number
2. Copy the existing implementation
3. Make necessary breaking changes
4. Update DTOs if needed
5. Document the changes and migration path
6. Set a deprecation timeline for the old version

## Testing Different Versions

```bash
# Test v1 endpoints
curl http://localhost:3000/api/v1/users/me

# Test v2 endpoints (when available)
curl http://localhost:3000/api/v2/users/me
```

## Swagger Documentation

The Swagger UI is available at `http://localhost:3000/api` and includes all versioned endpoints.

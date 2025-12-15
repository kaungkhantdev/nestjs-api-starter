# NestJs API Starter

A robust and scalable REST API built with NestJS, Prisma, PostgreSQL, and JWT authentication. This project features a clean architecture with repository pattern, role-based access control, and comprehensive testing.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Local and JWT strategies (Passport)
  - Role-based access control (CUSTOMER, ADMIN, VENDOR)
  - Password hashing with bcrypt

- **User Management**
  - User registration and login
  - User profile management
  - Soft delete support
  - Role-based permissions

- **Architecture**
  - Clean architecture with repository pattern
  - Generic repository with CRUD operations
  - Soft-deletable repository
  - Custom decorators and guards
  - Global exception filters
  - Response transformation interceptors

- **API Documentation**
  - Swagger/OpenAPI documentation
  - Interactive API explorer

- **Testing**
  - Unit tests for services, controllers, and utilities
  - E2E tests
  - Integration tests
  - Test coverage reporting

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM 7
- **Authentication**: Passport.js with JWT
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest & Supertest
- **Language**: TypeScript 5

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nestjs-api-starter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nestjs_starter?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRATION="7d"

# App
PORT=3000
NODE_ENV="development"
```

4. Run Prisma migrations:
```bash
npm run prisma:migrate:dev
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

## Running the Application

### Development mode
```bash
npm run start:dev
```

### Production mode
```bash
npm run build
npm run start:prod
```

### Debug mode
```bash
npm run start:debug
```

The API will be available at:
- Application: `http://localhost:3000`
- Swagger Documentation: `http://localhost:3000/api`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Soft delete user

For detailed API documentation, visit the Swagger UI at `/api` when the application is running.

## Testing

### Run all tests
```bash
npm run test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run e2e tests
```bash
npm run test:e2e
```

### Generate test coverage
```bash
npm run test:cov
```

## Architecture Patterns

### Repository Pattern
The project uses a generic repository pattern for database operations:

- **BaseRepository**: Base CRUD operations
- **ReadRepository**: Read-only operations
- **WriteRepository**: Create, update, delete operations
- **SoftDeletableRepository**: Soft delete support

### Authentication Flow
1. User registers or logs in
2. Server validates credentials and generates JWT token
3. Client includes JWT token in Authorization header
4. JwtAuthGuard validates token on protected routes
5. RoleGuard checks user permissions

### Custom Decorators
- `@Public()` - Mark routes as public (bypass JWT guard)
- `@Roles(UserRole.ADMIN)` - Protect routes by role
- `@CurrentUser()` - Get current user from request

## Development

### Code Formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

### Database Commands
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_EXPIRATION` | JWT token expiration time | 7d |
| `PORT` | Application port | 3000 |
| `NODE_ENV` | Environment mode | development |

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)
- Input validation with class-validator
- SQL injection protection via Prisma
- Global exception handling
- Request payload whitelisting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is [UNLICENSED](LICENSE).

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Passport.js Documentation](http://www.passportjs.org)
- [JWT Documentation](https://jwt.io)

## Support

For questions and support, please open an issue in the GitHub repository.

# NestJS API Starter

A scalable REST API starter built with NestJS, Prisma, PostgreSQL, and JWT authentication. Features clean architecture with repository pattern, role-based access control, file storage via AWS S3, and comprehensive testing.

## Features

- **Authentication & Authorization** — JWT-based auth, Passport strategies, RBAC (CUSTOMER, ADMIN, VENDOR), bcrypt password hashing
- **User Management** — Registration, login, profile management, soft delete, role-based permissions
- **File Storage** — AWS S3 integration with presigned URLs
- **Clean Architecture** — Repository pattern with generic CRUD, soft-delete support, custom decorators, guards, exception filters, and response interceptors
- **API Documentation** — Swagger/OpenAPI with interactive explorer
- **Testing** — Unit, integration, and E2E tests with coverage reporting

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 + Prisma ORM 7 |
| Auth | Passport.js + JWT |
| Storage | AWS S3 |
| Validation | class-validator & class-transformer |
| Documentation | Swagger/OpenAPI |
| Testing | Jest & Supertest |

## Prerequisites

- Node.js v18+
- PostgreSQL v14+
- npm

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/kaungkhantdev/nestjs-api-starter.git
cd nestjs-api-starter

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nestjs_starter?schema=public"
JWT_SECRET="your-secret"
JWT_EXPIRATION="7d"
PORT=3000
NODE_ENV="development"
```

```bash
# 4. Run migrations
npm run prisma:migrate:deploy

# 5. Generate Prisma client
npm run prisma:generate

# 6. Start in development mode
npm run start:dev
```

## Running with Docker

Build and run with Docker directly:
```bash
# Build the image
docker build --build-arg DATABASE_URL="postgresql://placeholder" -t nestjs-api-starter .

# Run the container
docker run -p 3000:3000 --env-file .env nestjs-api-starter
```

Or use Docker Compose (starts both the API and PostgreSQL):
```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api`

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Start production build |
| `npm run build` | Build the project |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Generate coverage report |
| `npm run lint` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run prisma:migrate:dev` | Create a new migration |
| `npm run prisma:studio` | Open Prisma Studio |

## API Endpoints

### Authentication
- `POST /auth/register` — Register a new user
- `POST /auth/login` — Login and receive JWT token

### Users
- `GET /users` — List all users (Admin only)
- `GET /users/:id` — Get user by ID
- `PUT /users/:id` — Update user
- `DELETE /users/:id` — Soft delete user

Full documentation available at `/api` when the server is running.


## Architecture

### Repository Pattern
- `BaseRepository` — Generic CRUD operations
- `ReadRepository` — Read-only operations
- `WriteRepository` — Create, update, delete
- `SoftDeletableRepository` — Soft delete support

### Auth Flow
1. User registers or logs in
2. Server validates credentials and issues a JWT
3. Client sends JWT in the `Authorization` header
4. `JwtAuthGuard` validates the token on protected routes
5. `RoleGuard` enforces role-based permissions

### Custom Decorators
- `@Public()` — Bypass JWT guard
- `@Roles(UserRole.ADMIN)` — Restrict by role
- `@CurrentUser()` — Inject current user from request

## Security

- bcrypt password hashing
- JWT authentication
- Role-based access control (RBAC)
- Input validation and payload whitelisting
- SQL injection protection via Prisma
- Global exception handling
- Rate limiting via `@nestjs/throttler`

## License

[MIT](LICENSE)

## Author

**Kaung Khant Zaw**
[github.com/kaungkhantdev](https://github.com/kaungkhantdev)

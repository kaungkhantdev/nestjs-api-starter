# Project Structure

## Directory Philosophy

| Directory    | Purpose                                               | Example                                  |
| ------------ | ----------------------------------------------------- | ---------------------------------------- |
| `config/`    | Environment & app configuration                       | App, Database, JWT, Storage configs      |
| `database/`  | Database setup (Prisma)                               | `PrismaService`, `DatabaseModule`        |
| `common/`    | Reusable utilities, base classes & cross-cutting concerns | Decorators, Guards, Filters, Repository pattern |
| `modules/`   | Feature modules (domain logic)                        | Auth, Users                              |

## Full Structure

```
src/
├── config/                         # Environment & app configuration
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── storage.config.ts
│   └── index.ts
│
├── database/                       # Prisma setup
│   ├── database.module.ts
│   └── prisma.service.ts
│
├── common/                         # Cross-cutting concerns & reusable base classes
│   ├── decorators/                 # @Public, @Roles, @CurrentUser
│   ├── filters/                    # HttpExceptionFilter
│   ├── guards/                     # JwtAuthGuard, RoleGuard
│   ├── interceptors/               # TransformInterceptor
│   ├── interfaces/                 # Response interface
│   └── repository/                 # Generic repository pattern
│       ├── interfaces/
│       │   ├── repository.interfaces.ts
│       │   └── index.ts
│       ├── types/
│       │   ├── repository.types.ts
│       │   └── index.ts
│       ├── base.repository.ts      # Prisma model access
│       ├── read.repository.ts      # Query operations
│       ├── write.repository.ts     # Mutation operations
│       ├── generic.repository.ts   # Full CRUD + bulk + transactions
│       ├── soft-deletable.repository.ts
│       └── index.ts
│
├── modules/                        # Feature modules
│   ├── auth/
│   │   ├── dto/
│   │   ├── interfaces/
│   │   ├── strategies/             # JWT, Local passport strategies
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   └── users/
│       ├── dto/
│       ├── repositories/           # Domain-specific repository
│       ├── users.module.ts
│       ├── users.controller.ts
│       └── users.service.ts
│
├── app.module.ts                   # Root module
├── app.controller.ts
├── app.service.ts
└── main.ts                         # Entry point
```

## Must-Know

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

```ts
import { GenericRepository } from '@/common/repository';
import { PrismaService } from '@/database/prisma.service';
import configuration from '@/config';
```

### Repository Pattern (Inheritance Chain)

```
BaseRepository          → Prisma model access
  └── ReadRepository    → findById, findOne, findAll, count, exists
       └── WriteRepository   → create, update, delete, upsert, findOrCreate
            └── GenericRepository   → bulk ops + transactions
                 └── SoftDeletableRepository → softDelete, restore
```

To create a new repository, extend `GenericRepository` (or `SoftDeletableRepository` if needed):

```ts
@Injectable()
export class UsersRepository extends GenericRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma, Prisma.ModelName.User);
  }

  // Add domain-specific methods only
  async findByEmail(email: string): Promise<User | null> {
    return this.model.findUnique({ where: { email } });
  }
}
```

### Adding a New Module

1. Create folder under `src/modules/<name>/`
2. Follow the pattern: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `repositories/`
3. Import the module in `app.module.ts`

### Barrel Exports

`config/` and `common/repository/` have `index.ts` barrel files. Always import from the barrel:

```ts
// Good
import { GenericRepository, IRepository } from '@/common/repository';

// Avoid
import { GenericRepository } from '@/common/repository/generic.repository';
```

### Database

- ORM: **Prisma**
- Schema: `prisma/schema.prisma`
- Generated client: `generated/prisma/client`
- Service: `@/database/prisma.service`

### Auth

- Strategy: **JWT** + **Local** (Passport)
- Guards: `JwtAuthGuard`, `RoleGuard`
- Decorators: `@Public()` (skip auth), `@Roles()`, `@CurrentUser()`

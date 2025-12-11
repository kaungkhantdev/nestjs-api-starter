
## Project Structure

```
src/
├── common/                 # Common utilities
│   ├── decorators/        # Custom decorators (@Public, @Roles, @CurrentUser)
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards (JWT, Roles)
│   ├── interceptors/      # Response transformers
│   └── interfaces/        # Common interfaces
├── config/                # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   └── jwt.config.ts
├── database/              # Database module
│   ├── database.module.ts
│   └── prisma.service.ts
├── modules/
│   ├── auth/             # Authentication module
│   │   ├── strategies/   # Passport strategies
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   └── users/            # Users module
│       ├── repositories/ # User repository
│       ├── users.controller.ts
│       └── users.service.ts
├── shared/               # Shared resources
│   └── repositories/     # Generic repository pattern
│       ├── base.repository.ts
│       ├── read.repository.ts
│       ├── write.repository.ts
│       └── soft-deletable.repository.ts
├── app.module.ts
└── main.ts              # Application entry point
```
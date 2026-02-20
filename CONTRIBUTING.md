# Contributing to NestJS API Starter

Thank you for your interest in contributing to NestJS API Starter! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)
- Any relevant logs or screenshots

### Suggesting Features

Feature requests are welcome! Please create an issue with:

- A clear description of the feature
- The problem it solves
- Any alternatives you've considered
- Examples of how it would work

### Pull Requests

1. **Fork the repository** and create your branch from `develop`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Add tests** for any new functionality
5. **Run the test suite**: `npm run test` and `npm run test:e2e`
6. **Run linting**: `npm run lint`
7. **Format your code**: `npm run format`
8. **Commit your changes** with clear, descriptive commit messages
9. **Push to your fork** and submit a pull request to the `develop` branch

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nestjs-api-starter.git
cd nestjs-api-starter

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run migrations
npm run prisma:migrate:dev

# Start development server
npm run start:dev
```

## Coding Standards

- Follow the existing code style
- Use TypeScript strict mode
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use dependency injection where appropriate

## Testing

- Write unit tests for services and utilities
- Write integration tests for database operations
- Write E2E tests for API endpoints
- Maintain test coverage above 80%

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

- `feat(auth): add password reset functionality`
- `fix(users): resolve soft delete cascade issue`
- `docs(readme): update installation instructions`

## Code Review Process

1. A maintainer will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Private Disclosure

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

- Email: [Add your security contact email]
- GitHub Security Advisories: Use the "Security" tab in this repository

### What to Include

Please provide:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity

## Security Best Practices

When using this starter:

1. **Environment Variables**: Never commit `.env` files or secrets
2. **JWT Secret**: Use a strong, random secret in production
3. **Database**: Use strong passwords and restrict access
4. **AWS Credentials**: Use IAM roles with minimal permissions
5. **Dependencies**: Regularly update dependencies (`npm audit`)
6. **Rate Limiting**: Configure throttler for your use case
7. **CORS**: Configure appropriate CORS settings for production
8. **HTTPS**: Always use HTTPS in production

## Security Features

This starter includes:

- Password hashing with bcrypt
- JWT authentication
- Role-based access control (RBAC)
- Input validation via class-validator
- SQL injection protection via Prisma
- Rate limiting via @nestjs/throttler
- Global exception filters

## Disclosure Policy

When we receive a security report:

1. We'll confirm receipt within 48 hours
2. We'll investigate and validate the issue
3. We'll develop and test a fix
4. We'll release a security patch
5. We'll publicly disclose the vulnerability after the fix is released

Thank you for helping keep NestJS API Starter secure!

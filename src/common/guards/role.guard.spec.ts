import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './role.guard';
import { UserRole } from 'generated/prisma/enums';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (userRole: UserRole): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123', role: userRole },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext(UserRole.CUSTOMER);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext(UserRole.ADMIN);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext(UserRole.CUSTOMER);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true when user has one of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.VENDOR]);
      const context = createMockContext(UserRole.VENDOR);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user has none of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.VENDOR]);
      const context = createMockContext(UserRole.CUSTOMER);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle empty roles array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockContext(UserRole.CUSTOMER);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});

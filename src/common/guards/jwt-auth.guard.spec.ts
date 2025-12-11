import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (): ExecutionContext => {
    const handler = jest.fn();
    const classRef = jest.fn();

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123' },
        }),
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const context = createMockContext();

      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });

    it('should call super.canActivate for non-public routes', () => {
      const context = createMockContext();

      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(false);

      // Mock the parent class method
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(spy).toHaveBeenCalled();
      expect(superCanActivate).toHaveBeenCalledWith(context);

      superCanActivate.mockRestore();
    });

    it('should call super.canActivate when isPublic is undefined', () => {
      const context = createMockContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalled();

      superCanActivate.mockRestore();
    });
  });
});

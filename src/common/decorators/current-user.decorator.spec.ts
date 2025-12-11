import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'test@example.com',
    role: 'CUSTOMER',
  };

  const getParamDecoratorFactory = (
    decorator: (data?: unknown) => ParameterDecorator,
  ) => {
    class TestController {
      test(@decorator() user: unknown) {
        return user;
      }
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'test',
    );
    return args[Object.keys(args)[0]].factory;
  };

  const createMockContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  describe('without data parameter', () => {
    it('should return the entire user object', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = createMockContext(mockUser);

      const result = factory(undefined, context);
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when user is not set in request', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;

      const result = factory(undefined, context);
      expect(result).toBeUndefined();
    });
  });

  describe('with data parameter', () => {
    it('should return specific property when data is provided', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = createMockContext(mockUser);
      const result = factory('id', context);
      expect(result).toBe(mockUser.id);
    });

    it('should return email when specified', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = createMockContext(mockUser);
      const result = factory('email', context);
      expect(result).toBe(mockUser.email);
    });

    it('should return undefined for non-existent property', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = createMockContext(mockUser);

      const result = factory('nonExistent', context);

      expect(result).toBeUndefined();
    });

    it('should return undefined when user is not set in request', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}), // No user property
        }),
      } as unknown as ExecutionContext;

      const result = factory('id', context);

      expect(result).toBeUndefined();
    });
  });
});

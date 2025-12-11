import { UserRole } from 'generated/prisma/enums';
import { Roles, ROLES_KEY } from './roles.decorator';

describe('Roles Decorator', () => {
  it('should set single role metadata', () => {
    @Roles(UserRole.ADMIN)
    class TestClass {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass);
    expect(metadata).toEqual([UserRole.ADMIN]);
  });

  it('should set multiple roles metadata', () => {
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    class TestClass {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass);
    expect(metadata).toEqual([UserRole.ADMIN, UserRole.VENDOR]);
  });

  it('should work on methods', () => {
    class TestController {
      @Roles(UserRole.ADMIN)
      adminMethod(this: void) {}

      @Roles(UserRole.CUSTOMER, UserRole.VENDOR)
      multiRoleMethod(this: void) {}

      publicMethod(this: void) {}
    }

    const adminMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.adminMethod,
    );
    const multiRoleMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.multiRoleMethod,
    );
    const publicMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.publicMethod,
    );

    expect(adminMetadata).toEqual([UserRole.ADMIN]);
    expect(multiRoleMetadata).toEqual([UserRole.CUSTOMER, UserRole.VENDOR]);
    expect(publicMetadata).toBeUndefined();
  });

  it('should export ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('should handle empty roles array', () => {
    @Roles()
    class TestClass {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass);
    expect(metadata).toEqual([]);
  });
});

import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public Decorator', () => {
  it('should set IS_PUBLIC_KEY metadata to true', () => {
    @Public()
    class TestClass {}

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestClass);
    expect(metadata).toBe(true);
  });

  it('should work on methods', () => {
    class TestController {
      @Public()
      publicMethod(this: void) {}

      privateMethod(this: void) {}
    }

    const publicMetadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.publicMethod,
    );
    const privateMetadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.privateMethod,
    );

    expect(publicMetadata).toBe(true);
    expect(privateMetadata).toBeUndefined();
  });

  it('should export IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});

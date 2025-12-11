import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test-path',
          headers: { 'x-request-id': 'test-request-id' },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCallHandler = <T>(data: T): CallHandler<T> => ({
    handle: () => of(data),
  });

  describe('intercept', () => {
    it('should wrap response in ApiResponse format', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler = createCallHandler(testData);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response).toEqual(
          expect.objectContaining({
            success: true,
            data: testData,
            meta: expect.objectContaining({
              statusCode: 200,
              path: '/test-path',
              requestId: 'test-request-id',
            }),
          }),
        );
        done();
      });
    });

    it('should include timestamp in meta', (done) => {
      mockCallHandler = createCallHandler({ test: 'data' });

      const beforeTime = new Date().toISOString();
      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        const timestamp = response.meta.timestamp;
        const afterTime = new Date().toISOString();

        expect(timestamp >= beforeTime).toBe(true);
        expect(timestamp <= afterTime).toBe(true);
        done();
      });
    });

    it('should handle paginated response', (done) => {
      const paginatedData = {
        items: [{ id: 1 }, { id: 2 }],
        page: 1,
        limit: 10,
        total: 25,
      };
      mockCallHandler = createCallHandler(paginatedData);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response.data).toEqual(paginatedData.items);
        expect(response.meta.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        });
        done();
      });
    });

    it('should calculate pagination correctly for last page', (done) => {
      const paginatedData = {
        items: [{ id: 1 }],
        page: 3,
        limit: 10,
        total: 25,
      };
      mockCallHandler = createCallHandler(paginatedData);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response.meta.pagination).toEqual(
          expect.objectContaining({
            hasNext: false,
            hasPrev: true,
          }),
        );
        done();
      });
    });

    it('should handle null data', (done) => {
      mockCallHandler = createCallHandler(null);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response).toEqual(
          expect.objectContaining({
            success: true,
            data: null,
          }),
        );
        done();
      });
    });

    it('should handle empty array', (done) => {
      mockCallHandler = createCallHandler([]);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response).toEqual(
          expect.objectContaining({
            success: true,
            data: [],
          }),
        );
        done();
      });
    });

    it('should generate UUID when x-request-id is not provided', (done) => {
      const contextWithoutRequestId = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/test-path',
            headers: {},
          }),
          getResponse: () => ({
            statusCode: 200,
          }),
        }),
      } as ExecutionContext;

      mockCallHandler = createCallHandler({ test: 'data' });

      const result$ = interceptor.intercept(
        contextWithoutRequestId,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response.meta.requestId).toBeDefined();
        expect(typeof response.meta.requestId).toBe('string');
        done();
      });
    });

    it('should handle pagination with single page', (done) => {
      const paginatedData = {
        items: [{ id: 1 }, { id: 2 }],
        page: 1,
        limit: 10,
        total: 2,
      };
      mockCallHandler = createCallHandler(paginatedData);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe((response) => {
        expect(response.meta.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });
        done();
      });
    });
  });
});

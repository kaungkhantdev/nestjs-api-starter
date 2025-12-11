import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; headers: Record<string, string> };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus, json: mockJson };
    mockRequest = {
      url: '/test-path',
      headers: { 'x-request-id': 'test-request-id' },
    };

    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Not found',
          },
          meta: expect.objectContaining({
            statusCode: HttpStatus.NOT_FOUND,
            path: '/test-path',
            requestId: 'test-request-id',
          }),
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom error', error: 'CUSTOM_ERROR' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'CUSTOM_ERROR',
            message: 'Custom error',
          }),
        }),
      );
    });

    it('should handle validation errors with array message', () => {
      const validationErrors = ['email must be valid', 'password is too short'];
      const exception = new HttpException(
        { message: validationErrors, error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'email must be valid',
            details: validationErrors,
          }),
        }),
      );
    });

    it('should handle unhandled exceptions', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        }),
      );
      expect(console.error).toHaveBeenCalledWith(
        'Unhandled exception:',
        exception,
      );
    });

    it('should handle null exception', () => {
      filter.catch(null, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should generate UUID when x-request-id is not provided', () => {
      mockRequest.headers = {};

      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: expect.any(String),
          }),
        }),
      );
    });

    it('should map status codes to error codes correctly', () => {
      const statusCodes = [
        { status: 400, code: 'BAD_REQUEST' },
        { status: 401, code: 'UNAUTHORIZED' },
        { status: 403, code: 'FORBIDDEN' },
        { status: 404, code: 'NOT_FOUND' },
        { status: 409, code: 'CONFLICT' },
        { status: 422, code: 'UNPROCESSABLE_ENTITY' },
        { status: 429, code: 'TOO_MANY_REQUESTS' },
        { status: 500, code: 'INTERNAL_SERVER_ERROR' },
      ];

      statusCodes.forEach(({ status, code }) => {
        const exception = new HttpException('Test', status);
        filter.catch(exception, mockHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code,
            }),
          }),
        );
      });
    });

    it('should include timestamp in meta', () => {
      const beforeTime = new Date().toISOString();
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const call = mockJson.mock.calls[0][0];
      const timestamp = call.meta.timestamp;
      const afterTime = new Date().toISOString();

      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });
  });
});

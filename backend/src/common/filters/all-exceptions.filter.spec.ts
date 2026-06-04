import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: { error: jest.Mock };
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    logger = { error: jest.fn() };
    filter = new AllExceptionsFilter(logger as unknown as Logger);
    json = jest.fn();
    status = jest.fn(() => ({ json }));
    host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/widgets', method: 'GET' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should pass HttpExceptions through with their status and body', () => {
    filter.catch(new NotFoundException('nope'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'nope' }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log and mask unknown errors as a generic 500', () => {
    filter.catch(new Error('boom'), host);

    expect(logger.error).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        path: '/api/widgets',
      }),
    );
  });
});

import type { CustomLoggerInfo } from '../../task_code';
import type { ExternalLogPayload } from '../../shared/types';
import { customLoggerTransformer, defaultTransformer, transformLog } from './transformers';

describe('transformers', () => {
  it('should pass through ExternalLogPayload via defaultTransformer', () => {
    const payload: ExternalLogPayload = {
      method: 'GET',
      url: '/test',
      status: 200,
      duration: 10,
      request: {
        headers: {},
        query: {},
        body: null,
        timestamp: Date.now()
      },
      response: {
        headers: {},
        body: null,
        timestamp: Date.now()
      },
      source: 'test'
    };

    const result = defaultTransformer(payload);

    expect(result).not.toBeNull();
    expect(result?.method).toBe('GET');
    expect(result?.format).toBe('external-log');
  });

  it('should transform CustomLoggerInfo via customLoggerTransformer', () => {
    const now = Date.now();
    const payload: CustomLoggerInfo = {
      userId: 'u1',
      traceId: 't1',
      url: '/bff',
      method: 'POST',
      bffPath: '/api/test',
      logDetails: ['detail'],
      axiosRequests: [],
      request: {
        params: {},
        body: 'body',
        headers: {} as any
      },
      response: {
        statusCode: 201,
        statusText: 'Created',
        headers: {} as any,
        data: 'data'
      }
    };

    const result = customLoggerTransformer(payload);

    expect(result).not.toBeNull();
    expect(result?.method).toBe('POST');
    expect(result?.format).toBe('custom-logger');
    expect(result?.status).toBe(201);
  });

  it('should fall back for unknown format in transformLog', () => {
    const input = { foo: 'bar' };
    const result = transformLog(input);

    expect(result.format).toBe('fallback');
    expect(result.request.body).toEqual(input);
  });
});


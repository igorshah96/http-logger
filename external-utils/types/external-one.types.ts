export type CustomLoggerInfo = {
  userId: string | undefined;
  traceId: string | undefined;
  url: string;
  method: string;
  bffPath: string;

  /**
   * Дополнительные детали лога (произвольные данные).
   * Необязательны и зависят от источника.
   */
  logDetails?: Array<string | Record<string, any>>;

  /**
   * Информация о внутренних HTTP-запросах (axios и т.п.), если есть.
   */
  axiosRequests?: Array<{
    url: string;
    params: string;
    code: number;
    message?: string;
    body?: unknown;
    data?: unknown;
    timestamp: number;
  }>;

  response: {
    statusCode: number | string;
    statusText: string;
    headers: Headers;
    data: object | string;
  };

  request: {
    params: Record<string, string>;
    data: object | string;
    headers: Headers;
  };
};
import type { CustomLoggerInfo } from './types/external-one.types';

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface HttpLoggerClientOptions {
  /**
   * Полный URL приёмника логов.
   * По умолчанию: http://localhost:4444
   */
  endpoint?: string;

  /**
   * Своя реализация fetch (node-fetch, undici, isomorphic-fetch и т.п.).
   * Если не указано, будет использован globalThis.fetch (Node 18+, браузер).
   */
  fetchImpl?: FetchLike;

  /**
   * Таймаут HTTP-запроса в миллисекундах.
   * Если 0 или не указан, таймаут не применяется.
   */
  timeoutMs?: number;
}

/**
 * Подготовка данных к отправке.
 * Ничего не удаляет и не обрезает — возвращает объект как есть.
 */
export function prepareData<T>(data: T): T {
  return data;
}

/**
 * Отправка CustomLoggerInfo на HTTP-сервис (по умолчанию http://localhost:4444).
 */
export async function sendCustomLoggerInfo(
  info: CustomLoggerInfo,
  options: HttpLoggerClientOptions = {},
): Promise<void> {
  const endpoint = options.endpoint ?? 'http://localhost:4444';
  const fetchFn: FetchLike | undefined =
    options.fetchImpl ??
    (typeof globalThis !== 'undefined' && (globalThis as any).fetch
      ? (async (url, init) => {
          const res = await (globalThis as any).fetch(url, init);
          return {
            ok: res.ok,
            status: res.status,
            json: () => res.json(),
          };
        })
      : undefined);

  if (!fetchFn) {
    throw new Error(
      'No fetch implementation available. Provide fetchImpl in HttpLoggerClientOptions or use an environment with global fetch.',
    );
  }

  const controller =
    options.timeoutMs && typeof AbortController !== 'undefined'
      ? new AbortController()
      : undefined;

  const timeoutId =
    options.timeoutMs && controller
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

  try {
    const payload = prepareData(info);

    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (!response.ok) {
      // Дадим вызывающему коду понять, что приёмник вернул ошибку.
      throw new Error(`HTTP logger responded with status ${response.status}`);
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}


import type { CustomLoggerInfo } from '../../task_code'
import type { ExternalLogPayload } from '../../shared/types'

/**
 * Normalizes different incoming log formats into the internal ExternalLogPayload format.
 */
export type Transformer<TInput = unknown> = (payload: TInput) => ExternalLogPayload | null

function isCustomLoggerInfo(payload: unknown): payload is CustomLoggerInfo {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Partial<CustomLoggerInfo>
  return typeof p.method === 'string'
    && typeof p.url === 'string'
    && typeof p.response === 'object'
    && typeof p.request === 'object'
}

/**
 * Transformer for the original ExternalLogPayload format.
 */
export const defaultTransformer: Transformer<ExternalLogPayload> = (payload) => {
  if (payload && typeof payload === 'object' && 'method' in payload && 'url' in payload && 'status' in payload) {
    const base: ExternalLogPayload = {
      ...payload,
      format: (payload as ExternalLogPayload).format ?? 'external-log',
      source: (payload as any).source || 'default'
    }

    if ('axiosRequests' in payload && (payload as any).axiosRequests) {
      base.meta = {
        ...(base.meta || {}),
        axiosRequests: (payload as any).axiosRequests
      }
    }

    return base
  }
  return null
}

/**
 * Transformer for the CustomLoggerInfo format from external-utils.
 */
export const customLoggerTransformer: Transformer<CustomLoggerInfo> = (payload) => {
  if (isCustomLoggerInfo(payload)) {
    const p = payload

    // Normalize headers if they are not plain objects (though in JSON they should be)
    const normalizeHeaders = (headers: any): Record<string, string> => {
      if (!headers) return {}
      if (typeof headers.entries === 'function') {
        return Object.fromEntries(headers.entries())
      }
      return headers as Record<string, string>
    }

    return {
      format: 'custom-logger',
      method: p.method || 'UNKNOWN',
      url: p.url || '',
      status: Number(p.response.statusCode) || 0,
      duration: 0, // Not provided in CustomLoggerInfo
      request: {
        headers: normalizeHeaders(p.request.headers),
        query: p.request.params || {},
        body: p.request.body || null,
        timestamp: Date.now()
      },
      response: {
        headers: normalizeHeaders(p.response.headers),
        body: p.response.data || null,
        timestamp: Date.now()
      },
      userId: p.userId,
      traceId: p.traceId,
      bffPath: p.bffPath,
      source: 'custom-logger',
      meta: p.logDetails || p.axiosRequests
        ? {
            logDetails: p.logDetails,
            axiosRequests: p.axiosRequests
          }
        : undefined
    }
  }
  return null
}

const transformers: Transformer[] = [customLoggerTransformer as Transformer, defaultTransformer as Transformer]

/**
 * Main entry point for log transformation.
 * Tries all registered transformers and returns the first successful one.
 */
export function transformLog(payload: unknown): ExternalLogPayload {
  for (const transformer of transformers) {
    const transformed = transformer(payload)
    if (transformed) {
      return transformed
    }
  }

  // Fallback for unknown formats - still try to return something usable
  const p = payload as any

  return {
    format: 'fallback',
    method: p?.method || 'POST',
    url: p?.url || 'unknown',
    status: p?.status || 0,
    duration: 0,
    request: {
      headers: {},
      query: {},
      body: payload,
      timestamp: Date.now()
    },
    response: {
      headers: {},
      body: null,
      timestamp: Date.now()
    },
    source: 'unknown'
  }
}

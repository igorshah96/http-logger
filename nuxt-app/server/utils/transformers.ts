import type { ExternalLogPayload } from '../../shared/types'

/**
 * Normalizes different incoming log formats into the internal ExternalLogPayload format.
 */
export type Transformer = (payload: any) => ExternalLogPayload | null

/**
 * Transformer for the original ExternalLogPayload format.
 */
export const defaultTransformer: Transformer = (payload) => {
  if (payload && typeof payload === 'object' && 'method' in payload && 'url' in payload && 'status' in payload) {
    return {
      ...payload,
      source: payload.source || 'default'
    } as ExternalLogPayload
  }
  return null
}

/**
 * Transformer for the CustomLoggerInfo format from external-utils.
 */
export const customLoggerTransformer: Transformer = (payload) => {
  if (payload && typeof payload === 'object' && 'bffPath' in payload) {
    const p = payload as any

    // Normalize headers if they are not plain objects (though in JSON they should be)
    const normalizeHeaders = (headers: any): Record<string, string> => {
      if (!headers) return {}
      if (typeof headers.entries === 'function') {
        return Object.fromEntries(headers.entries())
      }
      return headers as Record<string, string>
    }

    return {
      method: p.method || 'UNKNOWN',
      url: p.url || '',
      status: Number(p.response?.statusCode) || 0,
      duration: 0, // Not provided in CustomLoggerInfo
      request: {
        headers: normalizeHeaders(p.request?.headers),
        query: p.request?.params || {},
        body: p.request?.data || null,
        timestamp: Date.now()
      },
      response: {
        headers: normalizeHeaders(p.response?.headers),
        body: p.response?.data || null,
        timestamp: Date.now()
      },
      userId: p.userId,
      traceId: p.traceId,
      bffPath: p.bffPath,
      source: 'custom-logger',
      meta: {
        logDetails: p.logDetails,
        axiosRequests: p.axiosRequests
      }
    }
  }
  return null
}

const transformers: Transformer[] = [customLoggerTransformer, defaultTransformer]

/**
 * Main entry point for log transformation.
 * Tries all registered transformers and returns the first successful one.
 */
export function transformLog(payload: any): ExternalLogPayload {
  for (const transformer of transformers) {
    const transformed = transformer(payload)
    if (transformed) {
      return transformed
    }
  }

  // Fallback for unknown formats - still try to return something usable
  return {
    method: payload?.method || 'POST',
    url: payload?.url || 'unknown',
    status: payload?.status || 0,
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

import { randomUUID } from 'node:crypto'
import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'

import { logStorage } from '../utils/storage'
import { transformLog } from '../utils/transformers'
import type { ExternalLogPayload, LogEntry } from '../../shared/types'

const MAX_BODY_BYTES = 1024 * 1024 // 1MB hard limit for safety

function assertBodySize(raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    const error = new Error('Payload too large');
    (error as any).statusCode = 413
    throw error
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, X-HTTP-LOGGER-TOKEN')

  const tokenFromEnv = process.env.HTTP_LOGGER_TOKEN
  if (tokenFromEnv) {
    const tokenFromHeader = event.node.req.headers['x-http-logger-token']
    if (tokenFromHeader !== tokenFromEnv) {
      setResponseStatus(event, 401)
      return { error: 'Unauthorized' }
    }
  }

  try {
    const rawBody = await readBody<unknown>(event)

    const stringified = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {})

    assertBodySize(stringified)

    const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody as ExternalLogPayload)
    const payload = transformLog(parsed)

    console.log(`[HTTP Logger] Incoming request: ${payload.method} ${payload.url} (Source: ${payload.source ?? 'unknown'})`)

    const logEntry: LogEntry = {
      ...payload,
      id: randomUUID()
    }

    logStorage.addLog(logEntry)

    setResponseStatus(event, 201)
    return { status: 'ok', id: logEntry.id }
  } catch (error: any) {
    const message = error?.message ?? 'Unknown error'
    const statusCode = error?.statusCode ?? 400

    console.error('[HTTP Logger] Error processing /logs request', message)

    setResponseStatus(event, statusCode)
    return {
      error: statusCode === 413 ? 'Payload too large' : 'Invalid JSON',
      details: message
    }
  }
})

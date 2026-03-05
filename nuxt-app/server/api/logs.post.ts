import { randomUUID } from 'node:crypto'
import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'

import { logStorage } from '../utils/storage'
import { transformLog } from '../utils/transformers'
import type { ExternalLogPayload, LogEntry } from '../../shared/types'

const MAX_BODY_BYTES = 1024 * 1024 // 1MB hard limit for safety

const REQUIRED_FIELDS = ['method', 'url', 'status', 'duration', 'request', 'response'] as const

function assertBodySize(raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    const error = new Error('Payload too large');
    (error as any).statusCode = 413
    throw error
  }
}

function validatePayload(payload: any): asserts payload is ExternalLogPayload {
  const missingFields = REQUIRED_FIELDS.filter(field => !(field in payload))
  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
    (error as any).statusCode = 400
    throw error
  }
  
  // Validate nested request fields
  if (!payload.request || typeof payload.request !== 'object') {
    const error = new Error('Invalid request field: must be an object');
    (error as any).statusCode = 400
    throw error
  }
  
  if (!payload.response || typeof payload.response !== 'object') {
    const error = new Error('Invalid response field: must be an object');
    (error as any).statusCode = 400
    throw error
  }
  
  // Validate required nested fields
  const requiredRequestFields = ['headers', 'query', 'body', 'timestamp'] as const
  const missingRequestFields = requiredRequestFields.filter(field => !(field in payload.request))
  if (missingRequestFields.length > 0) {
    const error = new Error(`Missing required request fields: ${missingRequestFields.join(', ')}`);
    (error as any).statusCode = 400
    throw error
  }
  
  const requiredResponseFields = ['headers', 'body', 'timestamp'] as const
  const missingResponseFields = requiredResponseFields.filter(field => !(field in payload.response))
  if (missingResponseFields.length > 0) {
    const error = new Error(`Missing required response fields: ${missingResponseFields.join(', ')}`);
    (error as any).statusCode = 400
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

    validatePayload(payload)

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

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { H3Event } from 'h3'
import { getRequestHeaders, getResponseHeaders, getResponseStatusText } from 'h3'

import { cloneDeep, omit } from 'lodash-es'
import type { InspectOptions } from 'util'
import { inspect } from 'util'

import { HeaderHelper } from '../../../utils/headerHelper.util'
import { TokenUtil } from '../../utils/token.util'

import { ETelemetryHeaders } from '../../../enums/telemetryHeaders.enum'

export type CustomLoggerInfo = {
  userId: string | undefined
  traceId: string | undefined
  url: string
  method: string
  bffPath: string
  logDetails?: AdditionalLogDetails
  axiosRequests?: Array<AxiosLog>

  request: {
    params: Record<string, string>
    body: OutgoingData
    headers: Headers
  }

  response: {
    statusCode: number | string
    statusText: string
    headers: Headers
    data: OutgoingData
  }
}

type AdditionalLogDetail = string | Record<string, any> | { axiosResponse: AxiosLog }
type AdditionalLogDetails = Array<AdditionalLogDetail>

type Headers = ReturnType<H3Event['node']['res']['getHeaders']>
type IncomingData = Error | Record<string, unknown>
type OutgoingData = string

type AddAxiosLogOpts = { requestTimestamp: number, reqBody: AxiosRequestConfig['data'] }

type AxiosLog = {
  url: string
  params: string
  code: number
  message?: string
  body?: OutgoingData
  data?: OutgoingData
  timestamp: number
}

export class LoggerUtil {
  // prettier-ignore
  static ignoredHeaders = ['cookie', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'accept-language', 'x-forwarded-for', 'x-forwarded-port', 'x-forwarded-proto', 'cache-control', 'baggage', 'accept', 'sentry-trace', 'set-cookie', 'accessToken', 'refreshToken']

  static ignoreUrls: string[] = ['devtools', 'ipx', '/_nuxt/', '/wp-admin', '/wp-includes/', '/wp-admin']
  // prettier-ignore
  static sensitiveKeys = ['password', 'oldPassword', 'newPassword', 'email', 'refreshToken', 'accessToken', 'godModeToken', 'lastName', 'patronymic', 'phone', 'workPhone', 'login', 'name', 'bankAccount', 'bic', 'passport']

  static sensitiveKeysPattern = new RegExp(`(\\b(?:${LoggerUtil.sensitiveKeys.join('|')})\\s*:\\s*)('[^']*'|"[^"]*")`, 'gi')

  public static async getLogInfoFromEvent(
    event: H3Event | undefined,
    responseData?: Error | Record<string, unknown>
  ): Promise<CustomLoggerInfo | null> {
    if (!event) {
      return null
    }

    const requestUrl = event.node.req.url

    if (!requestUrl || LoggerUtil.ignoreUrls.some(url => requestUrl.includes(url))) {
      return null
    }

    const requestHeadersRow = getRequestHeaders(event) as Record<string, string>
    const requestHeaders = omit(requestHeadersRow, this.ignoredHeaders)
    const responseHeadersRow = getResponseHeaders(event) as Record<string, string>
    const responseHeaders = omit(responseHeadersRow, this.ignoredHeaders)

    const params = getQuery(event) as Record<string, string>

    const telemetryHeaders = HeaderHelper.getTelemetryHeaders(event)

    return {
      url: event.node.req.url as string,
      userId: TokenUtil.getUserSubFromAccessTokenByEvent(event) as string,
      traceId: telemetryHeaders?.[ETelemetryHeaders.TraceId] as string,
      method: event.method,
      bffPath: telemetryHeaders?.[ETelemetryHeaders.BffPath] as string,
      logDetails: LoggerUtil.getAdditionalInfo(event),
      axiosRequests: LoggerUtil.collectAxiosRequests(event),

      request: {
        headers: requestHeaders,
        params,
        body: await LoggerUtil.getRequestBody(event)
      },

      response: {
        statusCode: getResponseStatus(event) || '-',
        statusText: getResponseStatusText(event) || '-',
        headers: responseHeaders,
        data: LoggerUtil.getResponseData(responseData)
      }
    }
  }

  public static hasErrorCode(event: H3Event): boolean {
    return getResponseStatus(event) >= 400
  }

  /** Добавление дополнительной информации о логировании */
  public static addLogInfo(info: AdditionalLogDetail, event: H3Event) {
    event.context.logInfo ??= []
    event.context.logInfo.push(cloneDeep(info))
  }

  /** Получение дополнительной информации о логировании с Event  */
  private static getAdditionalInfo(event: H3Event): AdditionalLogDetails | undefined {
    return cloneDeep(event.context.logInfo)
  }

  /** Обработка данных запроса */
  private static async getRequestBody(event: H3Event): Promise<OutgoingData> {
    if (!['POST', 'PUT', 'PATCH'].includes(event.method.toUpperCase())) {
      return '[Empty]'
    }

    try {
      const body = await readBody(event)
      if (body == null) {
        return '[Empty]'
      }

      return LoggerUtil.prepareData(body)
    } catch {
      return '[Transform error]'
    }
  }

  private static hideSensitiveKeys(string: string): string {
    return string.replace(LoggerUtil.sensitiveKeysPattern, '$1[HIDDEN]')
  }

  /** Обработка данных ответа */
  private static getResponseData(data?: IncomingData): OutgoingData {
    if (data == null) {
      return '[Empty]'
    }

    try {
      return LoggerUtil.prepareData(data)
    } catch {
      return '[Transform error]'
    }
  }

  private static prepareData(data: IncomingData, options?: InspectOptions): OutgoingData {
    const formatterString = inspect(data, {
      depth: null,
      breakLength: Infinity,
      compact: true,
      sorted: false,
      ...options
    })

    return LoggerUtil.hideSensitiveKeys(formatterString)
  }

  /* ========== AXIOS ========== */

  public static addAxiosResponseLog(axiosResponse: AxiosResponse, event: H3Event, opts: AddAxiosLogOpts) {
    LoggerUtil.addAxiosLogInfo(LoggerUtil.formatAxiosSuccessResponse(axiosResponse, opts), event)
  }

  public static addAxiosErrorLog(axiosResponse: AxiosError, event: H3Event, opts: AddAxiosLogOpts) {
    LoggerUtil.addAxiosLogInfo(LoggerUtil.formatAxiosError(axiosResponse, opts), event)
  }

  /** Добавление дополнительной информации о логировании */
  public static addAxiosLogInfo(info: AdditionalLogDetail, event: H3Event) {
    event.context.axiosLogInfo ??= []
    event.context.axiosLogInfo.push(cloneDeep(info))
  }

  private static collectAxiosRequests(event: H3Event): Array<AxiosLog> {
    const axiosLogs = LoggerUtil.getAdditionalAxiosLogInfo(event)
    if (!axiosLogs) return []

    const filteredLogs = axiosLogs.sort((a, b) => a.timestamp - b.timestamp)

    return filteredLogs
  }

  /** Получение дополнительной информации о логировании с Event  */
  private static getAdditionalAxiosLogInfo(event: H3Event): Array<AxiosLog> | undefined {
    return cloneDeep(event.context.axiosLogInfo)
  }

  private static formatAxiosSuccessResponse(response: AxiosResponse, opts: AddAxiosLogOpts): AxiosLog {
    return {
      url: response?.config.url ?? response.request?.url,
      params: response?.config.params,
      code: response.status,
      body: LoggerUtil.prepareData(opts.reqBody || response?.config?.data),
      data: LoggerUtil.prepareData(response?.data),
      timestamp: opts.requestTimestamp
    }
  }

  private static formatAxiosError(error: AxiosError, opts: AddAxiosLogOpts): AxiosLog {
    const data = typeof error.response?.data === 'object' ? error.response?.data : { data: error.response?.data }

    return {
      url: error.response?.config?.url || error.config?.url || '-',
      params: error.request?.params,
      code: error.response?.status || Number(error.status),
      message: error.code || error.message,
      data: LoggerUtil.prepareData(data),
      timestamp: opts.requestTimestamp
    }
  }
}

import type { Ref } from 'vue'

import type { LogEntry, WsServerMessage } from '#shared/types'
import { LOGS_MAX_ITEMS } from '#shared/config'

export function applyLogsServerMessage(logs: Ref<LogEntry[]>, message: WsServerMessage) {
  if (message.type === 'INITIAL_STATE') {
    logs.value = message.payload
    return
  }

  if (message.type === 'LOG_ADDED') {
    logs.value.unshift(message.payload)
    if (logs.value.length > LOGS_MAX_ITEMS) {
      logs.value.pop()
    }
    return
  }

  if (message.type === 'LOGS_CLEARED') {
    logs.value = []
  }
}

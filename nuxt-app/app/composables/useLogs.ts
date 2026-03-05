import { ref } from 'vue'
import { useWebSocket } from '@vueuse/core'
import type { LogEntry, WsServerMessage, WsClientMessage } from '../../shared/types'

import { applyLogsServerMessage } from '../utils/wsProtocol'

export function useLogs() {
  const logs = ref<LogEntry[]>([])

  if (import.meta.server || typeof window === 'undefined') {
    return {
      logs,
      status: ref<'OPEN' | 'CLOSED' | 'CONNECTING'>('CLOSED'),
      clearLogs: () => {}
    }
  }

  const { status, send } = useWebSocket('/_ws', {
    autoReconnect: true,
    onMessage: (_, event) => {
      try {
        const message: WsServerMessage = JSON.parse(event.data)
        applyLogsServerMessage(logs, message)
      } catch (e) {
        console.error('Failed to parse WS message', e)
      }
    }
  })

  const clearLogs = () => {
    const msg: WsClientMessage = { type: 'CLEAR_LOGS' }
    send(JSON.stringify(msg))
  }

  return {
    logs,
    status,
    clearLogs
  }
}

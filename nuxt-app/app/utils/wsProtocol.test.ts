import { ref } from 'vue'

import type { LogEntry } from '../../shared/types'
import { applyLogsServerMessage } from './wsProtocol'

function createLog(id: string): LogEntry {
  return {
    id,
    method: 'GET',
    url: '/test',
    status: 200,
    duration: 0,
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
    }
  }
}

describe('wsProtocol', () => {
  it('applies INITIAL_STATE', () => {
    const logs = ref<LogEntry[]>([])

    applyLogsServerMessage(logs, {
      type: 'INITIAL_STATE',
      payload: [createLog('1')]
    })

    expect(logs.value).toHaveLength(1)
    expect(logs.value[0].id).toBe('1')
  })

  it('applies LOG_ADDED and respects max size', () => {
    const logs = ref<LogEntry[]>([])

    applyLogsServerMessage(logs, {
      type: 'LOG_ADDED',
      payload: createLog('1')
    })

    expect(logs.value[0].id).toBe('1')
  })

  it('applies LOGS_CLEARED', () => {
    const logs = ref<LogEntry[]>([createLog('1')])

    applyLogsServerMessage(logs, {
      type: 'LOGS_CLEARED'
    })

    expect(logs.value).toHaveLength(0)
  })
})

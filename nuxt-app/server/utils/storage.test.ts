import type { LogEntry } from '../../shared/types'
import { logStorage } from './storage'

describe('logStorage', () => {
  it('adds logs and respects max size', () => {
    const base: Omit<LogEntry, 'id'> = {
      method: 'GET',
      url: '/test',
      status: 200,
      duration: 1,
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

    for (let i = 0; i < 5; i += 1) {
      logStorage.addLog({ ...base, id: String(i) })
    }

    const logs = logStorage.getLogs()
    expect(logs).toHaveLength(5)
    expect(logs[0].id).toBe('4')
  })

  it('emits events for add/clear', () => {
    const addedSpy = vi.fn()
    const clearedSpy = vi.fn()

    const unsubscribeAdded = logStorage.onLogAdded(addedSpy)
    const unsubscribeCleared = logStorage.onLogsCleared(clearedSpy)

    const log = {
      id: '1',
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
    } satisfies LogEntry

    logStorage.addLog(log)
    logStorage.clearLogs()

    unsubscribeAdded()
    unsubscribeCleared()

    expect(addedSpy).toHaveBeenCalledTimes(1)
    expect(clearedSpy).toHaveBeenCalledTimes(1)
  })
})

import { EventEmitter } from 'node:events'

import type { LogEntry } from '../../shared/types'
import { LOGS_MAX_ITEMS } from '../../shared/config'

type LogAddedListener = (log: LogEntry) => void
type LogsClearedListener = () => void

class LogStorage extends EventEmitter {
  private logs: LogEntry[] = []
  private maxLogs = LOGS_MAX_ITEMS

  constructor() {
    super()
    this.setMaxListeners(0)
  }

  addLog(log: LogEntry) {
    this.logs.unshift(log)
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }
    this.emit('logAdded', log)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.emit('logsCleared')
  }

  onLogAdded(listener: LogAddedListener) {
    this.on('logAdded', listener)
    return () => {
      this.off('logAdded', listener)
    }
  }

  onLogsCleared(listener: LogsClearedListener) {
    this.on('logsCleared', listener)
    return () => {
      this.off('logsCleared', listener)
    }
  }
}

export const logStorage = new LogStorage()

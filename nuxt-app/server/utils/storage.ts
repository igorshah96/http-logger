import { LogEntry } from '../../shared/types';
import { EventEmitter } from 'node:events';

class LogStorage extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  addLog(log: LogEntry) {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    this.emit('logAdded', log);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.emit('logsCleared');
  }
}

export const logStorage = new LogStorage();

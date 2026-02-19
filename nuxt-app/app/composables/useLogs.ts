import { ref } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { LogEntry, WsServerMessage, WsClientMessage } from '../../shared/types';

export function useLogs() {
  const logs = ref<LogEntry[]>([]);

  const { status, send } = useWebSocket('/_ws', {
    autoReconnect: true,
    onMessage: (_, event) => {
      try {
        const message: WsServerMessage = JSON.parse(event.data);
        if (message.type === 'INITIAL_STATE') {
          logs.value = message.payload;
        } else if (message.type === 'LOG_ADDED') {
          logs.value.unshift(message.payload);
          if (logs.value.length > 1000) {
            logs.value.pop();
          }
        } else if (message.type === 'LOGS_CLEARED') {
          logs.value = [];
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    },
  });

  const clearLogs = () => {
    const msg: WsClientMessage = 'CLEAR_LOGS';
    send(msg);
  };

  return {
    logs,
    status,
    clearLogs
  };
}

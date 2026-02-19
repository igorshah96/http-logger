import { defineWebSocketHandler } from 'h3';
import { logStorage } from '../utils/storage';
import { LogEntry, WsServerMessage } from '../../shared/types';

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WS] Peer connected', peer.id);
    // Send initial state
    const initialState: WsServerMessage = {
      type: 'INITIAL_STATE',
      payload: logStorage.getLogs(),
    };
    peer.send(JSON.stringify(initialState));

    // Subscribe to new logs
    const onLogAdded = (log: LogEntry) => {
      const message: WsServerMessage = {
        type: 'LOG_ADDED',
        payload: log,
      };
      peer.send(JSON.stringify(message));
    };

    const onLogsCleared = () => {
      const message: WsServerMessage = {
        type: 'LOGS_CLEARED',
      };
      peer.send(JSON.stringify(message));
    };

    logStorage.on('logAdded', onLogAdded);
    logStorage.on('logsCleared', onLogsCleared);

    // Store handlers on peer context to remove later
    peer.ctx = peer.ctx || {};
    peer.ctx.onLogAdded = onLogAdded;
    peer.ctx.onLogsCleared = onLogsCleared;
  },

  close(peer) {
    console.log('[WS] Peer disconnected', peer.id);
    if (peer.ctx?.onLogAdded) {
      logStorage.off('logAdded', peer.ctx.onLogAdded);
    }
    if (peer.ctx?.onLogsCleared) {
      logStorage.off('logsCleared', peer.ctx.onLogsCleared);
    }
  },

  message(peer, message) {
    console.log('[WS] Message from peer', peer.id, message.text());
    // Handle potential client messages if needed
    if (message.text() === 'CLEAR_LOGS') {
      logStorage.clearLogs();
    }
  },
});

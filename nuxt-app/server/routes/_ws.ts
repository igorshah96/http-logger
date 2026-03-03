import { defineWebSocketHandler } from 'h3'
import { logStorage } from '../utils/storage'
import type { LogEntry, WsClientMessage, WsServerMessage } from '../../shared/types'

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WS] Peer connected', peer.id)
    // Send initial state
    const initialState: WsServerMessage = {
      type: 'INITIAL_STATE',
      payload: logStorage.getLogs()
    }
    peer.send(JSON.stringify(initialState))

    // Subscribe to new logs
    const onLogAdded = (log: LogEntry) => {
      const message: WsServerMessage = {
        type: 'LOG_ADDED',
        payload: log
      }
      peer.send(JSON.stringify(message))
    }

    const onLogsCleared = () => {
      const message: WsServerMessage = {
        type: 'LOGS_CLEARED'
      }
      peer.send(JSON.stringify(message))
    }

    const unsubscribeLogAdded = logStorage.onLogAdded(onLogAdded)
    const unsubscribeLogsCleared = logStorage.onLogsCleared(onLogsCleared)

    // Store handlers on peer context to remove later
    peer.ctx = peer.ctx || {}
    peer.ctx.onLogAdded = unsubscribeLogAdded
    peer.ctx.onLogsCleared = unsubscribeLogsCleared
  },

  close(peer) {
    console.log('[WS] Peer disconnected', peer.id)
    if (peer.ctx?.onLogAdded) {
      peer.ctx.onLogAdded()
    }
    if (peer.ctx?.onLogsCleared) {
      peer.ctx.onLogsCleared()
    }
  },

  message(peer, message) {
    const raw = message.text()
    console.log('[WS] Message from peer', peer.id, raw)

    try {
      const parsed = JSON.parse(raw) as WsClientMessage

      switch (parsed.type) {
        case 'CLEAR_LOGS':
          logStorage.clearLogs()
          break
        default:
          console.warn('[WS] Unknown client message type', parsed)
      }
    } catch (error) {
      console.error('[WS] Failed to parse client message', error)
    }
  }
})

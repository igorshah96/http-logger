import { computed } from 'vue'

import type { AxiosRequestMeta, LogEntry } from '../../shared/types'

export type BffRow = {
  kind: 'bff'
  log: LogEntry
}

export type AxiosRow = {
  kind: 'axios'
  parentId: string
  parent: LogEntry
  axios: AxiosRequestMeta
}

export type GroupedRow = BffRow | AxiosRow

export function useGroupedLogs(filteredLogs: { value: LogEntry[] }) {
  const groupedLogs = computed<GroupedRow[]>(() => {
    return filteredLogs.value.flatMap((log) => {
      const parentRow: BffRow = { kind: 'bff', log }

      const axiosRequests = (log.meta?.axiosRequests || []) as AxiosRequestMeta[]
      const childRows: AxiosRow[] = axiosRequests.map(axios => ({
        kind: 'axios',
        parentId: log.id,
        parent: log,
        axios
      }))

      return [parentRow, ...childRows]
    })
  })

  return {
    groupedLogs
  }
}

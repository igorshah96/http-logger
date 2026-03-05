import { ref, computed, type Ref } from 'vue'
import type { LogEntry, LogFiltersState } from '../../shared/types'

export function useLogFilters(logs: Ref<LogEntry[]>) {
  const filters = ref<LogFiltersState>({
    search: '',
    exclude: '',
    globalSearch: '',
    methods: [],
    statuses: []
  })

  const filteredLogs = computed(() => {
    return logs.value.filter((log) => {
      // Filter by URL (search)
      if (filters.value.search && !log.url.toLowerCase().includes(filters.value.search.toLowerCase())) {
        return false
      }

      // Filter by Exclusion (Regex)
      if (filters.value.exclude) {
        try {
          const regex = new RegExp(filters.value.exclude, 'i')
          if (regex.test(log.url)) {
            return false
          }
        } catch (e) {
          // Invalid regex, ignore filter
        }
      }

      // Filter by Global Search
      if (filters.value.globalSearch) {
        const query = filters.value.globalSearch.toLowerCase()
        const check = (val: any): boolean => {
          if (!val) return false
          if (typeof val === 'string') return val.toLowerCase().includes(query)
          if (typeof val === 'number') return val.toString().includes(query)
          if (Array.isArray(val)) return val.some(check)
          if (typeof val === 'object') {
            return Object.values(val).some(check) || Object.keys(val).some(k => k.toLowerCase().includes(query))
          }
          return false
        }

        const matches = check(log.url)
          || check(log.method)
          || check(log.request.body)
          || check(log.request.headers)
          || check(log.response.body)
          || check(log.response.headers)
          || check(log.userId)
          || check(log.traceId)
          || check(log.bffPath)
          || (log.meta?.axiosRequests || []).some(axios => check(axios))

        if (!matches) return false
      }

      // Filter by HTTP Methods
      if (filters.value.methods.length > 0) {
        if (!filters.value.methods.includes(log.method.toUpperCase())) {
          return false
        }
      }

      // Filter by Status Codes (2xx, 3xx, etc.)
      if (filters.value.statuses.length > 0) {
        const statusGroup = Math.floor(log.status / 100).toString()
        if (!filters.value.statuses.includes(statusGroup)) {
          return false
        }
      }

      return true
    })
  })

  return {
    filters,
    filteredLogs
  }
}

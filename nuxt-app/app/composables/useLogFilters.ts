import { ref, computed, type Ref } from 'vue';
import type { LogEntry, LogFiltersState } from '../../shared/types';

export function useLogFilters(logs: Ref<LogEntry[]>) {
  const filters = ref<LogFiltersState>({
    search: '',
    methods: [],
    statuses: []
  });

  const filteredLogs = computed(() => {
    return logs.value.filter(log => {
      // Filter by URL (search)
      if (filters.value.search && !log.url.toLowerCase().includes(filters.value.search.toLowerCase())) {
        return false;
      }

      // Filter by HTTP Methods
      if (filters.value.methods.length > 0) {
        if (!filters.value.methods.includes(log.method.toUpperCase())) {
          return false;
        }
      }

      // Filter by Status Codes (2xx, 3xx, etc.)
      if (filters.value.statuses.length > 0) {
        const statusGroup = Math.floor(log.status / 100).toString();
        if (!filters.value.statuses.includes(statusGroup)) {
          return false;
        }
      }

      return true;
    });
  });

  return {
    filters,
    filteredLogs
  };
}

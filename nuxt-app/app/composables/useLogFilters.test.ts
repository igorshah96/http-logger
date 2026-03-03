import { ref } from 'vue';

import type { LogEntry } from '../../shared/types';
import { useLogFilters } from './useLogFilters';

function createLog(partial: Partial<LogEntry> = {}): LogEntry {
  return {
    id: partial.id ?? '1',
    method: partial.method ?? 'GET',
    url: partial.url ?? '/test',
    status: partial.status ?? 200,
    duration: partial.duration ?? 0,
    request: partial.request ?? {
      headers: {},
      query: {},
      body: null,
      timestamp: Date.now()
    },
    response: partial.response ?? {
      headers: {},
      body: null,
      timestamp: Date.now()
    },
    ...partial
  };
}

describe('useLogFilters', () => {
  it('filters by search, method and status group', () => {
    const logs = ref<LogEntry[]>([
      createLog({ id: '1', url: '/users', method: 'GET', status: 200 }),
      createLog({ id: '2', url: '/admin', method: 'POST', status: 500 })
    ]);

    const { filters, filteredLogs } = useLogFilters(logs);

    filters.value.search = 'admin';
    filters.value.methods = ['POST'];
    filters.value.statuses = ['5'];

    expect(filteredLogs.value).toHaveLength(1);
    expect(filteredLogs.value[0].id).toBe('2');
  });
});


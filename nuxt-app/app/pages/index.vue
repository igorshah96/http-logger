<template>
  <div class="h-full flex flex-col p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold">HTTP Logs</h1>
        <UBadge :color="status === 'OPEN' ? 'success' : 'error'" variant="subtle" size="sm">
          {{ status }}
        </UBadge>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-trash"
          label="Clear Logs"
          color="neutral"
          variant="outline"
          size="sm"
          @click="clearLogs"
        />
      </div>
    </div>

    <LogFilters v-model="filters" class="mb-4 rounded-lg border border-muted" />

    <div class="flex-1 overflow-auto border border-muted rounded-lg">
      <UTable
        :data="filteredLogs"
        :columns="columns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        class="w-full"
        :on-select="onRowClick"
      >
        <template #method-cell="{ row }">
          <UBadge
            :color="getMethodColor(row.getValue('method'))"
            variant="subtle"
            class="uppercase"
          >
            {{ row.getValue('method') }}
          </UBadge>
        </template>

        <template #status-cell="{ row }">
          <span :class="getStatusColor(row.original.status)" class="font-mono">
            {{ row.original.status }}
          </span>
        </template>

        <template #url-cell="{ row }">
          <span class="truncate max-w-md block font-mono text-xs" :title="row.original.url">
            {{ row.original.url }}
          </span>
        </template>

        <template #duration-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.duration }}ms</span>
        </template>

        <template #request-timestamp-cell="{ row }">
          <span class="text-xs text-muted">
            {{ row.original.request?.timestamp ? new Date(row.original.request.timestamp).toLocaleTimeString() : '-' }}
          </span>
        </template>
      </UTable>
    </div>

    <LogDetails v-model:log="selectedLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { LogEntry, WsServerMessage } from '../../shared/types';
import { UBadge, UButton, UTable } from '#components';
import LogDetails from '../components/LogDetails.vue';
import LogFilters from '../components/LogFilters.vue';
import type { LogFiltersState } from '../components/LogFilters.vue';

import { getMethodColor, getStatusColor } from '../utils/colors';

const logs = ref<LogEntry[]>([]);
const selectedLog = ref<LogEntry | null>(null);

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
      // Normalize values (handle both strings and objects from UI component)
      const activeMethods = filters.value.methods.map((m: any) => 
        (typeof m === 'object' && m !== null && 'value' in m) ? m.value : m
      );
      if (!activeMethods.includes(log.method.toUpperCase())) {
        return false;
      }
    }

    // Filter by Status Codes (2xx, 3xx, etc.)
    if (filters.value.statuses.length > 0) {
      const activeStatuses = filters.value.statuses.map((s: any) => 
        (typeof s === 'object' && s !== null && 'value' in s) ? s.value : s
      );
      const statusGroup = Math.floor(log.status / 100).toString();
      if (!activeStatuses.includes(statusGroup)) {
        return false;
      }
    }

    return true;
  });
});

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

const columns = [
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'url', header: 'URL' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'duration', header: 'Time' },
  { accessorKey: 'request.timestamp', header: 'Timestamp' }
];

function onRowClick(_: any, row: any) {
  selectedLog.value = row.original;
}

function clearLogs() {
  send('CLEAR_LOGS');
}
</script>

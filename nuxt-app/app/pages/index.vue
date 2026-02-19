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

    <div class="flex-1 overflow-auto border border-muted rounded-lg">
      <UTable
        :data="logs"
        :columns="columns"
        class="w-full"
        :on-select="onRowClick"
      />
    </div>

    <LogDetails v-model:log="selectedLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { LogEntry, WsServerMessage } from '../../shared/types';
import { UBadge, UButton, UTable } from '#components';
import LogDetails from '../components/LogDetails.vue';

const logs = ref<LogEntry[]>([]);
const selectedLog = ref<LogEntry | null>(null);

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
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }: any) => {
      const method = row.original.method as string;
      return h(UBadge, {
        color: getMethodColor(method),
        variant: 'subtle',
        label: method,
      });
    },
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }: any) => h('span', { class: 'truncate max-w-md block font-mono text-xs' }, row.original.url),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => {
      const status = row.original.status as number;
      return h('span', { class: getStatusColor(status) }, status);
    },
  },
  {
    accessorKey: 'duration',
    header: 'Time',
    cell: ({ row }: any) => `${row.original.duration}ms`,
  },
  {
    accessorKey: 'request.timestamp',
    header: 'Timestamp',
    cell: ({ row }: any) => {
      const ts = row.original.request?.timestamp;
      return ts ? new Date(ts).toLocaleTimeString() : '-';
    },
  },
];

function onRowClick(_: any, row: any) {
  selectedLog.value = row.original;
}

function clearLogs() {
  send('CLEAR_LOGS');
}

function getMethodColor(method: string | undefined) {
  if (!method) return 'neutral';
  const m = method.toUpperCase();
  if (m === 'GET') return 'info';
  if (m === 'POST') return 'success';
  if (m === 'PUT' || m === 'PATCH') return 'warning';
  if (m === 'DELETE') return 'error';
  return 'neutral';
}

function getStatusColor(status: number | undefined) {
  if (status === undefined) return 'text-muted';
  if (status >= 200 && status < 300) return 'text-success';
  if (status >= 400) return 'text-error';
  if (status >= 300) return 'text-warning';
  return 'text-muted';
}
</script>

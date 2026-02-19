<template>
  <USlideover
    v-model:open="isOpen"
    title="Request Details"
    description="Full information about the HTTP call"
    :ui="{ body: 'p-0' }"
  >
    <template #body>
      <div v-if="log" class="flex flex-col h-full overflow-hidden">
        <div class="p-4 border-b border-muted">
          <div class="flex items-center gap-2 mb-2">
            <UBadge :color="getMethodColor(log.method)" variant="subtle">
              {{ log.method }}
            </UBadge>
            <span class="font-mono text-sm truncate">{{ log.url }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-muted">
            <span :class="getStatusColor(log.status)">Status: {{ log.status }}</span>
            <span>Duration: {{ log.duration }}ms</span>
            <span>{{ new Date(log.request.timestamp).toLocaleString() }}</span>
          </div>
        </div>

        <UTabs :items="tabs" class="flex-1 overflow-hidden" :ui="{ content: 'p-4 overflow-auto h-full' }">
          <template #request-headers>
            <pre class="text-xs font-mono">{{ JSON.stringify(log.request.headers, null, 2) }}</pre>
          </template>
          <template #request-body>
            <pre class="text-xs font-mono">{{ formatBody(log.request.body) }}</pre>
          </template>
          <template #response-headers>
            <pre class="text-xs font-mono">{{ JSON.stringify(log.response.headers, null, 2) }}</pre>
          </template>
          <template #response-body>
            <pre class="text-xs font-mono">{{ formatBody(log.response.body) }}</pre>
          </template>
        </UTabs>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LogEntry } from '../../shared/types';
import { UBadge, USlideover, UTabs } from '#components';

const props = defineProps<{
  log: LogEntry | null;
}>();

const emit = defineEmits<{
  'update:log': [value: LogEntry | null];
}>();

const isOpen = computed({
  get: () => !!props.log,
  set: (value) => {
    if (!value) emit('update:log', null);
  },
});

const tabs = [
  { label: 'Request Headers', slot: 'request-headers' },
  { label: 'Request Body', slot: 'request-body' },
  { label: 'Response Headers', slot: 'response-headers' },
  { label: 'Response Body', slot: 'response-body' },
];

function getMethodColor(method: string) {
  const m = method.toUpperCase();
  if (m === 'GET') return 'info';
  if (m === 'POST') return 'success';
  if (m === 'PUT' || m === 'PATCH') return 'warning';
  if (m === 'DELETE') return 'error';
  return 'neutral';
}

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-success';
  if (status >= 400) return 'text-error';
  if (status >= 300) return 'text-warning';
  return 'text-muted';
}

function formatBody(body: any) {
  if (typeof body === 'string') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
}
</script>

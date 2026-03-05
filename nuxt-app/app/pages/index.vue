<template>
  <div class="h-full flex flex-col p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold">HTTP Logs</h1>
        <UBadge
          :color="status === 'OPEN' ? 'success' : 'error'"
          variant="subtle"
          size="sm"
        >
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
        <span
          class="text-xs text-muted-foreground"
          title="Это dev-инструмент, данные не сохраняются между перезапусками."
        >
          In-memory dev logger (no persistence)
        </span>
        <UDropdownMenu
          :items="columnOptions"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-columns-3"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </UDropdownMenu>
      </div>
    </div>

    <LogFilters
      v-model="filters"
      class="mb-4 rounded-lg border border-muted"
    />

    <div class="flex-1 overflow-auto border border-muted rounded-lg">
      <UTable
        v-model:column-visibility="columnVisibility"
        :data="groupedLogs"
        :columns="columns"
        resizable
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        class="w-full"
        :on-select="onRowClick"
      >
        <template #method-cell="{ row }">
          <template v-if="row.original.kind === 'bff'">
            <UBadge
              :color="getMethodColor(row.original.log.method)"
              variant="subtle"
              class="uppercase w-16 justify-center"
            >
              {{ row.original.log.method }}
            </UBadge>
          </template>
          <template v-else>
            <div class="flex items-center gap-1 pl-4">
              <UIcon
                name="i-lucide-corner-down-right"
                class="size-3 text-muted-foreground"
              />
              <UBadge
                v-if="row.original.axios.method"
                :color="getMethodColor(row.original.axios.method)"
                variant="subtle"
                size="sm"
                class="uppercase text-[10px] w-14 justify-center py-0"
              >
                {{ row.original.axios.method }}
              </UBadge>
              <span
                v-else
                class="font-mono uppercase text-[10px] text-muted-foreground"
              >axios</span>
            </div>
          </template>
        </template>

        <template #status-cell="{ row }">
          <template v-if="row.original.kind === 'bff'">
            <span
              :class="getStatusColor(row.original.log.status)"
              class="font-mono text-sm"
            >
              {{ row.original.log.status }}
            </span>
          </template>
          <template v-else>
            <span
              class="font-mono text-sm"
              :class="getStatusColor(row.original.axios.code)"
            >
              {{ row.original.axios.code }}
            </span>
          </template>
        </template>

        <template #url-cell="{ row }">
          <template v-if="row.original.kind === 'bff'">
            <span
              class="truncate block font-mono text-sm"
              :title="row.original.log.url"
            >
              {{ row.original.log.url }}
            </span>
          </template>
          <template v-else>
            <span
              class="truncate block font-mono text-sm pl-8 border-l border-muted/40"
              :title="row.original.axios.url"
            >
              {{ row.original.axios.url }}
            </span>
          </template>
        </template>

        <template #duration-cell="{ row }">
          <template v-if="row.original.kind === 'bff'">
            <span class="text-sm text-muted-foreground">{{ row.original.log.duration }}ms</span>
          </template>
          <template v-else>
            <span class="text-sm text-muted-foreground">-</span>
          </template>
        </template>

        <template #request-timestamp-cell="{ row }">
          <template v-if="row.original.kind === 'bff'">
            <span class="text-sm text-muted-foreground">
              {{ formatTime(row.original.log.request?.timestamp) }}
            </span>
          </template>
          <template v-else>
            <span class="text-sm text-muted-foreground">
              {{ formatTime(row.original.axios.timestamp) }}
            </span>
          </template>
        </template>
      </UTable>
    </div>

    <LogDetails v-model:log="selectedLog" :axios-log="(selectedAxiosLog as AxiosRequestMeta | null)"/>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { AxiosRequestMeta, LogEntry } from '../../shared/types';
import { UBadge, UButton, UIcon, UTable } from '#components';
import LogDetails from '../components/LogDetails.vue';
import LogFilters from '../components/LogFilters.vue';
import { getMethodColor, getStatusColor } from '../utils/colors';
import { formatTime } from '../utils/format';

// Composables
import { useLogs } from '../composables/useLogs';
import { useLogFilters } from '../composables/useLogFilters';
import { useGroupedLogs, type GroupedRow } from '../composables/useGroupedLogs';

const { logs, status, clearLogs } = useLogs();
const { filters, filteredLogs } = useLogFilters(logs);
const { groupedLogs } = useGroupedLogs(filteredLogs);

const columnVisibility = ref<Record<string, boolean>>({
  method: true,
  url: true,
  status: true,
  duration: true,
  'request.timestamp': true
});

const columns = [
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'url', header: 'URL' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'duration', header: 'Time' },
  { accessorKey: 'request.timestamp', header: 'Timestamp' },
];

const columnOptions = computed(() => [
  columns.map(col => ({
    label: col.header,
    type: 'checkbox' as const,
    checked: columnVisibility.value[col.accessorKey] ?? true,
    onUpdateChecked: (checked: boolean) => {
      columnVisibility.value[col.accessorKey] = checked;
    }
  }))
]);

const selectedLog = ref<LogEntry | null>(null);
const selectedAxiosLog = ref<AxiosRequestMeta | null>(null);

interface TableRow<T> {
  original: T;
  getValue: (key: string) => any;
}

function onRowClick(_: any, row: TableRow<GroupedRow>) {
  selectedLog.value = row.original.kind === 'bff' ? row.original.log : row.original.parent;
  selectedAxiosLog.value = row.original.kind === 'axios' ? row.original.axios : null;
}
</script>

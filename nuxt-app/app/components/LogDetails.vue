<template>
  <USlideover
    v-model:open="isOpen"
    title="Request Details"
    description="Full information about the HTTP call"
    :ui="{ body: 'p-0' }"
  >
    <template #body>
      <div
        v-if="log"
        class="flex flex-col h-full overflow-hidden"
      >
        <div class="p-4 border-b border-muted">
          <div class="flex items-center gap-2 mb-2">
            <UBadge
              :color="getMethodColor(log.method)"
              variant="subtle"
              class="uppercase"
            >
              {{ log.method }}
            </UBadge>
            <span class="font-mono text-sm truncate">{{ log.url }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-muted">
            <span :class="getStatusColor(log.status)">Status: {{ log.status }}</span>
            <span>Duration: {{ log.duration }}ms</span>
            <span v-if="log.request?.timestamp">{{ formatDateTime(log.request.timestamp) }}</span>
          </div>
          <div
            v-if="log.userId || log.traceId || log.bffPath"
            class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground/60 font-mono"
          >
            <span
              v-if="log.userId"
              title="User ID"
            >UID: {{ log.userId }}</span>
            <span
              v-if="log.traceId"
              title="Trace ID"
            >TID: {{ log.traceId }}</span>
            <span
              v-if="log.bffPath"
              title="BFF Path"
            >BFF: {{ log.bffPath }}</span>
            <span
              v-if="log.source"
              title="Source"
            >SRC: {{ log.source }}</span>
        </div>
      </div>

      <div class="px-4 py-2 border-b border-muted bg-elevated/20">
        <UInput
          v-model="detailsSearch"
          icon="i-lucide-search"
          placeholder="Search in JSON..."
          size="sm"
          class="w-full"
        />
      </div>

      <UTabs
        :items="tabs"
        class="flex-1 overflow-hidden"
        :ui="{ content: 'p-4 overflow-auto h-full' }"
      >
        <template #headers>
          <div class="space-y-4">
            <div>
              <p class="text-[10px] font-bold text-muted uppercase mb-1">Request Headers</p>
              <JsonViewer
                :value="log.request?.headers"
                :search="detailsSearch"
              />
            </div>
            <USeparator />
            <div>
              <p class="text-[10px] font-bold text-muted uppercase mb-1">Response Headers</p>
              <JsonViewer
                :value="formatBody(log.response?.headers)"
                :search="detailsSearch"
              />
            </div>
          </div>
        </template>
        <template #request-body>
          <JsonViewer
            :value="formatBody(log.request?.body)"
            :search="detailsSearch"
          />
        </template>

        <template #response-body>
          <JsonViewer
            :value="formatBody(log.response?.body)"
            :search="detailsSearch"
          />
        </template>

        <template #axios v-if="axiosLog">
          <JsonViewer
            :value="formatBody(axiosLog)"
            :search="detailsSearch"
          />
        </template>
      </UTabs>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AxiosRequestMeta, LogEntry } from '../../shared/types'
import { UBadge, USlideover, UTabs, UInput, USeparator } from '#components'
import JsonViewer from './JsonViewer.vue'

import { getMethodColor, getStatusColor } from '../utils/colors'
import { formatDateTime } from '../utils/format'

const props = defineProps<{
  log: LogEntry | null
  axiosLog: AxiosRequestMeta | null | undefined
}>()

const emit = defineEmits<{
  'update:log': [value: LogEntry | null]
}>()

const detailsSearch = ref('')

const isOpen = computed({
  get: () => !!props.log,
  set: (value) => {
    if (!value) emit('update:log', null)
  }
})

const tabs = [
  { label: 'Headers', slot: 'headers' },
  { label: 'Body', slot: 'request-body' },
  { label: 'Response', slot: 'response-body' },
  { label: 'Axios Response', slot: 'axios' }
]

function formatBody(body: any) {
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }
  return body
}
</script>

<style>
:root {
  --container-md: 700px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { UInput, USelectMenu, UButton, UBadge } from '#components'
import type { LogFiltersState } from '../../shared/types'

const props = defineProps<{
  modelValue: LogFiltersState
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: LogFiltersState): void
}>()

const filters = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

// Удобное объявление фильтров в одном месте
const FILTER_CONFIG = {
  methods: [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'PATCH', value: 'PATCH' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'HEAD', value: 'HEAD' },
    { label: 'OPTIONS', value: 'OPTIONS' }
  ],
  statuses: [
    { label: '2xx Success', value: '2' },
    { label: '3xx Redirection', value: '3' },
    { label: '4xx Client Error', value: '4' },
    { label: '5xx Server Error', value: '5' }
  ]
}

function reset() {
  emit('update:modelValue', {
    search: '',
    methods: [],
    statuses: []
  })
}

const hasFilters = computed(() => {
  return filters.value.search || filters.value.methods.length > 0 || filters.value.statuses.length > 0
})

// Хелперы для отображения выбранных значений
const methodsLabel = computed(() => {
  if (filters.value.methods.length === 0) return 'All Methods'
  if (filters.value.methods.length === 1) return filters.value.methods[0]
  return `Methods (${filters.value.methods.length})`
})

const statusesLabel = computed(() => {
  if (filters.value.statuses.length === 0) return 'All Statuses'
  if (filters.value.statuses.length === 1) {
    return FILTER_CONFIG.statuses.find(s => s.value === filters.value.statuses[0])?.label || '1 selected'
  }
  return `Statuses (${filters.value.statuses.length})`
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 p-4 border-b border-muted bg-elevated/50">
    <div class="flex items-center gap-2">
      <UInput
        v-model="filters.search"
        icon="i-lucide-search"
        placeholder="Search URL..."
        class="w-64"
        size="sm"
      />
    </div>

    <div class="flex items-center gap-2">
      <USelectMenu
        v-model="filters.methods"
        multiple
        :items="FILTER_CONFIG.methods"
        value-attribute="value"
        placeholder="Methods"
        class="w-44"
        size="sm"
      >
        <template #default="{ open }">
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            class="w-full justify-between"
            :label="methodsLabel"
            :icon-trailing="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          />
        </template>
      </USelectMenu>
    </div>

    <div class="flex items-center gap-2">
      <USelectMenu
        v-model="filters.statuses"
        multiple
        :items="FILTER_CONFIG.statuses"
        value-attribute="value"
        placeholder="Statuses"
        class="w-48"
        size="sm"
      >
        <template #default="{ open }">
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            class="w-full justify-between"
            :label="statusesLabel"
            :icon-trailing="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          />
        </template>
      </USelectMenu>
    </div>

    <div
      v-if="hasFilters"
      class="flex items-center gap-2 ml-auto"
    >
      <UButton
        icon="i-lucide-x"
        label="Reset Filters"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="reset"
      />
    </div>
  </div>
</template>

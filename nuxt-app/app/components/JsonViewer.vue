<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UIcon, UCollapsible } from '#components'

const props = defineProps<{
  value: any
  depth?: number
  search?: string
}>()

const currentDepth = computed(() => props.depth || 0)
const isExpanded = ref(currentDepth.value < 2)

const isObject = computed(() => props.value !== null && typeof props.value === 'object')
const isArray = computed(() => Array.isArray(props.value))

const keys = computed(() => {
  if (!isObject.value) return []
  return Object.keys(props.value)
})

function formatValue(val: any): string {
  if (val === null) return 'null'
  if (typeof val === 'string') return `"${val}"`
  return String(val)
}

function getValueColor(val: any): string {
  if (val === null) return 'text-gray-400'
  if (typeof val === 'string') return 'text-green-500'
  if (typeof val === 'number') return 'text-blue-500'
  if (typeof val === 'boolean') return 'text-orange-500'
  return 'text-default'
}

const hasMatch = computed(() => {
  if (!props.search) return false
  const str = JSON.stringify(props.value).toLowerCase()
  return str.includes(props.search.toLowerCase())
})

// Auto-expand if there's a match
watch(() => props.search, (newSearch) => {
  if (newSearch && hasMatch.value) {
    isExpanded.value = true
  }
})
</script>

<template>
  <div class="font-mono text-xs">
    <template v-if="isObject">
      <div class="flex items-start gap-1">
        <button
          class="mt-0.5 hover:bg-elevated rounded p-0.5 transition-colors"
          @click="isExpanded = !isExpanded"
        >
          <UIcon
            :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-muted"
          />
        </button>
        <span class="text-muted">{{ isArray ? '[' : '{' }}</span>
        <span v-if="!isExpanded" class="text-muted">...{{ isArray ? ']' : '}' }}</span>
      </div>

      <UCollapsible v-model:open="isExpanded">
        <div class="pl-4 border-l border-muted/20 ml-1.5 mt-1 space-y-1">
          <div v-for="key in keys" :key="key" class="flex flex-wrap gap-x-1">
            <span class="text-purple-500">"{{ key }}":</span>
            <JsonViewer
              :value="value[key]"
              :depth="currentDepth + 1"
              :search="search"
            />
          </div>
        </div>
        <div class="text-muted ml-4">{{ isArray ? ']' : '}' }}</div>
      </UCollapsible>
    </template>

    <template v-else>
      <span
        :class="[
          getValueColor(value),
          search && String(value).toLowerCase().includes(search.toLowerCase()) ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50' : ''
        ]"
      >
        {{ formatValue(value) }}
      </span>
    </template>
  </div>
</template>

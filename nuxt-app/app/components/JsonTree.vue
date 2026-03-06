<template>
  <div class="space-y-0.5 text-default">
    <!-- Row: indent by level, then fixed-width toggle column, then content -->
    <div
      class="flex items-start gap-1"
      :style="{ paddingLeft: `${level * indentPerLevel}rem` }"
    >
      <div class="flex w-4 shrink-0 items-center justify-center">
        <button
          v-if="expandable"
          type="button"
          class="inline-flex size-4 items-center justify-center rounded text-muted hover:bg-muted/50 hover:text-default"
          :aria-label="open ? 'Свернуть' : 'Развернуть'"
          @click="open = !open"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="size-3 shrink-0 transition-transform duration-150"
            :class="{ 'rotate-90': open }"
          />
        </button>
      </div>

      <div class="min-w-0 flex-1">
        <template v-if="label">
          <span class="text-info break-all">{{ label }}</span>
          <span class="text-muted">:</span>
        </template>

        <template v-if="!expandable">
          <span
            class="break-all"
            :class="{
              'text-emerald-500': typeName === 'string',
              'text-blue-400': typeName === 'number',
              'text-orange-400': typeName === 'boolean',
              'text-pink-400': typeName === 'null',
            }"
          >
            {{ primitivePreview }}
          </span>
        </template>

        <template v-else>
          <span class="text-muted">
            {{ isArray ? '[' : '{' }}
            <span v-if="entries.length">
              {{ ' ' + entries.length + ' ' + (isArray ? 'items' : 'keys') }}
            </span>
            {{ isArray ? ']' : '}' }}
          </span>
        </template>
      </div>
    </div>

    <div v-if="expandable && open" class="space-y-0.5">
      <JsonTree
        v-for="child in entries"
        :key="child.key"
        :label="child.key"
        :value="child.value"
        :level="level + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({
  name: 'JsonTree',
})

const props = defineProps<{
  value: unknown
  label?: string
  level?: number
}>()

const indentPerLevel = 1

const level = computed(() => props.level ?? 0)

const isArray = computed(() => Array.isArray(props.value))
const isObject = computed(
  () =>
    props.value !== null &&
    typeof props.value === 'object' &&
    !Array.isArray(props.value)
)
const expandable = computed(() => isArray.value || isObject.value)
const open = ref(true)

const entries = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((v, index) => ({
      key: String(index),
      value: v,
    }))
  }
  if (isObject.value) {
    return Object.entries(
      props.value as Record<string, unknown>
    ).map(([key, value]) => ({ key, value }))
  }
  return []
})

const typeName = computed(() => {
  if (props.value === null) return 'null'
  if (Array.isArray(props.value)) return 'array'
  if (typeof props.value === 'object') return 'object'
  return typeof props.value
})

const primitivePreview = computed(() => {
  const v = props.value as unknown
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
})
</script>


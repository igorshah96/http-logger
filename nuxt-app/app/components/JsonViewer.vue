<template>
  <div class="flex flex-col gap-2 font-mono text-xs">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex rounded-lg border border-muted bg-elevated p-0.5">
        <UButton
          :variant="viewMode === 'raw' ? 'solid' : 'ghost'"
          size="xs"
          class="min-w-0 rounded-md"
          @click="viewMode = 'raw'"
        >
          Сырой
        </UButton>
        <UButton
          :variant="viewMode === 'transformed' ? 'solid' : 'ghost'"
          size="xs"
          class="min-w-0 rounded-md"
          @click="viewMode = 'transformed'"
        >
          Преобразованный
        </UButton>
      </div>
      <UButton
        variant="ghost"
        size="xs"
        :aria-label="copied ? 'Скопировано' : 'Копировать'"
        @click="copyText"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          class="size-4"
        />
      </UButton>
      <template v-if="!standalone">
        <UButton
          variant="ghost"
          size="xs"
          aria-label="Открыть на весь экран"
          @click="fullscreenOpen = true"
        >
          <UIcon name="i-lucide-maximize" class="size-4" />
        </UButton>
      </template>
      <template v-else>
        <UButton
          variant="ghost"
          size="xs"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <UIcon name="i-lucide-x" class="size-4" />
        </UButton>
      </template>
    </div>

    <!-- Content -->
    <div
      class="min-h-0 flex-1 overflow-auto rounded-lg border border-muted bg-elevated p-3"
    >
      <template v-if="viewMode === 'raw'">
        <pre
          v-if="rawText"
          class="whitespace-pre-wrap break-words text-default"
        ><template
          v-for="(part, i) in rawParts"
          :key="i"
        ><span
          v-if="part.match"
          class="bg-warning/20 ring-1 ring-warning/50"
          data-testid="search-highlight"
        >{{ part.text }}</span><template v-else>{{ part.text }}</template></template></pre>
        <span
          v-else
          class="text-muted"
        >Нет данных</span>
      </template>
      <template v-else>
        <template v-if="isTreeable">
          <Vue3JsonViewer
            :value="value"
            :theme="isDark ? 'dark' : 'light'"
            copyable
            boxed
            sort
            class="vjv-custom"
          />
        </template>
        <template v-else>
          <pre class="whitespace-pre-wrap break-words text-default">{{ rawText || 'Нет данных' }}</pre>
        </template>
      </template>
    </div>

    <!-- Fullscreen modal -->
    <UModal
      v-if="!standalone"
      v-model:open="fullscreenOpen"
      :ui="{
        content: 'w-screen h-screen max-w-none max-h-none m-0 rounded-none',
        body: 'p-4 h-full overflow-auto',
      }"
    >
      <template #body>
        <JsonViewer
          :value="value"
          :search="search"
          :initial-view-mode="viewMode"
          standalone
          @close="fullscreenOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { JsonViewer as Vue3JsonViewer } from 'vue3-json-viewer'
import 'vue3-json-viewer/dist/vue3-json-viewer.css'

const props = withDefaults(
  defineProps<{
    value: any
    search?: string
    standalone?: boolean
    initialViewMode?: 'raw' | 'transformed'
  }>(),
  { standalone: false }
)

const emit = defineEmits<{
  close: []
}>()

const viewMode = ref<'raw' | 'transformed'>(
  props.initialViewMode ?? 'raw'
)

watch(
  () => props.initialViewMode,
  (v) => {
    if (v) viewMode.value = v
  },
  { immediate: true }
)

const fullscreenOpen = ref(false)

const rawText = computed(() => {
  const v = props.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  if (typeof v === 'string') return v
  return String(v)
})

const isTreeable = computed(
  () =>
    props.value !== null &&
    typeof props.value === 'object' &&
    !(props.value instanceof Date) &&
    !(props.value instanceof RegExp)
)

const rawParts = computed(() => {
  const text = rawText.value
  const q = props.search?.trim()
  if (!q || !text) return [{ match: false, text }]
  const lower = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const out: { match: boolean; text: string }[] = []
  let start = 0
  let i = lower.indexOf(lowerQ, start)
  while (i !== -1) {
    if (i > start) {
      out.push({ match: false, text: text.slice(start, i) })
    }
    out.push({ match: true, text: text.slice(i, i + q.length) })
    start = i + q.length
    i = lower.indexOf(lowerQ, start)
  }
  if (start < text.length) {
    out.push({ match: false, text: text.slice(start) })
  }
  return out
})

const { copy, copied } = useClipboard({ copiedDuring: 2000 })
const toast = useToast()

function copyText() {
  copy(rawText.value)
  toast.add({
    title: 'Скопировано',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

const isDark = computed(() => {
  if (import.meta.client && typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark')
  }
  return false
})
</script>

<style>
.vjv-custom {
  --jv-background-color: transparent;
  --jv-font-family: ui-monospace, monospace;
  --jv-font-size: 0.75rem;
}
</style>

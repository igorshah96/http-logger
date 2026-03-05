<template>
  <div class="font-mono text-xs">
    <template v-if="isObject">
      <span class="text-muted">{{ isArray ? '[' : '{' }}</span>
      <div class="pl-4 border-l border-muted/20 ml-1.5 mt-1 space-y-1">
        <div
          v-for="key in keys"
          :key="key"
          class="flex flex-wrap gap-x-1"
        >
          <span class="text-purple-500">"{{ key }}":</span>
          <JsonViewer
            :value="value[key]"
            :search="search"
          />
        </div>
        <span class="text-muted">{{ isArray ? ']' : '}' }}</span>
      </div>
    </template>

    <template v-else>
      <span
        :class="[
          getValueColor(value),
          search && String(value).toLowerCase().includes(search.toLowerCase()) ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50' : '',
        ]"
      >
        {{ formatValue(value) }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: any;
  search?: string;
}>();

const isObject = computed(() => props.value !== null && typeof props.value === 'object');
const isArray = computed(() => Array.isArray(props.value));

const keys = computed(() => {
  if (!isObject.value) return [];
  return Object.keys(props.value);
});

function formatValue(val: any): string {
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

function getValueColor(val: any): string {
  if (val === null) return 'text-gray-400';
  if (typeof val === 'string') return 'text-green-500';
  if (typeof val === 'number') return 'text-blue-500';
  if (typeof val === 'boolean') return 'text-orange-500';
  return 'text-default';
}
</script>

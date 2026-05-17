<template>
  <svg
    :width="resolvedSize"
    :height="resolvedSize"
    viewBox="0 0 24 24"
    class="app-icon"
    :style="color && color !== 'currentColor' ? `color: ${color}` : undefined"
    aria-hidden="true"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as icons from '@/utils/icons'

const props = defineProps<{
  icon: string
  size?: number | string
  color?: string
}>()

const resolvedSize = computed(() => props.size ?? 24)

const path = computed(() => {
  const key = 'mdi' + props.icon
    .replace(/^mdi-/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return (icons as Record<string, string>)[key] ?? ''
})
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>

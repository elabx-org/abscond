<template>
  <v-bottom-sheet v-model="open" :scrim="true">
    <div
      class="hist-sheet"
      :style="{
        transform: `translateY(${dragY}px)`,
        transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }"
    >
      <div
        class="drag-handle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <div class="hist-header">
        <p class="hist-title">Playback History</p>
        <p class="hist-sub">{{ itemTitle }}</p>
      </div>

      <div v-if="loading" class="hist-loading">
        <AppIcon icon="mdi-loading" :size="18" color="rgba(255,255,255,0.3)" class="spin" />
        <span>Loading…</span>
      </div>
      <div v-else-if="!sessions.length" class="hist-empty">
        <AppIcon icon="mdi-history" :size="28" color="rgba(255,255,255,0.1)" />
        <p>No listening sessions recorded</p>
      </div>
      <div v-else class="hist-list">
        <div v-for="s in sessions" :key="s.id" class="hist-row">
          <div class="hist-row-date">{{ formatDate(s.startedAt) }}</div>
          <div class="hist-row-detail">
            <span class="hist-row-dur">{{ formatDuration(s.duration) }}</span>
            <span v-if="s.deviceInfo?.deviceName" class="hist-row-device">{{ s.deviceInfo.deviceName }}</span>
          </div>
        </div>
      </div>
    </div>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, watch } from 'vue'
import { getItemListeningSessions, type ListeningSession } from '@/api/stats'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

const props = defineProps<{
  modelValue: boolean
  itemId: string
  itemTitle: string
}>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()
const open = ref(props.modelValue)
watch(open, v => emit('update:modelValue', v))

function close() { emit('update:modelValue', false) }
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)

const sessions = ref<ListeningSession[]>([])
const loading  = ref(false)

watch(() => props.modelValue, async (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
  open.value = v
  if (!v) return
  loading.value = true
  sessions.value = []
  try {
    sessions.value = await getItemListeningSessions(props.itemId)
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
</script>

<style scoped>
.hist-sheet {
  background: #1a1a1a; border-radius: 20px 20px 0 0;
  padding: 12px 16px 40px; max-height: 65vh; overflow-y: auto;
}
.drag-handle {
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}
.hist-header { margin-bottom: 16px; }
.hist-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
.hist-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-loading { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.3); font-size: 12px; padding: 12px 0; }
.hist-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; color: rgba(255,255,255,0.3); font-size: 12px; }
.hist-empty p { margin: 0; }
.hist-list { display: flex; flex-direction: column; }
.hist-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.hist-row:last-child { border-bottom: none; }
.hist-row-date { font-size: 12px; color: rgba(255,255,255,0.65); }
.hist-row-detail { display: flex; align-items: center; gap: 8px; }
.hist-row-dur { font-size: 12px; font-weight: 600; color: #d4a017; font-variant-numeric: tabular-nums; }
.hist-row-device { font-size: 10px; color: rgba(255,255,255,0.3); }
</style>

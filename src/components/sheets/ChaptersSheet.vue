<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="ch-overlay" @click.self="close">
        <div class="ch-sheet">

          <!-- Header -->
          <div class="ch-header">
            <div class="ch-drag-handle" />
            <div class="ch-header-row">
              <div class="ch-header-left">
                <span class="ch-title">Chapters</span>
                <span v-if="editChapters.length" class="ch-count-badge">{{ editChapters.length }} chapters</span>
              </div>
              <div class="ch-header-right">
                <button
                  class="ch-save-btn"
                  :disabled="!isDirty || saving"
                  @click="save"
                >
                  <v-icon v-if="saving" size="12" class="ch-spin">mdi-loading</v-icon>
                  {{ saving ? 'Saving…' : 'Save' }}
                </button>
                <button class="ch-close-btn" @click="close">
                  <v-icon size="16">mdi-close</v-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Chapter list -->
          <div class="ch-list">

            <!-- Skeleton loader -->
            <template v-if="loading">
              <div v-for="n in 3" :key="n" class="ch-skeleton" />
            </template>

            <!-- Rows -->
            <template v-else>
              <div
                v-for="(ch, idx) in editChapters"
                :key="ch.id"
                class="ch-row"
                @mouseenter="hoveredIdx = idx"
                @mouseleave="hoveredIdx = null"
              >
                <!-- Seek button -->
                <button class="ch-seek-btn" :title="`Seek to chapter ${idx + 1}`" @click="emit('seek', ch.start)">
                  <v-icon size="14" color="#d4a017">mdi-play</v-icon>
                </button>

                <!-- Chapter number -->
                <span class="ch-num">#{{ idx + 1 }}</span>

                <!-- Title input -->
                <input
                  v-model="ch.title"
                  class="ch-title-input"
                  :placeholder="`Chapter ${idx + 1}`"
                  @input="markDirty"
                />

                <!-- Start time input -->
                <input
                  :value="secsToStr(ch.start)"
                  class="ch-time-input"
                  @focus="($event.target as HTMLInputElement).select()"
                  @blur="onStartBlur(idx, ($event.target as HTMLInputElement).value)"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                />

                <!-- Delete button -->
                <button
                  class="ch-delete-btn"
                  :class="{ visible: hoveredIdx === idx }"
                  :title="`Delete chapter ${idx + 1}`"
                  @click="deleteChapter(idx)"
                >
                  <v-icon size="14">mdi-close</v-icon>
                </button>
              </div>

              <!-- Empty state -->
              <div v-if="!editChapters.length" class="ch-empty">
                No chapters. Add one below.
              </div>
            </template>
          </div>

          <!-- Add chapter button -->
          <button class="ch-add-btn" :disabled="loading" @click="addChapter">
            <v-icon size="16">mdi-plus</v-icon>
            Add Chapter
          </button>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api/client'
import { useNotificationStore } from '@/stores/notifications'
import type { Chapter } from '@/api/types'

const props = defineProps<{
  modelValue: boolean
  itemId: string
  totalDuration: number
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  updated: []
  seek: [time: number]
}>()

const notify = useNotificationStore()

const loading      = ref(false)
const saving       = ref(false)
const isDirty      = ref(false)
const editChapters = ref<Chapter[]>([])
const hoveredIdx   = ref<number | null>(null)

// ── Time helpers ──────────────────────────────────────────────────────────────

function secsToStr(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

function strToSecs(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(str) || 0
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadChapters() {
  loading.value = true
  isDirty.value = false
  editChapters.value = []
  try {
    const res = await api.get(`/items/${props.itemId}?expanded=1`)
    const raw: Chapter[] = res.data?.media?.chapters ?? []
    editChapters.value = raw.map(ch => ({ ...ch }))
  } catch {
    notify.show('Failed to load chapters', 'error')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => { if (v) loadChapters() },
  { immediate: true },
)

// ── Editing helpers ───────────────────────────────────────────────────────────

function markDirty() {
  isDirty.value = true
}

function recalcEndTimes() {
  for (let i = 0; i < editChapters.value.length; i++) {
    const next = editChapters.value[i + 1]
    editChapters.value[i].end = next ? next.start : props.totalDuration
  }
}

function onStartBlur(idx: number, raw: string) {
  const newStart = strToSecs(raw)
  editChapters.value[idx].start = newStart
  // Update end of the previous chapter to match this chapter's new start
  if (idx > 0) {
    editChapters.value[idx - 1].end = newStart
  }
  markDirty()
}

function addChapter() {
  const chapters = editChapters.value
  const lastEnd  = chapters.length ? chapters[chapters.length - 1].end : 0
  const nextId   = chapters.length ? Math.max(...chapters.map(c => c.id)) + 1 : 0
  chapters.push({
    id:    nextId,
    start: lastEnd,
    end:   props.totalDuration,
    title: '',
  })
  recalcEndTimes()
  markDirty()
}

function deleteChapter(idx: number) {
  editChapters.value.splice(idx, 1)
  recalcEndTimes()
  markDirty()
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  saving.value = true
  try {
    await api.patch(`/items/${props.itemId}/chapters`, { chapters: editChapters.value })
    isDirty.value = false
    emit('updated')
    notify.show('Chapters saved', 'success')
    close()
  } catch {
    notify.show('Failed to save chapters', 'error')
  } finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ───────────────────────────────────────────────────────────────── */
.ch-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
}

/* ── Sheet panel ───────────────────────────────────────────────────────────── */
.ch-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  max-height: 92vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}

@media (min-width: 520px) {
  .ch-sheet {
    position: absolute; right: 0; top: 0; bottom: 0;
    left: auto;
    width: min(480px, 100%);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0;
    border-top: none;
    max-height: 100%;
  }
}

/* ── Drag handle (mobile only) ─────────────────────────────────────────────── */
.ch-drag-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
  margin: 10px auto 0;
}

@media (min-width: 520px) {
  .ch-drag-handle { display: none; }
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.ch-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding-bottom: 12px;
}

.ch-header-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px 0;
  gap: 10px;
}

.ch-header-left {
  display: flex; align-items: center; gap: 8px; min-width: 0;
}

.ch-title {
  font-size: 15px; font-weight: 700; color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
}

.ch-count-badge {
  font-size: 10px; font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px 8px;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
}

.ch-header-right {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}

.ch-save-btn {
  background: #d4a017; color: #111;
  border: none; border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px; font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  display: flex; align-items: center; gap: 5px;
  transition: opacity 0.15s;
}

.ch-save-btn:disabled {
  opacity: 0.35; cursor: not-allowed;
}

.ch-close-btn {
  background: rgba(255, 255, 255, 0.08); border: none;
  border-radius: 50%; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

/* ── Chapter list (scrollable) ─────────────────────────────────────────────── */
.ch-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
}

.ch-list::-webkit-scrollbar { display: none; }

/* ── Chapter row ───────────────────────────────────────────────────────────── */
.ch-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* ── Seek button ───────────────────────────────────────────────────────────── */
.ch-seek-btn {
  background: transparent; border: none;
  cursor: pointer; padding: 4px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.ch-seek-btn:hover { opacity: 1; }

/* ── Chapter number badge ──────────────────────────────────────────────────── */
.ch-num {
  font-size: 10px; color: rgba(255, 255, 255, 0.3);
  width: 24px; text-align: right; flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ── Title input ───────────────────────────────────────────────────────────── */
.ch-title-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 6px;
  font-size: 13px; color: rgba(255, 255, 255, 0.85);
  outline: none;
  min-width: 0;
  font-family: inherit;
  transition: border-bottom-color 0.15s;
}

.ch-title-input::placeholder { color: rgba(255, 255, 255, 0.2); }

.ch-title-input:focus {
  border-bottom-color: #d4a017;
}

/* ── Time input ────────────────────────────────────────────────────────────── */
.ch-time-input {
  width: 68px; flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 11px; color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.ch-time-input:focus {
  border-color: rgba(212, 160, 23, 0.4);
}

/* ── Delete button ─────────────────────────────────────────────────────────── */
.ch-delete-btn {
  background: transparent; border: none;
  cursor: pointer; padding: 4px;
  flex-shrink: 0;
  color: rgba(255, 80, 80, 0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.ch-delete-btn.visible { opacity: 1; }

/* Always show on touch devices (no hover) */
@media (hover: none) {
  .ch-delete-btn { opacity: 1; }
}

.ch-delete-btn:hover { color: rgba(255, 80, 80, 0.9); }

/* ── Skeleton loader ───────────────────────────────────────────────────────── */
.ch-skeleton {
  height: 44px; margin: 0 16px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    #1a1a1a 25%,
    #222 50%,
    #1a1a1a 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
.ch-empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.25);
}

/* ── Add chapter button ────────────────────────────────────────────────────── */
.ch-add-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px;
  color: rgba(212, 160, 23, 0.7);
  background: transparent; border: none;
  cursor: pointer; font-size: 13px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-family: inherit;
  transition: color 0.15s;
}

.ch-add-btn:hover { color: #d4a017; }

.ch-add-btn:disabled {
  opacity: 0.3; cursor: not-allowed;
}

/* ── Spinner ───────────────────────────────────────────────────────────────── */
.ch-spin {
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Sheet transition ──────────────────────────────────────────────────────── */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s;
}

.sheet-enter-active .ch-sheet,
.sheet-leave-active .ch-sheet {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .ch-sheet,
.sheet-leave-to .ch-sheet {
  transform: translateY(100%);
}

@media (min-width: 520px) {
  .sheet-enter-from .ch-sheet,
  .sheet-leave-to .ch-sheet {
    transform: translateX(100%);
    opacity: 1;
  }
}
</style>

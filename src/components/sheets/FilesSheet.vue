<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="fs-overlay" @click.self="close">
        <div
          class="fs-sheet files-sheet"
          :style="{
            transform: `translateY(${dragY}px)`,
            transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }"
        >

          <!-- Drag handle (mobile only) -->
          <div
            class="fs-drag-handle drag-handle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />

          <!-- Header -->
          <div class="fs-header">
            <AppIcon icon="mdi-file-multiple" :size="18" color="#d4a017" />
            <span class="fs-title">Files</span>
            <span v-if="files.length" class="fs-count-badge">{{ files.length }}</span>
            <div style="flex: 1" />
            <button class="fs-path-toggle" :class="{ active: showFullPath }" @click="showFullPath = !showFullPath">
              Full Path
            </button>
            <button class="fs-close-btn" @click="close">
              <AppIcon icon="mdi-close" :size="16" />
            </button>
          </div>

          <!-- File list (scrollable) -->
          <div class="fs-list">

            <!-- Skeleton loader -->
            <template v-if="loading">
              <div v-for="n in 4" :key="n" class="fs-skeleton" />
            </template>

            <!-- Rows -->
            <template v-else>
              <div
                v-for="file in files"
                :key="file.ino"
                class="fs-row"
              >
                <!-- File type icon -->
                <AppIcon :icon="fileIcon(file.fileType)" :size="20"
                  :color="fileIconColor(file.fileType)"
                  class="fs-icon" />

                <!-- File info -->
                <div class="fs-info">
                  <p class="fs-filename">
                    {{ showFullPath ? file.metadata.path : file.metadata.filename }}
                    <span v-if="file.isSupplementary" class="fs-supplementary-chip">supplementary</span>
                  </p>
                  <p v-if="!showFullPath" class="fs-path">{{ relativePath(file.metadata.path, file.metadata.filename) }}</p>
                </div>

                <!-- Type + size -->
                <div class="fs-right">
                  <span class="fs-type">{{ file.fileType ?? 'other' }}</span>
                  <span class="fs-size">{{ fmtSize(file.metadata.size) }}</span>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="!files.length" class="fs-empty">
                <AppIcon icon="mdi-file-outline" :size="40" color="rgba(255,255,255,0.1)" />
                <span>No files found</span>
              </div>
            </template>

          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, watch } from 'vue'
import { api } from '@/api/client'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

interface LibraryFile {
  ino: string
  metadata: {
    filename: string
    ext: string
    path: string
    size: number
    mtimeMs?: number
  }
  addedAt: number
  updatedAt: number
  isSupplementary?: boolean | null
  fileType?: string // 'audio' | 'image' | 'text' | 'other'
}

const props = defineProps<{
  modelValue: boolean
  itemId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
}>()

const loading      = ref(false)
const files        = ref<LibraryFile[]>([])
const showFullPath = ref(false)

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadFiles() {
  loading.value = true
  files.value   = []
  try {
    const res = await api.get(`/items/${props.itemId}?expanded=1`)
    files.value  = res.data?.libraryFiles ?? []
  } catch {
    // silent — empty state covers it
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v && 'vibrate' in navigator) navigator.vibrate(30)
    if (v) loadFiles()
  },
  { immediate: true },
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(type?: string): string {
  switch (type) {
    case 'audio':    return 'mdi-music'
    case 'image':    return 'mdi-image-outline'
    case 'text':     return 'mdi-text-box-outline'
    case 'metadata': return 'mdi-code-json'
    case 'ebook':    return 'mdi-book-open-outline'
    default:         return 'mdi-file-outline'
  }
}

function fileIconColor(type?: string): string {
  switch (type) {
    case 'audio':    return '#d4a017'
    case 'image':    return 'rgba(180,120,255,0.8)'
    case 'text':     return 'rgba(100,160,255,0.8)'
    case 'metadata': return 'rgba(80,200,120,0.8)'
    case 'ebook':    return 'rgba(100,200,255,0.8)'
    default:         return 'rgba(255,255,255,0.2)'
  }
}

function relativePath(fullPath: string, filename: string): string {
  if (!fullPath) return ''
  // Trim the filename (and the preceding separator) from the end
  const idx = fullPath.lastIndexOf(filename)
  if (idx <= 0) return fullPath
  return fullPath.slice(0, idx).replace(/[/\\]$/, '')
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function close() {
  emit('update:modelValue', false)
}

const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)
</script>

<style scoped>
/* ── Overlay ───────────────────────────────────────────────────────────────── */
.fs-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
}

/* ── Sheet panel ───────────────────────────────────────────────────────────── */
.fs-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  width: 100%;
  background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
}

@media (min-width: 520px) {
  .fs-sheet {
    position: absolute; right: 0; top: 0; bottom: 0;
    left: auto;
    width: min(480px, 100%);
    border-radius: 0;
    border-top: none;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    max-height: 100%;
  }
}

/* ── Drag handle (mobile only) ─────────────────────────────────────────────── */
.drag-handle {
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;
}
.drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}

@media (min-width: 520px) {
  .drag-handle { display: none; }
  .fs-sheet { transform: none !important; }
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.fs-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fs-title {
  font-size: 15px; font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
}

.fs-count-badge {
  font-size: 10px; font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px 8px;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
}

.fs-path-toggle {
  font-size: 10px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4); cursor: pointer; flex-shrink: 0;
  transition: all 0.15s;
}
.fs-path-toggle.active {
  background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.3); color: #d4a017;
}

.fs-close-btn {
  background: rgba(255, 255, 255, 0.08); border: none;
  border-radius: 50%; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  transition: background 0.15s;
}

.fs-close-btn:hover {
  background: rgba(255, 255, 255, 0.13);
}

/* ── File list (scrollable) ────────────────────────────────────────────────── */
.fs-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex; flex-direction: column;
}

.fs-list::-webkit-scrollbar { display: none; }

/* ── File row ──────────────────────────────────────────────────────────────── */
.fs-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* ── File icon ─────────────────────────────────────────────────────────────── */
.fs-icon {
  flex-shrink: 0;
}

/* ── File info ─────────────────────────────────────────────────────────────── */
.fs-info {
  flex: 1; min-width: 0;
}

.fs-filename {
  font-size: 13px; font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0 0 2px;
  display: flex; align-items: center; gap: 6px;
}

.fs-supplementary-chip {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  font-weight: 500;
}

.fs-path {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0;
}

/* ── File right column (size + type) ──────────────────────────────────────── */
.fs-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0;
}
.fs-size {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
.fs-type {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* ── Skeleton loader ───────────────────────────────────────────────────────── */
.fs-skeleton {
  height: 52px; border-radius: 6px;
  margin: 4px 16px;
  background: linear-gradient(
    90deg,
    #1a1a1a 25%,
    #222 50%,
    #1a1a1a 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
.fs-empty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px;
  padding: 48px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.25);
}

/* ── Sheet transition ──────────────────────────────────────────────────────── */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s;
}

.sheet-enter-active .files-sheet,
.sheet-leave-active .files-sheet {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .files-sheet,
.sheet-leave-to .files-sheet {
  transform: translateY(100%);
}

@media (min-width: 520px) {
  .sheet-enter-from .files-sheet,
  .sheet-leave-to .files-sheet {
    transform: translateX(100%);
    opacity: 1;
  }
}
</style>

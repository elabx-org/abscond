<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="m4b-overlay" @click.self="close">
        <div
          class="m4b-sheet"
          :style="{
            transform: `translateY(${dragY}px)`,
            transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }"
        >

          <!-- Header -->
          <div
            class="m4b-drag-handle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />
          <div class="m4b-header">
            <div class="m4b-header-left">
              <AppIcon icon="mdi-music-box-outline" :size="16" color="rgba(212,160,23,0.8)" />
              <span class="m4b-title">Make M4B</span>
            </div>
            <button class="m4b-close-btn" @click="close">
              <AppIcon icon="mdi-close" :size="16" />
            </button>
          </div>

          <!-- Loading skeleton -->
          <div v-if="loading" class="m4b-body">
            <div v-for="n in 5" :key="n" class="m4b-skel" />
          </div>

          <div v-else class="m4b-body">

            <!-- Metadata preview -->
            <p class="m4b-section-label">Metadata to embed</p>
            <div class="m4b-meta-grid">
              <template v-for="row in metaRows" :key="row.key">
                <span class="m4b-meta-key">{{ row.key }}</span>
                <span class="m4b-meta-val">{{ row.val || '—' }}</span>
              </template>
            </div>

            <!-- Chapters -->
            <div v-if="chapters.length" class="m4b-chapters-wrap">
              <p class="m4b-section-label">Chapters ({{ chapters.length }})</p>
              <div class="m4b-chapter-list">
                <div v-for="(ch, i) in chapters" :key="ch.id" class="m4b-chapter-row">
                  <span class="m4b-ch-num">{{ i + 1 }}</span>
                  <span class="m4b-ch-title">{{ ch.title || `Chapter ${i + 1}` }}</span>
                  <span class="m4b-ch-time">{{ secsToStr(ch.start) }}</span>
                  <span class="m4b-ch-sep">→</span>
                  <span class="m4b-ch-time">{{ secsToStr(ch.end) }}</span>
                </div>
              </div>
            </div>

            <!-- Encoding settings -->
            <p class="m4b-section-label">Encoding</p>
            <div class="m4b-encoding-grid">
              <!-- Codec -->
              <div class="m4b-field">
                <label class="m4b-field-label">Codec</label>
                <div class="m4b-chip-row">
                  <button
                    v-for="c in CODECS" :key="c.value"
                    class="m4b-chip"
                    :class="{ active: codec === c.value }"
                    @click="codec = c.value"
                  >{{ c.label }}</button>
                </div>
              </div>
              <!-- Bitrate (only when not Copy) -->
              <div v-if="codec !== 'copy'" class="m4b-field">
                <label class="m4b-field-label">Bitrate</label>
                <div class="m4b-chip-row">
                  <button
                    v-for="b in BITRATES" :key="b"
                    class="m4b-chip"
                    :class="{ active: bitrate === b }"
                    @click="bitrate = b"
                  >{{ b }}</button>
                </div>
              </div>
              <!-- Channels -->
              <div class="m4b-field">
                <label class="m4b-field-label">Channels</label>
                <div class="m4b-chip-row">
                  <button
                    v-for="ch in CHANNELS" :key="ch.value"
                    class="m4b-chip"
                    :class="{ active: channels === ch.value }"
                    @click="channels = ch.value"
                  >{{ ch.label }}</button>
                </div>
              </div>
            </div>

            <!-- Audio tracks -->
            <div v-if="audioTracks.length" class="m4b-tracks-wrap">
              <p class="m4b-section-label">Audio Tracks ({{ audioTracks.length }})</p>
              <div class="m4b-track-list">
                <div class="m4b-track-header">
                  <span class="m4b-th">Filename</span>
                  <span class="m4b-th m4b-th-r">Codec</span>
                  <span class="m4b-th m4b-th-r">Bitrate</span>
                  <span class="m4b-th m4b-th-r">Size</span>
                </div>
                <div v-for="t in audioTracks" :key="t.ino" class="m4b-track-row">
                  <span class="m4b-td m4b-td-name">{{ t.metadata.filename }}</span>
                  <span class="m4b-td m4b-td-r">{{ t.codec ?? '—' }}</span>
                  <span class="m4b-td m4b-td-r">{{ t.bitrate ? `${Math.round(t.bitrate / 1000)}k` : '—' }}</span>
                  <span class="m4b-td m4b-td-r">{{ fmtSize(t.metadata.size) }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <ul class="m4b-notes">
              <li>Finished M4B will be placed in your audiobook folder.</li>
              <li>Original audio files will be backed up before encoding.</li>
              <li>Encoding can take up to 30 minutes for large books.</li>
              <li>If the watcher is disabled, re-scan the item afterwards.</li>
            </ul>

            <!-- Submit -->
            <button class="m4b-start-btn" :disabled="encoding" @click="startEncode">
              <AppIcon icon="mdi-loading" v-if="encoding" :size="15" class="m4b-spin" />
              <AppIcon icon="mdi-play-circle-outline" v-else :size="15" />
              {{ encoding ? 'Starting…' : 'Start M4B Encode' }}
            </button>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, computed, watch } from 'vue'
import { api } from '@/api/client'
import { useNotificationStore } from '@/stores/notifications'
import type { Chapter } from '@/api/types'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

const props = defineProps<{ modelValue: boolean; itemId: string }>()
const emit  = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const notify = useNotificationStore()

// ── Encoding options ─────────────────────────────────────────────────────────
const CODECS   = [{ value: 'copy', label: 'Copy' }, { value: 'aac', label: 'AAC' }, { value: 'libopus', label: 'OPUS' }]
const BITRATES = ['32k', '64k', '128k', '192k', '256k']
const CHANNELS = [{ value: 1, label: 'Mono' }, { value: 2, label: 'Stereo' }]

const codec    = ref('copy')
const bitrate  = ref('128k')
const channels = ref(2)

// ── State ────────────────────────────────────────────────────────────────────
const loading   = ref(false)
const encoding  = ref(false)
const chapters  = ref<Chapter[]>([])
const audioTracks = ref<AudioTrack[]>([])
const meta      = ref<Record<string, string>>({})

interface AudioTrack {
  ino: string
  metadata: { filename: string; size: number }
  codec?: string
  bitrate?: number
}

// ── Computed metadata rows ────────────────────────────────────────────────────
const metaRows = computed(() => [
  { key: 'title',        val: meta.value.title },
  { key: 'artist',       val: meta.value.authorName },
  { key: 'album_artist', val: meta.value.authorName },
  { key: 'album',        val: meta.value.title },
  { key: 'genre',        val: meta.value.genres },
  { key: 'comment',      val: meta.value.description?.slice(0, 120) },
])

// ── Data loading ──────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const res  = await api.get(`/items/${props.itemId}?expanded=1`)
    const item = res.data
    const m    = item?.media?.metadata ?? {}
    meta.value = {
      title:       m.title ?? '',
      authorName:  m.authorName ?? m.authors?.map((a: { name: string }) => a.name).join(', ') ?? '',
      genres:      m.genres?.join(', ') ?? '',
      description: m.description ?? '',
    }
    chapters.value  = item?.media?.chapters ?? []
    audioTracks.value = (item?.libraryFiles ?? []).filter(
      (f: { fileType?: string }) => f.fileType === 'audio'
    )
  } catch {
    notify.show('Failed to load item details', 'error')
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
  if (v) load()
}, { immediate: true })

// ── Actions ───────────────────────────────────────────────────────────────────
async function startEncode() {
  encoding.value = true
  try {
    await api.post('/encode', {
      id: props.itemId,
      options: { codec: codec.value, bitrate: bitrate.value, channels: channels.value },
    })
    notify.show('M4B encoding task started', 'success')
    close()
  } catch {
    notify.show('Failed to start M4B encoding', 'error')
  } finally {
    encoding.value = false
  }
}

function close() { emit('update:modelValue', false) }

const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)

// ── Helpers ───────────────────────────────────────────────────────────────────
function secsToStr(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}
</script>

<style scoped>
.m4b-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.55);
}
.m4b-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #1c1c1e; border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
}
@media (min-width: 520px) {
  .m4b-sheet {
    position: absolute; right: 0; top: 0; bottom: 0; left: auto;
    width: min(520px, 100%); border-radius: 0; border-top: none;
    border-left: 1px solid rgba(255,255,255,0.08); max-height: 100%;
  }
}

.m4b-drag-handle {
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.m4b-drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}
@media (min-width: 520px) {
  .m4b-drag-handle { display: none; }
  .m4b-sheet { transform: none !important; }
}

.m4b-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.m4b-header-left { display: flex; align-items: center; gap: 8px; }
.m4b-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.92); }
.m4b-close-btn {
  background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(255,255,255,0.5);
}

.m4b-body {
  flex: 1; overflow-y: auto; scrollbar-width: none; padding: 16px 16px 40px;
}
.m4b-body::-webkit-scrollbar { display: none; }

.m4b-section-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
  color: rgba(255,255,255,0.3); margin: 0 0 8px;
}

/* Metadata grid */
.m4b-meta-grid {
  display: grid; grid-template-columns: 90px 1fr; gap: 4px 10px;
  margin-bottom: 20px;
  background: rgba(255,255,255,0.03); border-radius: 10px; padding: 10px;
}
.m4b-meta-key {
  font-size: 10px; color: rgba(255,255,255,0.35); align-self: center;
  font-variant-numeric: tabular-nums;
}
.m4b-meta-val {
  font-size: 11px; color: rgba(255,255,255,0.7);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Chapters */
.m4b-chapters-wrap { margin-bottom: 20px; }
.m4b-chapter-list {
  background: rgba(255,255,255,0.03); border-radius: 10px;
  max-height: 180px; overflow-y: auto; scrollbar-width: none;
}
.m4b-chapter-list::-webkit-scrollbar { display: none; }
.m4b-chapter-row {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.m4b-chapter-row:last-child { border-bottom: none; }
.m4b-ch-num { font-size: 10px; color: rgba(255,255,255,0.25); width: 20px; text-align: right; flex-shrink: 0; }
.m4b-ch-title { flex: 1; font-size: 11px; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m4b-ch-time { font-size: 10px; color: rgba(255,255,255,0.4); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.m4b-ch-sep { font-size: 10px; color: rgba(255,255,255,0.2); flex-shrink: 0; }

/* Encoding settings */
.m4b-encoding-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.m4b-field { display: flex; flex-direction: column; gap: 6px; }
.m4b-field-label { font-size: 10px; color: rgba(255,255,255,0.35); }
.m4b-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
.m4b-chip {
  font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5); transition: all 0.15s;
}
.m4b-chip.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017;
}

/* Audio tracks */
.m4b-tracks-wrap { margin-bottom: 20px; }
.m4b-track-list {
  background: rgba(255,255,255,0.03); border-radius: 10px; overflow: hidden;
}
.m4b-track-header {
  display: grid; grid-template-columns: 1fr 52px 52px 60px; gap: 8px;
  padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.m4b-th { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.25); }
.m4b-th-r { text-align: right; }
.m4b-track-row {
  display: grid; grid-template-columns: 1fr 52px 52px 60px; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
  align-items: center;
}
.m4b-track-row:last-child { border-bottom: none; }
.m4b-td { font-size: 11px; color: rgba(255,255,255,0.6); }
.m4b-td-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m4b-td-r { text-align: right; color: rgba(255,255,255,0.4); }

/* Notes */
.m4b-notes {
  margin: 0 0 20px; padding-left: 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.m4b-notes li { font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.5; }

/* Start button */
.m4b-start-btn {
  width: 100%; background: #d4a017; color: #111;
  font-size: 13px; font-weight: 700; padding: 13px;
  border-radius: 12px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.m4b-start-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Skeleton */
.m4b-skel {
  height: 44px; border-radius: 8px; margin-bottom: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.m4b-spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .m4b-sheet, .sheet-leave-active .m4b-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .m4b-sheet, .sheet-leave-to .m4b-sheet { transform: translateY(100%); }
@media (min-width: 520px) {
  .sheet-enter-from .m4b-sheet, .sheet-leave-to .m4b-sheet { transform: translateX(100%); opacity: 1; }
}
</style>

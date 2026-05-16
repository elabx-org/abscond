<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="ep-detail-sheet">
          <!-- Blurred cover bleed -->
          <div class="sheet-bleed">
            <img v-if="coverSrc" :src="coverSrc" class="bleed-img" aria-hidden="true" />
            <div class="bleed-scrim" />
          </div>

          <div class="drag-handle-area"><div class="drag-handle" /></div>

          <div class="sheet-content">
            <button class="sheet-close" @click="$emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <!-- Header -->
            <div class="ep-header">
              <img v-if="coverSrc" :src="coverSrc" class="ep-cover" :alt="episode.title" />
              <div class="ep-meta">
                <p class="ep-show-title">{{ item.media.metadata.title }}</p>
                <h2 class="ep-title">{{ episode.title }}</h2>
              </div>
            </div>

            <!-- Progress bar -->
            <div v-if="epProgress > 0 && !epFinished" class="ep-progress-wrap">
              <div class="ep-progress-bar" :style="{ width: `${epProgress * 100}%` }" />
              <span class="ep-progress-pct">{{ Math.round(epProgress * 100) }}%</span>
            </div>
            <p v-if="epFinished" class="ep-finished-badge">✓ Finished</p>

            <!-- Chips -->
            <div class="ep-chips">
              <span v-if="episode.episode" class="chip">Ep {{ episode.episode }}</span>
              <span v-if="episode.season" class="chip">Season {{ episode.season }}</span>
              <span v-if="episode.publishedAt" class="chip">{{ formatDate(episode.publishedAt) }}</span>
              <span v-if="episode.duration" class="chip">{{ formatDuration(episode.duration) }}</span>
            </div>

            <!-- Actions -->
            <div class="ep-actions">
              <button class="play-btn" @click="onPlay">
                <v-icon size="20" color="white">{{ isThisPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                {{ isThisPlaying ? 'Pause' : (epProgress > 0 && !epFinished ? 'Continue' : 'Play') }}
              </button>
              <button class="action-btn" @click="onDownload">
                <v-icon size="16">mdi-download-outline</v-icon>
                Download
              </button>
              <button class="action-btn" @click="onToggleFinished" :disabled="togglingFinished">
                <v-icon size="16">{{ epFinished ? 'mdi-undo' : 'mdi-check-circle-outline' }}</v-icon>
                {{ epFinished ? 'Unfinish' : 'Finished' }}
              </button>
              <button class="action-btn" @click="onPlayNext">
                <v-icon size="16">mdi-skip-next-circle-outline</v-icon>
                Play next
              </button>
              <button class="action-btn" @click="onAddToQueue">
                <v-icon size="16">mdi-playlist-plus</v-icon>
                Queue
              </button>
            </div>

            <!-- Description -->
            <div v-if="episode.description" class="ep-desc-wrap">
              <p class="ep-desc" :class="{ expanded: descExpanded }">{{ stripHtml(episode.description) }}</p>
              <button class="show-more" @click="descExpanded = !descExpanded">
                {{ descExpanded ? 'Show less' : 'Show more' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { getBaseUrl, api } from '@/api/client'
import type { LibraryItem } from '@/api/types'
import type { PodcastEpisode } from '@/api/browse'

const props = defineProps<{
  show: boolean
  item: LibraryItem
  episode: PodcastEpisode
  coverSrc: string
}>()

defineEmits<{ close: [] }>()

const router = useRouter()
const player = usePlayerStore()
const auth   = useAuthStore()
const notify = useNotificationStore()

const descExpanded     = ref(false)
const togglingFinished = ref(false)

const epProgress = computed(() => props.episode.userEpisodeProgress?.progress ?? 0)
const epFinished = computed(() => props.episode.userEpisodeProgress?.isFinished ?? false)

const isThisPlaying = computed(() =>
  player.isPlaying &&
  player.currentItem?.id === props.item.id &&
  player.session?.episodeId === props.episode.id
)

async function onPlay() {
  if (player.currentItem?.id === props.item.id && player.session?.episodeId === props.episode.id) {
    player.togglePlay()
    if (!player.isPlaying) router.push({ name: 'player' })
    return
  }
  await player.play(props.item, props.episode.id)
  router.push({ name: 'player' })
}

async function onDownload() {
  const base  = await getBaseUrl()
  const token = auth.token ?? ''
  const url   = `${base}/items/${props.item.id}/episode/${props.episode.id}/download?token=${encodeURIComponent(token)}`
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `${props.episode.title}.mp3`
  a.click()
}

async function onToggleFinished() {
  togglingFinished.value = true
  try {
    const isFinished = !epFinished.value
    await api.patch(`/me/progress/${props.item.id}/${props.episode.id}`, {
      isFinished,
      currentTime: isFinished ? (props.episode.duration ?? 0) : 0,
      duration: props.episode.duration ?? 0,
    })
    if (props.episode.userEpisodeProgress) {
      props.episode.userEpisodeProgress.isFinished = isFinished
      props.episode.userEpisodeProgress.progress   = isFinished ? 1 : 0
    }
  } catch { notify.show('Failed to update progress', 'error') }
  finally { togglingFinished.value = false }
}

function onPlayNext() {
  player.addToFrontOfQueue(props.item, props.episode.id)
}

function onAddToQueue() {
  player.addToQueue(props.item, props.episode.id)
  notify.show('Added to queue', 'success')
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number): string {
  if (!secs) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}
</script>

<style scoped>
.sheet-backdrop { position: fixed; inset: 0; z-index: 210; background: rgba(0,0,0,0.55); }
.ep-detail-sheet {
  position: absolute; bottom: 0; left: 0; right: 0; height: 80vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.sheet-bleed { position: absolute; top: 0; left: 0; right: 0; height: 35%; overflow: hidden; z-index: 0; }
.bleed-img { width: 100%; height: 100%; object-fit: cover; filter: blur(28px) brightness(0.5) saturate(1.2); transform: scale(1.1); }
.bleed-scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17,17,17,1)); }
.drag-handle-area { position: relative; z-index: 1; padding: 10px 0 4px; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-content { position: relative; z-index: 1; flex: 1; overflow-y: auto; scrollbar-width: none; padding: 4px 16px 40px; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.5); padding: 4px; float: right; margin-bottom: 4px; }

.ep-header { display: flex; gap: 14px; margin: 8px 0 16px; clear: both; align-items: flex-start; }
.ep-cover { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; box-shadow: 0 8px 20px rgba(0,0,0,0.5); }
.ep-meta { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.ep-show-title { font-size: 11px; color: rgba(255,255,255,0.45); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0; line-height: 1.3; }

.ep-progress-wrap { height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-bottom: 10px; position: relative; }
.ep-progress-bar { height: 100%; background: #d4a017; }
.ep-progress-pct { position: absolute; right: 0; top: -14px; font-size: 10px; color: rgba(255,255,255,0.4); }
.ep-finished-badge { font-size: 11px; color: #22c55e; margin: 0 0 10px; }

.ep-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.chip { font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.06); border-radius: 20px; padding: 4px 10px; }

.ep-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.play-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  background: #d4a017; border: none; border-radius: 12px; cursor: pointer;
  font-size: 14px; font-weight: 700; color: white;
}
.action-btn {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.7);
  font-size: 12px;
}
.action-btn:disabled { opacity: 0.4; }

.ep-desc-wrap { margin-top: 8px; }
.ep-desc {
  font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6;
  margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 4;
  -webkit-box-orient: vertical; overflow: hidden;
}
.ep-desc.expanded { display: block; }
.show-more { font-size: 12px; color: rgba(212,160,23,0.7); background: transparent; border: none; cursor: pointer; padding: 0; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

@media (min-width: 640px) {
  .ep-detail-sheet {
    left: auto !important; right: 0; top: 0; bottom: 0 !important;
    width: 480px; max-width: 100vw; height: 100% !important;
    border-radius: 0; border-top: none; border-left: 1px solid rgba(255,255,255,0.08);
  }
  .drag-handle-area { display: none; }
}
</style>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="pod-sheet">
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
            <div class="pod-header">
              <img v-if="coverSrc" :src="coverSrc" class="pod-cover" :alt="item.media.metadata.title" />
              <div class="pod-meta">
                <h2 class="pod-title">{{ item.media.metadata.title }}</h2>
                <p class="pod-author">{{ getAuthorDisplay(item) || 'Unknown' }}</p>
                <p class="pod-count">{{ episodes.length }} episodes</p>
              </div>
            </div>

            <!-- View all link -->
            <button class="view-all-btn" @click="viewAll">
              <v-icon size="14">mdi-open-in-new</v-icon>
              View all episodes
            </button>

            <!-- Loading -->
            <div v-if="loading" class="ep-list">
              <div v-for="n in 5" :key="n" class="skel-ep" />
            </div>

            <!-- Episodes -->
            <div v-else class="ep-list">
              <div
                v-for="ep in episodes"
                :key="ep.id"
                class="ep-row"
                :class="{ active: isEpPlaying(ep.id) }"
                @click="playEpisode(ep)"
              >
                <div class="ep-info">
                  <p class="ep-title">{{ ep.title }}</p>
                  <p class="ep-meta">
                    <span v-if="ep.episode">Ep {{ ep.episode }}</span>
                    <span v-if="ep.publishedAt">{{ formatDate(ep.publishedAt) }}</span>
                    <span>{{ formatDuration(ep.duration) }}</span>
                  </p>
                  <div v-if="(ep.userEpisodeProgress?.progress ?? 0) > 0 && !(ep.userEpisodeProgress?.isFinished)" class="ep-progress">
                    <div class="ep-progress-bar" :style="{ width: `${(ep.userEpisodeProgress?.progress ?? 0) * 100}%` }" />
                  </div>
                  <p v-if="ep.userEpisodeProgress?.isFinished" class="ep-finished">✓</p>
                </div>
                <button class="ep-play-btn">
                  <v-icon size="18" :color="isEpPlaying(ep.id) ? '#d4a017' : 'rgba(255,255,255,0.6)'">
                    {{ isEpPlaying(ep.id) ? 'mdi-pause' : 'mdi-play' }}
                  </v-icon>
                </button>
                <button class="ep-dl-btn" @click.stop="downloadEpisode(ep)">
                  <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-download-outline</v-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { getPodcastItem } from '@/api/browse'
import { getBaseUrl } from '@/api/client'
import type { LibraryItem } from '@/api/types'
import type { PodcastEpisode } from '@/api/browse'
import { getAuthorDisplay } from '@/utils/metadata'

const props = defineProps<{
  show: boolean
  item: LibraryItem
  coverSrc: string
}>()

defineEmits<{ close: [] }>()

const router   = useRouter()
const player   = usePlayerStore()
const auth     = useAuthStore()
const loading  = ref(false)
const episodes = ref<PodcastEpisode[]>([])

const activeEpisodeId = computed(() => player.session?.episodeId ?? null)

function viewAll() {
  router.push({ name: 'podcast', query: { itemId: props.item.id } })
}

function isEpPlaying(epId: string) {
  return player.isPlaying && player.currentItem?.id === props.item.id && activeEpisodeId.value === epId
}

function isEpCurrent(epId: string) {
  return player.currentItem?.id === props.item.id && activeEpisodeId.value === epId
}

async function playEpisode(ep: PodcastEpisode) {
  if (isEpCurrent(ep.id)) { player.togglePlay(); return }
  await player.play(props.item, ep.id)
  router.push({ name: 'player' })
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function downloadEpisode(ep: PodcastEpisode) {
  const base  = await getBaseUrl()
  const token = auth.token ?? ''
  const url   = `${base}/items/${props.item.id}/episode/${ep.id}/download?token=${encodeURIComponent(token)}`
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `${ep.title}.mp3`
  a.click()
}

function formatDuration(secs: number) {
  if (!secs) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

watch(() => props.show, async (v) => {
  if (!v) return
  loading.value = true
  try {
    const detail = await getPodcastItem(props.item.id)
    episodes.value = (detail.media.episodes ?? []).sort((a, b) => (b.index ?? 0) - (a.index ?? 0))
  } catch { episodes.value = [] }
  finally { loading.value = false }
}, { immediate: true })
</script>

<style scoped>
.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.pod-sheet {
  position: absolute; bottom: 0; left: 0; right: 0; height: 90vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.sheet-bleed { position: absolute; top: 0; left: 0; right: 0; height: 35%; overflow: hidden; z-index: 0; }
.bleed-img { width: 100%; height: 100%; object-fit: cover; filter: blur(28px) brightness(0.5) saturate(1.2); transform: scale(1.1); }
.bleed-scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17,17,17,1)); }
.drag-handle-area { position: relative; z-index: 1; padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-content { position: relative; z-index: 1; flex: 1; overflow-y: auto; scrollbar-width: none; padding: 4px 16px 40px; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.5); padding: 4px; float: right; margin-bottom: 4px; }

.pod-header { display: flex; gap: 14px; margin: 8px 0 20px; clear: both; }
.pod-cover { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
.pod-meta { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.pod-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0 0 4px; }
.pod-author { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
.pod-count { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }

.skel-ep { height: 60px; border-radius: 8px; margin-bottom: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.ep-list { display: flex; flex-direction: column; }
.ep-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;
}
.ep-row.active .ep-title { color: #d4a017; }
.ep-info { flex: 1; min-width: 0; }
.ep-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-meta { display: flex; gap: 8px; font-size: 10px; color: rgba(255,255,255,0.35); margin: 0 0 4px; }
.ep-progress { height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px; overflow: hidden; }
.ep-progress-bar { height: 100%; background: #d4a017; }
.ep-finished { font-size: 10px; color: #22c55e; margin: 2px 0 0; }
.ep-play-btn { background: transparent; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
.ep-dl-btn  { background: transparent; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }

.view-all-btn {
  display: flex; align-items: center; gap: 6px; margin: 0 0 16px;
  font-size: 11px; color: rgba(212,160,23,0.8); background: transparent;
  border: none; cursor: pointer; padding: 0;
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

<template>
  <div class="podcast-view">
    <div class="view-header">
      <button class="back-btn" @click="$router.back()">
        <v-icon size="20" color="rgba(255,255,255,0.6)">mdi-arrow-left</v-icon>
      </button>
      <div class="header-meta">
        <h2 class="screen-title">{{ item?.media.metadata.title ?? 'Podcast' }}</h2>
        <p class="screen-sub" v-if="item">{{ (item.media.metadata.authors ?? []).map(a => a.name).join(', ') }}</p>
      </div>
    </div>

    <div v-if="!item && loading" class="loading-wrap">
      <div v-for="n in 6" :key="n" class="skel-ep" />
    </div>

    <div v-else-if="item">
      <!-- Cover + info -->
      <div class="podcast-hero">
        <img :src="coverUrl(item.id, auth.token ?? '')" class="podcast-cover" />
        <div class="podcast-info">
          <p class="podcast-desc">{{ item.media.metadata.description }}</p>
        </div>
      </div>

      <!-- Episode list -->
      <div class="ep-list">
        <div
          v-for="ep in sortedEpisodes"
          :key="ep.id"
          class="ep-row"
        >
          <div class="ep-main">
            <div class="ep-num" v-if="ep.index">{{ ep.index }}</div>
            <div class="ep-info">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">
                <span v-if="ep.publishedAt">{{ formatDate(ep.publishedAt) }} · </span>
                {{ formatDuration(ep.duration) }}
              </p>
              <!-- Progress bar -->
              <div v-if="(ep.userEpisodeProgress?.progress ?? 0) > 0" class="ep-progress-track">
                <div class="ep-progress-fill" :style="{ width: `${(ep.userEpisodeProgress?.progress ?? 0) * 100}%` }" />
              </div>
            </div>
            <button class="ep-play-btn" @click="playEpisode(ep)">
              <v-icon size="22" :color="isPlayingEp(ep.id) ? '#d4a017' : 'rgba(255,255,255,0.7)'">
                {{ isPlayingEp(ep.id) && player.isPlaying ? 'mdi-pause-circle' : 'mdi-play-circle' }}
              </v-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { coverUrl } from '@/api/client'
import { getPodcastItem } from '@/api/browse'
import type { PodcastItem, PodcastEpisode } from '@/api/browse'

const route  = useRoute()
const auth   = useAuthStore()
const player = usePlayerStore()
const loading = ref(false)
const item    = ref<PodcastItem | null>(null)

const sortedEpisodes = computed<PodcastEpisode[]>(() => {
  const eps = item.value?.media?.episodes ?? []
  return [...eps].sort((a, b) => (b.index ?? 0) - (a.index ?? 0))
})

function isPlayingEp(episodeId: string) {
  return player.session?.episodeId === episodeId
}

async function playEpisode(ep: PodcastEpisode) {
  if (!item.value) return
  if (isPlayingEp(ep.id) && player.isPlaying) { player.togglePlay(); return }
  if (isPlayingEp(ep.id) && !player.isPlaying) { player.togglePlay(); return }
  await player.play(item.value as unknown as import('@/api/types').LibraryItem, ep.id)
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number): string {
  if (!secs) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

onMounted(async () => {
  const itemId = route.query.itemId as string
  if (!itemId) return
  loading.value = true
  try { item.value = await getPodcastItem(itemId) }
  catch { item.value = null }
  finally { loading.value = false }
})
</script>

<style scoped>
.podcast-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 80px; }
.view-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.back-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.header-meta { flex: 1; min-width: 0; }
.screen-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.screen-sub { font-size: 11px; color: rgba(255,255,255,0.4); margin: 2px 0 0; }

.loading-wrap { display: flex; flex-direction: column; gap: 10px; }
.skel-ep { height: 64px; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.podcast-hero { display: flex; gap: 14px; margin-bottom: 24px; }
.podcast-cover { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
.podcast-info { flex: 1; }
.podcast-desc { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

.ep-list { display: flex; flex-direction: column; }
.ep-row { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0; }
.ep-main { display: flex; align-items: center; gap: 10px; }
.ep-num { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.2); min-width: 20px; text-align: center; }
.ep-info { flex: 1; min-width: 0; }
.ep-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0 0 4px; }
.ep-progress-track { height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px; }
.ep-progress-fill { height: 100%; background: #d4a017; border-radius: 1px; }
.ep-play-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
</style>

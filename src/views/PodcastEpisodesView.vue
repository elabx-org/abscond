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

      <!-- Episode filter -->
      <div class="ep-filter-row">
        <div class="ep-search-wrap">
          <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-magnify</v-icon>
          <input v-model="epSearch" class="ep-search" placeholder="Search episodes…" />
          <button v-if="epSearch" class="ep-search-clear" @click="epSearch = ''">
            <v-icon size="12">mdi-close</v-icon>
          </button>
        </div>
        <div class="ep-filter-chips">
          <button class="ep-chip" :class="{ active: epFilter === 'all' }" @click="epFilter = 'all'">All</button>
          <button class="ep-chip" :class="{ active: epFilter === 'unfinished' }" @click="epFilter = 'unfinished'">Unplayed</button>
          <button class="ep-chip" :class="{ active: epFilter === 'finished' }" @click="epFilter = 'finished'">Played</button>
        </div>
      </div>

      <!-- Episode list -->
      <div class="ep-list">
        <div
          v-for="ep in filteredEpisodes"
          :key="ep.id"
          class="ep-row"
          :class="{ finished: ep.userEpisodeProgress?.isFinished }"
        >
          <div class="ep-main">
            <div class="ep-num" v-if="ep.index">{{ ep.index }}</div>
            <div class="ep-info">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">
                <span v-if="ep.publishedAt">{{ formatDate(ep.publishedAt) }} · </span>
                {{ formatDuration(ep.duration) }}
                <span v-if="ep.userEpisodeProgress?.isFinished" class="ep-played-badge">· Played</span>
              </p>
              <div v-if="(ep.userEpisodeProgress?.progress ?? 0) > 0 && !ep.userEpisodeProgress?.isFinished" class="ep-progress-track">
                <div class="ep-progress-fill" :style="{ width: `${(ep.userEpisodeProgress?.progress ?? 0) * 100}%` }" />
              </div>
              <div v-if="ep.description && expandedEps.has(ep.id)" class="ep-desc">{{ ep.description }}</div>
            </div>
            <button class="ep-play-btn" @click="playEpisode(ep)">
              <v-icon size="22" :color="isPlayingEp(ep.id) ? '#d4a017' : 'rgba(255,255,255,0.7)'">
                {{ isPlayingEp(ep.id) && player.isPlaying ? 'mdi-pause-circle' : 'mdi-play-circle' }}
              </v-icon>
            </button>
            <button v-if="ep.description" class="ep-expand-btn" @click.stop="toggleExpand(ep.id)">
              <v-icon size="14" :color="expandedEps.has(ep.id) ? '#d4a017' : 'rgba(255,255,255,0.2)'">
                {{ expandedEps.has(ep.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
            </button>
            <button class="ep-mark-btn" @click.stop="toggleFinished(ep)" :title="ep.userEpisodeProgress?.isFinished ? 'Mark unplayed' : 'Mark played'">
              <v-icon size="16" :color="ep.userEpisodeProgress?.isFinished ? '#22c55e' : 'rgba(255,255,255,0.2)'">
                {{ ep.userEpisodeProgress?.isFinished ? 'mdi-check-circle' : 'mdi-check-circle-outline' }}
              </v-icon>
            </button>
          </div>
        </div>
        <div v-if="!filteredEpisodes.length" class="ep-empty">No episodes match your filter</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { coverUrl, api } from '@/api/client'
import { getPodcastItem } from '@/api/browse'
import type { PodcastItem, PodcastEpisode } from '@/api/browse'

const route  = useRoute()
const auth   = useAuthStore()
const player = usePlayerStore()
const loading = ref(false)
const item    = ref<PodcastItem | null>(null)
const epSearch     = ref('')
const epFilter     = ref<'all' | 'unfinished' | 'finished'>('all')
const expandedEps  = ref(new Set<string>())

function toggleExpand(id: string) {
  if (expandedEps.value.has(id)) expandedEps.value.delete(id)
  else expandedEps.value.add(id)
}

const sortedEpisodes = computed<PodcastEpisode[]>(() => {
  const eps = item.value?.media?.episodes ?? []
  return [...eps].sort((a, b) => (b.index ?? 0) - (a.index ?? 0))
})

const filteredEpisodes = computed(() => {
  let eps = sortedEpisodes.value
  if (epFilter.value === 'finished')   eps = eps.filter(e => e.userEpisodeProgress?.isFinished)
  if (epFilter.value === 'unfinished') eps = eps.filter(e => !e.userEpisodeProgress?.isFinished)
  if (epSearch.value.trim()) {
    const q = epSearch.value.toLowerCase()
    eps = eps.filter(e => e.title.toLowerCase().includes(q))
  }
  return eps
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

async function toggleFinished(ep: PodcastEpisode) {
  if (!item.value) return
  const isFinished = ep.userEpisodeProgress?.isFinished
  const progress   = isFinished ? 0 : 1
  await api.patch(`/me/progress/${item.value.id}/${ep.id}`, { isFinished: !isFinished, progress }).catch(() => {})
  if (!ep.userEpisodeProgress) (ep as PodcastEpisode & { userEpisodeProgress: unknown }).userEpisodeProgress = {}
  if (ep.userEpisodeProgress) {
    ep.userEpisodeProgress.isFinished = !isFinished
    ep.userEpisodeProgress.progress   = progress
  }
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

.ep-filter-row { margin-bottom: 12px; }
.ep-search-wrap {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 8px 12px;
}
.ep-search { flex: 1; background: transparent; border: none; outline: none; font-size: 13px; color: rgba(255,255,255,0.85); }
.ep-search::placeholder { color: rgba(255,255,255,0.3); }
.ep-search-clear { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 0; }
.ep-filter-chips { display: flex; gap: 6px; }
.ep-chip {
  font-size: 11px; padding: 4px 10px; border-radius: 16px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); cursor: pointer;
}
.ep-chip.active { background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.3); color: #d4a017; }
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
.ep-mark-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.ep-expand-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.ep-desc { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.5; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.ep-played-badge { color: #22c55e; }
.ep-row.finished .ep-title { color: rgba(255,255,255,0.45); }
.ep-empty { font-size: 12px; color: rgba(255,255,255,0.25); padding: 20px 0; text-align: center; }
</style>

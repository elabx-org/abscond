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

      <!-- Refresh feed + Settings toggle row -->
      <div class="ep-refresh-row">
        <button class="ep-refresh-btn" :disabled="refreshing" @click="refreshFeed">
          <v-icon size="14" :class="{ spin: refreshing }">mdi-refresh</v-icon>
          {{ refreshing ? 'Checking for new episodes…' : 'Refresh feed' }}
        </button>
        <button class="ep-settings-btn" @click="showSettings = !showSettings">
          <v-icon size="14">{{ showSettings ? 'mdi-chevron-up' : 'mdi-cog-outline' }}</v-icon>
          Settings
        </button>
      </div>

      <!-- Podcast settings panel -->
      <div v-if="showSettings" class="podcast-settings-panel">
        <div class="settings-row">
          <span class="settings-label">Auto-download new episodes</span>
          <button class="toggle-btn" :class="{ on: settingsForm.autoDownload }" @click="settingsForm.autoDownload = !settingsForm.autoDownload">
            <div class="toggle-knob" />
          </button>
        </div>
        <div class="settings-row">
          <span class="settings-label">Max episodes to keep</span>
          <div class="stepper">
            <button class="step-btn" @click="settingsForm.maxToKeep = Math.max(0, settingsForm.maxToKeep - 1)">
              <v-icon size="14">mdi-minus</v-icon>
            </button>
            <span class="step-val">{{ settingsForm.maxToKeep === 0 ? '∞' : settingsForm.maxToKeep }}</span>
            <button class="step-btn" @click="settingsForm.maxToKeep++">
              <v-icon size="14">mdi-plus</v-icon>
            </button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">Max new eps to download</span>
          <div class="stepper">
            <button class="step-btn" @click="settingsForm.maxNew = Math.max(0, settingsForm.maxNew - 1)">
              <v-icon size="14">mdi-minus</v-icon>
            </button>
            <span class="step-val">{{ settingsForm.maxNew === 0 ? '∞' : settingsForm.maxNew }}</span>
            <button class="step-btn" @click="settingsForm.maxNew++">
              <v-icon size="14">mdi-plus</v-icon>
            </button>
          </div>
        </div>
        <button class="settings-save-btn" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? 'Saving…' : 'Save settings' }}
        </button>
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
            <button class="ep-dl-btn" :disabled="downloadingEps.has(ep.id)" @click.stop="downloadEpisode(ep)" title="Download episode">
              <v-icon size="15" :color="downloadingEps.has(ep.id) ? '#d4a017' : 'rgba(255,255,255,0.2)'">
                {{ downloadingEps.has(ep.id) ? 'mdi-loading' : 'mdi-download-outline' }}
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { useNotificationStore } from '@/stores/notifications'
import { coverUrl, api } from '@/api/client'
import { getPodcastItem } from '@/api/browse'
import type { PodcastItem, PodcastEpisode } from '@/api/browse'

const route  = useRoute()
const auth   = useAuthStore()
const player = usePlayerStore()
const notify = useNotificationStore()
const loading        = ref(false)
const refreshing     = ref(false)
const showSettings   = ref(false)
const savingSettings = ref(false)
const downloadingEps = ref(new Set<string>())
const item    = ref<PodcastItem | null>(null)
const epSearch     = ref('')
const epFilter     = ref<'all' | 'unfinished' | 'finished'>('all')
const expandedEps  = ref(new Set<string>())

const settingsForm = ref({ autoDownload: false, maxToKeep: 0, maxNew: 3 })

watch(item, (v) => {
  if (!v) return
  const s = v.media.settings
  settingsForm.value = {
    autoDownload: s?.autoDownloadEpisodes ?? false,
    maxToKeep:    s?.maxEpisodesToKeep ?? 0,
    maxNew:       s?.maxNewEpisodesToDownload ?? 3,
  }
})

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

async function refreshFeed() {
  if (!item.value) return
  refreshing.value = true
  try {
    await api.post(`/podcasts/${item.value.id}/check-and-download-new-episodes`)
    // Reload item to get new episodes
    const fresh = await getPodcastItem(item.value.id)
    item.value = fresh
  } catch { /* ignore */ }
  finally { refreshing.value = false }
}

async function saveSettings() {
  if (!item.value) return
  savingSettings.value = true
  try {
    await api.patch(`/items/${item.value.id}/media`, {
      settings: {
        autoDownloadEpisodes:      settingsForm.value.autoDownload,
        maxEpisodesToKeep:         settingsForm.value.maxToKeep,
        maxNewEpisodesToDownload:  settingsForm.value.maxNew,
      },
    })
    if (item.value.media.settings) {
      item.value.media.settings.autoDownloadEpisodes     = settingsForm.value.autoDownload
      item.value.media.settings.maxEpisodesToKeep        = settingsForm.value.maxToKeep
      item.value.media.settings.maxNewEpisodesToDownload = settingsForm.value.maxNew
    }
    showSettings.value = false
  } catch { /* ignore */ }
  finally { savingSettings.value = false }
}

async function downloadEpisode(ep: PodcastEpisode) {
  if (!item.value) return
  downloadingEps.value.add(ep.id)
  try {
    await api.post(`/podcasts/${item.value.id}/download-episodes`, { episodeIds: [ep.id] })
    notify.show(`Downloading "${ep.title}"`, 'success')
  } catch {
    notify.show('Download failed', 'error')
  } finally {
    downloadingEps.value.delete(ep.id)
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

.ep-refresh-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.ep-refresh-btn, .ep-settings-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 12px;
  border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); cursor: pointer;
}
.ep-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.podcast-settings-panel {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 14px; margin-bottom: 14px;
}
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.settings-row:last-of-type { border-bottom: none; }
.settings-label { font-size: 12px; color: rgba(255,255,255,0.6); }
.toggle-btn {
  width: 42px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.1); position: relative; transition: background 0.2s;
}
.toggle-btn.on { background: #d4a017; }
.toggle-knob {
  width: 18px; height: 18px; border-radius: 50%; background: white;
  position: absolute; top: 3px; left: 3px; transition: transform 0.2s;
}
.toggle-btn.on .toggle-knob { transform: translateX(18px); }
.stepper { display: flex; align-items: center; gap: 10px; }
.step-btn {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.step-val { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.85); min-width: 24px; text-align: center; }
.settings-save-btn {
  width: 100%; margin-top: 10px; padding: 10px; border-radius: 10px;
  border: none; background: rgba(212,160,23,0.15); border: 1px solid rgba(212,160,23,0.3);
  color: #d4a017; font-size: 13px; font-weight: 700; cursor: pointer;
}
.settings-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
.ep-dl-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.ep-dl-btn:disabled { cursor: default; }
.ep-expand-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.ep-desc { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.5; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.ep-played-badge { color: #22c55e; }
.ep-row.finished .ep-title { color: rgba(255,255,255,0.45); }
.ep-empty { font-size: 12px; color: rgba(255,255,255,0.25); padding: 20px 0; text-align: center; }
</style>

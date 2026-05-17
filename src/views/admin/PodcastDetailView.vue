<template>
  <div class="podcast-detail-view">
    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <template v-else-if="podcast">
      <!-- Header card -->
      <div class="podcast-hero-card">
        <img :src="coverUrl(podcast.id, auth.token ?? '')" class="podcast-hero-cover" />
        <div class="podcast-hero-meta">
          <p class="podcast-hero-title">{{ podcast.media?.metadata?.title ?? 'Podcast' }}</p>
          <p class="podcast-hero-author">{{ podcast.media?.metadata?.author ?? '' }}</p>
          <p class="podcast-hero-count">{{ totalEpisodes }} episodes</p>
        </div>
      </div>

      <!-- Tab strip -->
      <div class="tab-strip">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <!-- Downloaded tab -->
      <div v-if="activeTab === 'downloaded'">
        <div v-if="!downloadedEpisodes.length" class="empty-state">
          <AppIcon icon="mdi-download-off" :size="32" color="rgba(255,255,255,0.1)" />
          <p>No downloaded episodes</p>
        </div>
        <div v-else class="episode-list">
          <div v-for="ep in downloadedEpisodes" :key="ep.id" class="episode-row">
            <div class="ep-meta">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">{{ formatMinutes(ep.audioFile?.duration ?? ep.duration) }} · {{ formatSize(ep.audioFile?.metadata?.size ?? 0) }}</p>
            </div>
            <button class="ep-action-btn ep-delete" :disabled="deletingId === ep.id" @click="doDelete(ep.id)" title="Delete episode">
              <AppIcon :icon="deletingId === ep.id ? 'mdi-loading' : 'mdi-delete-outline'" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- Feed tab -->
      <div v-if="activeTab === 'feed'">
        <div v-if="!feedEpisodes.length" class="empty-state">
          <AppIcon icon="mdi-rss-off" :size="32" color="rgba(255,255,255,0.1)" />
          <p>No feed episodes available</p>
        </div>
        <div v-else class="episode-list">
          <div v-for="ep in feedEpisodes" :key="ep.id" class="episode-row">
            <div class="ep-meta">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">{{ formatMinutes(ep.duration) }}{{ ep.publishedAt ? ' · ' + formatDate(ep.publishedAt) : '' }}</p>
            </div>
            <button
              class="ep-action-btn ep-download"
              :disabled="downloadingId === ep.id || ep.downloaded"
              @click="doDownload(ep.id)"
              :title="ep.downloaded ? 'Already downloaded' : 'Download episode'"
            >
              <AppIcon :icon="downloadingId === ep.id ? 'mdi-loading' : ep.downloaded ? 'mdi-check' : 'mdi-download-outline'" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- Settings card -->
      <div class="settings-card">
        <p class="group-label">Podcast Settings</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Feed URL</p>
          </div>
          <button class="copy-url-btn" @click="copyFeedUrl">
            <AppIcon icon="mdi-content-copy" :size="14" />
            Copy
          </button>
        </div>
        <p class="feed-url-display">{{ podcast.media?.metadata?.feedUrl ?? 'Not set' }}</p>
        <div class="check-episodes-row">
          <button class="check-btn" :disabled="checking" @click="doCheck">
            <AppIcon :icon="checking ? 'mdi-loading' : 'mdi-refresh'" :size="14" :class="{ spin: checking }" />
            {{ checking ? 'Checking…' : 'Check for new episodes' }}
          </button>
          <span v-if="checkResult !== null" class="check-result">{{ checkResult }} new</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, coverUrl } from '@/api/client'
import { downloadPodcastEpisode, deletePodcastEpisode, checkNewPodcastEpisodes } from '@/api/admin/index'
import { useAuthStore } from '@/stores/auth'
import type { PodcastEpisodeFile } from '@/api/admin/index'

const route = useRoute()
const auth  = useAuthStore()
const id    = computed(() => route.params.id as string)

const loading       = ref(true)
const podcast       = ref<Record<string, any> | null>(null)
const activeTab     = ref<'downloaded' | 'feed'>('downloaded')
const deletingId    = ref<string | null>(null)
const downloadingId = ref<string | null>(null)
const checking      = ref(false)
const checkResult   = ref<number | null>(null)

const tabs = [
  { id: 'downloaded', label: 'Downloaded' },
  { id: 'feed',       label: 'Feed' },
] as const

const downloadedEpisodes = computed<PodcastEpisodeFile[]>(() =>
  (podcast.value?.media?.episodes ?? []).filter((e: PodcastEpisodeFile) => !!e.audioFile)
)

const feedEpisodes = computed<PodcastEpisodeFile[]>(() =>
  (podcast.value?.media?.episodes ?? []).map((e: PodcastEpisodeFile) => ({
    ...e,
    downloaded: !!e.audioFile,
  }))
)

const totalEpisodes = computed(() => podcast.value?.media?.numEpisodes ?? feedEpisodes.value.length)

function formatMinutes(secs: number) {
  if (!secs) return '—'
  const m = Math.round(secs / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function copyFeedUrl() {
  const url = podcast.value?.media?.metadata?.feedUrl
  if (!url) return
  try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
}

async function doDelete(epId: string) {
  deletingId.value = epId
  try {
    await deletePodcastEpisode(id.value, epId)
    if (podcast.value?.media?.episodes) {
      const ep = podcast.value.media.episodes.find((e: PodcastEpisodeFile) => e.id === epId)
      if (ep) delete (ep as Record<string, unknown>).audioFile
    }
  } catch { /* ignore */ }
  finally { deletingId.value = null }
}

async function doDownload(epId: string) {
  downloadingId.value = epId
  try {
    await downloadPodcastEpisode(id.value, epId)
  } catch { /* ignore */ }
  finally { downloadingId.value = null }
}

async function doCheck() {
  checking.value = true
  checkResult.value = null
  try {
    const count = await checkNewPodcastEpisodes(id.value)
    checkResult.value = count
  } catch { /* ignore */ }
  finally { checking.value = false }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get(`/items/${id.value}`, { params: { expanded: 1, include: 'progress' } })
    podcast.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.podcast-detail-view { padding: 4px 0; }

.loading-wrap { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 52px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.podcast-hero-card {
  display: flex; gap: 14px; align-items: flex-start;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 14px; margin-bottom: 16px;
}
.podcast-hero-cover { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.podcast-hero-title  { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 3px; }
.podcast-hero-author { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
.podcast-hero-count  { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }

.tab-strip {
  display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px;
}
.tab-btn {
  padding: 10px 18px; background: transparent; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); transition: all 0.15s;
}
.tab-btn.active { color: #d4a017; border-bottom-color: #d4a017; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.episode-list { display: flex; flex-direction: column; }
.episode-row {
  display: flex; align-items: center; gap: 10px; padding: 11px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.episode-row:last-child { border-bottom: none; }
.ep-meta { flex: 1; min-width: 0; }
.ep-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-sub   { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }

.ep-action-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ep-delete   { background: rgba(239,68,68,0.1); color: rgba(239,68,68,0.6); }
.ep-download { background: rgba(212,160,23,0.1); color: #d4a017; }
.ep-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.settings-card {
  margin-top: 20px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px;
}
.group-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
.setting-info { flex: 1; }
.setting-name { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
.copy-url-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 12px; border-radius: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); cursor: pointer; }
.feed-url-display { font-size: 11px; color: rgba(255,255,255,0.3); font-family: monospace; word-break: break-all; margin: 4px 0 12px; }
.check-episodes-row { display: flex; align-items: center; gap: 12px; }
.check-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(212,160,23,0.25); background: rgba(212,160,23,0.1); color: #d4a017; font-size: 12px; cursor: pointer; }
.check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.check-result { font-size: 12px; color: #22c55e; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (min-width: 768px) {
  .episode-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .episode-row { border-bottom: 1px solid rgba(255,255,255,0.05); }
}
</style>

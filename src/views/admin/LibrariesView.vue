<template>
  <div class="admin-libraries">
    <div class="section-header">
      <h3 class="section-title">Libraries</h3>
      <button class="add-lib-btn" @click="showCreateLib = true">
        <v-icon size="16">mdi-plus</v-icon>
        Create
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 3" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!libraries.length" class="empty-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-bookshelf</v-icon>
      <p>No libraries found</p>
    </div>

    <div v-else class="lib-list">
      <div v-for="lib in libraries" :key="lib.id" class="lib-card">
        <div class="lib-card-header">
          <v-icon size="20" color="#d4a017">{{ lib.mediaType === 'podcast' ? 'mdi-podcast' : 'mdi-bookshelf' }}</v-icon>
          <div class="lib-info">
            <p class="lib-name">{{ lib.name }}</p>
            <p class="lib-type">{{ lib.mediaType }} · {{ lib.stats?.totalItems ?? '?' }} items</p>
          </div>
          <div class="lib-actions">
            <button
              v-if="lib.mediaType === 'podcast'"
              class="add-podcast-btn"
              @click="openAddPodcast(lib)"
            >
              <v-icon size="14">mdi-rss</v-icon>
              <span>Add</span>
            </button>
            <button class="scan-btn" :class="{ scanning: scanningId === lib.id }" @click="scan(lib.id)">
              <v-icon size="16">{{ scanningId === lib.id ? 'mdi-loading' : 'mdi-magnify-scan' }}</v-icon>
              <span>{{ scanningId === lib.id ? 'Scanning…' : 'Scan' }}</span>
            </button>
          </div>
        </div>
        <div class="folder-list">
          <div v-for="f in lib.folders" :key="f.id" class="folder-row">
            <v-icon size="13" color="rgba(255,255,255,0.35)">mdi-folder-outline</v-icon>
            <span class="folder-path">{{ f.fullPath }}</span>
          </div>
        </div>
        <!-- Real-time scan progress -->
        <div v-if="socket.scanProgress[lib.id]" class="scan-progress-wrap">
          <div class="scan-progress-bar" :style="{ width: `${socket.scanProgress[lib.id].pct}%` }" />
          <p class="scan-progress-label">
            Scanning {{ socket.scanProgress[lib.id].pct }}%
            <span v-if="socket.scanProgress[lib.id].found > 0">· {{ socket.scanProgress[lib.id].found }} found</span>
            <span v-if="socket.scanProgress[lib.id].added > 0"> · {{ socket.scanProgress[lib.id].added }} new</span>
          </p>
        </div>
        <p v-else-if="lib.lastScan" class="last-scan">Last scan {{ formatDate(lib.lastScan) }}</p>
      </div>
    </div>

    <!-- Create library sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreateLib" class="sheet-backdrop" @click.self="showCreateLib = false">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">New Library</h3>
              <input v-model="libName" class="form-input" placeholder="Library name" />
              <select v-model="libMediaType" class="form-input form-select">
                <option value="book">Audiobooks</option>
                <option value="podcast">Podcasts</option>
              </select>
              <input v-model="libFolder" class="form-input" placeholder="Folder path (e.g. /audiobooks)" />
              <p class="form-hint">The folder must exist on the server and be accessible.</p>
              <p v-if="libError" class="form-error">{{ libError }}</p>
              <button class="save-btn" :disabled="!libName.trim() || !libFolder.trim() || creatingLib" @click="doCreateLib">
                {{ creatingLib ? 'Creating…' : 'Create Library' }}
              </button>
              <button class="cancel-btn" @click="showCreateLib = false">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add Podcast sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="podcastTarget" class="sheet-backdrop" @click.self="closeAddPodcast">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Add Podcast via RSS</h3>
              <p class="create-subtitle">Library: <strong>{{ podcastTarget.name }}</strong></p>

              <!-- Step 1: URL input -->
              <template v-if="!feedInfo">
                <input
                  v-model="rssUrl"
                  class="form-input"
                  placeholder="https://feeds.example.com/podcast.rss"
                  type="url"
                />
                <p v-if="feedError" class="form-error">{{ feedError }}</p>
                <button class="save-btn" :disabled="!rssUrl.trim() || feedLoading" @click="previewFeed">
                  {{ feedLoading ? 'Loading feed…' : 'Preview Feed' }}
                </button>
              </template>

              <!-- Step 2: Confirm -->
              <template v-else>
                <div class="feed-preview">
                  <img v-if="feedInfo.imageUrl" :src="feedInfo.imageUrl" class="feed-cover" />
                  <div class="feed-meta">
                    <p class="feed-title">{{ feedInfo.title }}</p>
                    <p v-if="feedInfo.author" class="feed-author">{{ feedInfo.author }}</p>
                    <p class="feed-episodes">{{ feedInfo.episodes?.length ?? 0 }} episodes</p>
                  </div>
                </div>
                <p v-if="addError" class="form-error">{{ addError }}</p>
                <button class="save-btn" :disabled="adding" @click="confirmAdd">
                  {{ adding ? 'Adding…' : 'Add Podcast' }}
                </button>
                <button class="cancel-btn" @click="feedInfo = null; rssUrl = ''">Back</button>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminLibraries, scanLibrary, getPodcastFeed, addPodcast, createLibrary } from '@/api/admin'
import type { AdminLibrary, PodcastFeedInfo } from '@/api/admin'
import { useSocketStore } from '@/stores/socket'

const socket = useSocketStore()

const loading    = ref(true)
const libraries  = ref<AdminLibrary[]>([])
const scanningId = ref<string | null>(null)

const showCreateLib = ref(false)
const libName       = ref('')
const libMediaType  = ref<'book' | 'podcast'>('book')
const libFolder     = ref('')
const libError      = ref('')
const creatingLib   = ref(false)

async function doCreateLib() {
  libError.value   = ''
  creatingLib.value = true
  try {
    const lib = await createLibrary(libName.value.trim(), libMediaType.value, libFolder.value.trim())
    libraries.value.push(lib)
    showCreateLib.value = false
    libName.value       = ''
    libFolder.value     = ''
  } catch (e: unknown) {
    libError.value = (e instanceof Error ? e.message : null) ?? 'Failed to create library'
  } finally { creatingLib.value = false }
}

const podcastTarget = ref<AdminLibrary | null>(null)
const rssUrl        = ref('')
const feedLoading   = ref(false)
const feedError     = ref('')
const feedInfo      = ref<PodcastFeedInfo | null>(null)
const adding        = ref(false)
const addError      = ref('')

async function scan(id: string) {
  scanningId.value = id
  try { await scanLibrary(id) } catch { /* ignore */ }
  finally { scanningId.value = null }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function openAddPodcast(lib: AdminLibrary) {
  podcastTarget.value = lib
  rssUrl.value        = ''
  feedInfo.value      = null
  feedError.value     = ''
  addError.value      = ''
}

function closeAddPodcast() {
  podcastTarget.value = null
}

async function previewFeed() {
  feedError.value   = ''
  feedLoading.value = true
  try {
    feedInfo.value = await getPodcastFeed(rssUrl.value.trim())
  } catch (e: unknown) {
    feedError.value = (e instanceof Error ? e.message : null) ?? 'Could not load feed'
  } finally {
    feedLoading.value = false
  }
}

async function confirmAdd() {
  if (!podcastTarget.value) return
  addError.value = ''
  adding.value   = true
  const folderId = podcastTarget.value.folders[0]?.id ?? ''
  try {
    await addPodcast(rssUrl.value.trim(), podcastTarget.value.id, folderId)
    closeAddPodcast()
  } catch (e: unknown) {
    addError.value = (e instanceof Error ? e.message : null) ?? 'Failed to add podcast'
  } finally {
    adding.value = false
  }
}

onMounted(async () => {
  try { libraries.value = await getAdminLibraries() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-libraries { padding: 4px 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.add-lib-btn { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 5px 12px; border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25); color: #d4a017; cursor: pointer; }
.form-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin: -4px 0 10px; }
.form-select { -webkit-appearance: none; appearance: none; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row { height: 80px; border-radius: 10px; background: #1a1a1a; animation: shimmer 1.5s infinite; background-size: 200% 100%;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.lib-list { display: flex; flex-direction: column; gap: 10px; }
.lib-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; }
.lib-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.lib-info { flex: 1; }
.lib-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
.lib-type { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; text-transform: capitalize; }
.lib-actions { display: flex; gap: 6px; }
.scan-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer; flex-shrink: 0;
}
.scan-btn.scanning { opacity: 0.6; cursor: not-allowed; }
.add-podcast-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px;
  border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; flex-shrink: 0;
}

.folder-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.folder-row { display: flex; align-items: center; gap: 6px; }
.folder-path { font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.last-scan { font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; }
.scan-progress-wrap { margin-top: 8px; }
.scan-progress-bar { height: 3px; background: #d4a017; border-radius: 2px; transition: width 0.4s ease; }
.scan-progress-label { font-size: 10px; color: rgba(255,255,255,0.4); margin: 4px 0 0; }

/* Sheet */
.sheet-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.55); }
.create-sheet { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); background: #111; overflow: hidden; }
.drag-handle-area { padding: 10px 0 4px; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.create-content { padding: 8px 20px 48px; }
.create-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
.create-subtitle { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 16px; }
.form-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.9); outline: none; margin-bottom: 10px; box-sizing: border-box; }
.form-error { font-size: 12px; color: #ef4444; margin: 0 0 10px; }
.save-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #d4a017; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; }
.feed-preview { display: flex; gap: 12px; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); }
.feed-cover { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.feed-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.feed-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.feed-author { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0; }
.feed-episodes { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

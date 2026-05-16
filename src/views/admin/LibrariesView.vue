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
            <button
              v-if="lib.mediaType === 'podcast'"
              class="scan-btn"
              :class="{ scanning: checkingEpId === lib.id }"
              :disabled="!!checkingEpId"
              @click="checkEpisodes(lib.id)"
              title="Check all podcasts for new episodes"
            >
              <v-icon size="16">{{ checkingEpId === lib.id ? 'mdi-loading' : 'mdi-refresh' }}</v-icon>
              <span>{{ checkingEpId === lib.id ? `${checkEpProgress}/${checkEpTotal}` : 'Check' }}</span>
            </button>
            <button class="scan-btn" :class="{ scanning: scanningId === lib.id }" @click="scan(lib.id)">
              <v-icon size="16">{{ scanningId === lib.id ? 'mdi-loading' : 'mdi-magnify-scan' }}</v-icon>
              <span>{{ scanningId === lib.id ? 'Scanning…' : 'Scan' }}</span>
            </button>
            <button v-if="lib.mediaType === 'book'" class="scan-btn match-btn" :class="{ scanning: matchingId === lib.id }" :disabled="!!matchingId" @click="matchBooks(lib.id)" title="Match all books with metadata providers">
              <v-icon size="16">{{ matchingId === lib.id ? 'mdi-loading' : 'mdi-book-sync-outline' }}</v-icon>
              <span>{{ matchingId === lib.id ? 'Matching…' : 'Match' }}</span>
            </button>
            <button class="edit-lib-btn" @click="openEditLib(lib)" title="Edit library">
              <v-icon size="15">mdi-pencil-outline</v-icon>
            </button>
            <button class="del-lib-btn" @click="confirmDeleteLib(lib)" title="Delete library">
              <v-icon size="15">mdi-delete-outline</v-icon>
            </button>
          </div>
        </div>
        <div class="folder-list">
          <div v-for="f in lib.folders" :key="f.id" class="folder-row">
            <v-icon size="13" color="rgba(255,255,255,0.35)">mdi-folder-outline</v-icon>
            <span class="folder-path">{{ f.fullPath }}</span>
          </div>
        </div>
        <!-- Podcast items (podcast libraries only) -->
        <div v-if="lib.mediaType === 'podcast' && podcastItems[lib.id]" class="podcast-items-list">
          <div
            v-for="p in podcastItems[lib.id]"
            :key="p.id"
            class="podcast-item-row"
            @click="router.push({ name: 'admin-podcast-detail', params: { id: p.id } })"
          >
            <v-icon size="13" color="rgba(212,160,23,0.6)">mdi-podcast</v-icon>
            <span class="podcast-item-title">{{ p.media?.metadata?.title ?? p.id }}</span>
            <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
          </div>
        </div>
        <button
          v-if="lib.mediaType === 'podcast' && !podcastItems[lib.id]"
          class="show-podcasts-btn"
          :disabled="loadingPodcastsId === lib.id"
          @click="loadPodcastItems(lib.id)"
        >
          <v-icon size="13" :class="{ spin: loadingPodcastsId === lib.id }">{{ loadingPodcastsId === lib.id ? 'mdi-loading' : 'mdi-podcast' }}</v-icon>
          {{ loadingPodcastsId === lib.id ? 'Loading…' : 'Show podcasts' }}
        </button>
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
              <AppSelect
                v-model="libMediaType"
                :options="[
                  { value: 'book', label: 'Audiobooks' },
                  { value: 'podcast', label: 'Podcasts' },
                ]"
                :full="true"
              />
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

    <!-- Edit library sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editTarget" class="sheet-backdrop" @click.self="editTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Edit Library</h3>
              <input v-model="editName" class="form-input" placeholder="Library name" />
              <div class="settings-toggle-row">
                <span class="toggle-label">Disable watcher</span>
                <button class="toggle-btn" :class="{ on: editDisableWatcher }" @click="editDisableWatcher = !editDisableWatcher">
                  <div class="toggle-knob" />
                </button>
              </div>
              <div class="settings-toggle-row">
                <span class="toggle-label">Find covers automatically</span>
                <button class="toggle-btn" :class="{ on: editFindCovers }" @click="editFindCovers = !editFindCovers">
                  <div class="toggle-knob" />
                </button>
              </div>
              <p v-if="editError" class="form-error">{{ editError }}</p>
              <button class="save-btn" :disabled="!editName.trim() || savingEdit" @click="doEditLib">
                {{ savingEdit ? 'Saving…' : 'Save' }}
              </button>
              <button class="cancel-btn" @click="editTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete library confirm -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteTarget" class="sheet-backdrop" @click.self="deleteTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Delete Library</h3>
              <p class="confirm-text">Delete <strong>{{ deleteTarget.name }}</strong>? This removes the library from ABS but does not delete files on disk.</p>
              <button class="del-confirm-btn" :disabled="deletingLib" @click="doDeleteLib">
                {{ deletingLib ? 'Deleting…' : 'Delete Library' }}
              </button>
              <button class="cancel-btn" @click="deleteTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminLibraries, scanLibrary, matchLibraryBooks, getPodcastFeed, addPodcast, createLibrary, updateLibrary, deleteLibrary, checkNewPodcastEpisodes, getLibraryPodcastItems } from '@/api/admin'
import type { AdminLibrary, PodcastFeedInfo } from '@/api/admin'
import { useSocketStore } from '@/stores/socket'
import { api } from '@/api/client'
import AppSelect from '@/components/common/AppSelect.vue'

const socket = useSocketStore()
const router = useRouter()
const podcastItems = ref<Record<string, Array<{ id: string; media?: { metadata?: { title?: string } } }>>>({})
const loadingPodcastsId = ref<string | null>(null)

const loading    = ref(true)
const libraries  = ref<AdminLibrary[]>([])
const scanningId     = ref<string | null>(null)
const matchingId     = ref<string | null>(null)
const checkingEpId   = ref<string | null>(null)
const checkEpProgress = ref(0)
const checkEpTotal    = ref(0)

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

async function matchBooks(id: string) {
  matchingId.value = id
  try { await matchLibraryBooks(id) } catch { /* ignore */ }
  finally { matchingId.value = null }
}

async function checkEpisodes(libId: string) {
  checkingEpId.value    = libId
  checkEpProgress.value = 0
  try {
    const items = await getLibraryPodcastItems(libId)
    checkEpTotal.value = items.length
    for (const item of items) {
      if (!item.id) continue
      try { await checkNewPodcastEpisodes(item.id) } catch { /* per-item errors are non-fatal */ }
      checkEpProgress.value++
    }
  } finally {
    checkingEpId.value = null
    checkEpProgress.value = 0
    checkEpTotal.value    = 0
  }
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

const editTarget        = ref<AdminLibrary | null>(null)
const editName          = ref('')
const editDisableWatcher = ref(false)
const editFindCovers    = ref(false)
const editError         = ref('')
const savingEdit        = ref(false)
const deleteTarget      = ref<AdminLibrary | null>(null)
const deletingLib       = ref(false)

function openEditLib(lib: AdminLibrary) {
  editTarget.value        = lib
  editName.value          = lib.name
  editDisableWatcher.value = lib.settings.disableWatcher
  editFindCovers.value    = false
  editError.value         = ''
}

async function doEditLib() {
  if (!editTarget.value) return
  editError.value  = ''
  savingEdit.value = true
  try {
    const updated = await updateLibrary(editTarget.value.id, {
      name:     editName.value.trim(),
      settings: { disableWatcher: editDisableWatcher.value },
    })
    const idx = libraries.value.findIndex(l => l.id === updated.id)
    if (idx >= 0) libraries.value[idx] = { ...libraries.value[idx], ...updated }
    editTarget.value = null
  } catch (e: unknown) {
    editError.value = (e instanceof Error ? e.message : null) ?? 'Failed to update library'
  } finally { savingEdit.value = false }
}

function confirmDeleteLib(lib: AdminLibrary) {
  deleteTarget.value = lib
}

async function doDeleteLib() {
  if (!deleteTarget.value) return
  deletingLib.value = true
  try {
    await deleteLibrary(deleteTarget.value.id)
    libraries.value = libraries.value.filter(l => l.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch { /* ignore */ }
  finally { deletingLib.value = false }
}

async function loadPodcastItems(libId: string) {
  loadingPodcastsId.value = libId
  try {
    const res = await api.get(`/libraries/${libId}/items`, { params: { limit: 100, page: 0 } })
    podcastItems.value = {
      ...podcastItems.value,
      [libId]: res.data?.results ?? res.data?.libraryItems ?? [],
    }
  } catch { /* ignore */ }
  finally { loadingPodcastsId.value = null }
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
.match-btn { background: rgba(100,160,255,0.08); border-color: rgba(100,160,255,0.2); color: rgba(100,160,255,0.85); }
.add-podcast-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px;
  border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; flex-shrink: 0;
}
.edit-lib-btn, .del-lib-btn {
  display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
  border-radius: 8px; background: transparent; border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; color: rgba(255,255,255,0.35); flex-shrink: 0;
}
.del-lib-btn { color: rgba(239,68,68,0.5); }

.settings-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; }
.toggle-label { font-size: 13px; color: rgba(255,255,255,0.6); }
.toggle-btn { width: 42px; height: 24px; border-radius: 12px; border: none; cursor: pointer; background: rgba(255,255,255,0.1); position: relative; transition: background 0.2s; flex-shrink: 0; }
.toggle-btn.on { background: #d4a017; }
.toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: white; position: absolute; top: 3px; left: 3px; transition: transform 0.2s; }
.toggle-btn.on .toggle-knob { transform: translateX(18px); }

.confirm-text { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 20px; line-height: 1.5; }
.confirm-text strong { color: rgba(255,255,255,0.9); }
.del-confirm-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #c0392b; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.del-confirm-btn:disabled { opacity: 0.5; }

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

.podcast-items-list { margin: 8px 0; display: flex; flex-direction: column; }
.podcast-item-row { display: flex; align-items: center; gap: 7px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
.podcast-item-row:last-child { border-bottom: none; }
.podcast-item-title { flex: 1; font-size: 12px; color: rgba(255,255,255,0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.show-podcasts-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; margin-top: 8px; }
.show-podcasts-btn:disabled { opacity: 0.5; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>

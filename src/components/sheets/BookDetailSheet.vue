<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="emit('close')">
        <div class="book-sheet" :style="{ height: `${sheet.heightPct.value}vh` }">
          <!-- Blurred cover bleed -->
          <div class="sheet-bleed">
            <img v-if="coverSrc" :src="coverSrc" class="bleed-img" aria-hidden="true" />
            <div class="bleed-scrim" />
          </div>

          <!-- Drag handle -->
          <div class="drag-handle-area" @pointerdown="sheet.onPointerDown">
            <div class="drag-handle" />
          </div>

          <!-- Scrollable content -->
          <div class="sheet-content">
            <!-- Close button -->
            <button data-testid="sheet-close" class="sheet-close" @click="emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <!-- Cover -->
            <div class="cover-container">
              <img ref="coverImgRef" :src="coverSrc" :alt="item.media.metadata.title" class="sheet-cover" />
            </div>

            <!-- Title & Authors -->
            <h2 class="sheet-title">{{ item.media.metadata.title }}</h2>
            <p v-if="item.media.metadata.subtitle" class="sheet-subtitle">{{ item.media.metadata.subtitle }}</p>
            <div class="author-chips">
              <button
                v-for="a in (item.media.metadata.authors ?? [])"
                :key="a.id"
                class="author-chip"
                @click.stop="openAuthor(a)"
              >{{ a.name }}</button>
            </div>
            <p v-if="narratorNames" class="sheet-narrator">Read by {{ narratorNames }}</p>

            <!-- Progress bar -->
            <div v-if="progress > 0 && progress < 1" class="sheet-progress-wrap">
              <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
              <span class="progress-pct">{{ Math.round(progress * 100) }}%</span>
            </div>
            <p v-if="progress >= 1" class="finished-badge">✓ Finished</p>

            <!-- Series -->
            <div v-if="allSeries.length" class="series-rows">
              <button
                v-for="s in allSeries"
                :key="s.id"
                class="series-btn"
                @click.stop="openSeries(s)"
              >{{ seriesLabel(s) }}</button>
            </div>

            <!-- Read button (ebook) -->
            <button v-if="hasEbook" class="read-btn" @click="onReadPress">
              <v-icon size="18" color="white">mdi-book-open-page-variant</v-icon>
              Read
            </button>

            <!-- Play button -->
            <button class="play-btn" :style="{ background: accent }" @click="onPlayPress">
              <v-icon size="20" color="white">{{ isThisPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
              {{ isThisPlaying ? 'Pause' : (progress > 0 && progress < 1 ? 'Continue' : 'Play') }}
            </button>

            <!-- Metadata chips -->
            <div class="chip-row">
              <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
              <span v-if="item.media.numChapters" class="chip">{{ item.media.numChapters }} chapters</span>
              <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
              <span v-if="item.media.metadata.publisher" class="chip">{{ item.media.metadata.publisher }}</span>
              <span v-for="g in (item.media.metadata.genres ?? []).slice(0, 4)" :key="g" class="chip">{{ g }}</span>
              <span v-for="t in (item.tags ?? []).slice(0, 3)" :key="t" class="chip chip--tag">{{ t }}</span>
            </div>

            <!-- Action row -->
            <div class="action-row">
              <button class="action-btn" @click="onDownload">
                <v-icon size="16">mdi-download-outline</v-icon>
                Download
              </button>
              <button class="action-btn" @click="showPlaylistAdd = true">
                <v-icon size="16">mdi-playlist-plus</v-icon>
                Playlist
              </button>
              <button class="action-btn" @click="showCollectionAdd = true">
                <v-icon size="16">mdi-bookmark-plus-outline</v-icon>
                Collection
              </button>
              <button class="action-btn" @click="toggleShare">
                <v-icon size="16">mdi-share-outline</v-icon>
                Share
              </button>
              <button v-if="auth.isAdmin" class="action-btn" @click="openEdit">
                <v-icon size="16">mdi-pencil-outline</v-icon>
                Edit
              </button>
            </div>

            <!-- Edit metadata panel -->
            <div v-if="showEdit" class="playlist-inline edit-panel">
              <p class="playlist-inline-title">Edit Metadata</p>

              <!-- Cover update -->
              <div class="cover-update-row">
                <input v-model="coverUrl_" class="edit-input" placeholder="Cover image URL" style="flex:1" />
                <button class="cover-upload-btn" @click="coverFileInput?.click()" title="Upload image file">
                  <v-icon size="16">mdi-image-plus</v-icon>
                </button>
                <input ref="coverFileInput" type="file" accept="image/*" style="display:none" @change="onCoverFile" />
              </div>
              <button v-if="coverUrl_ || coverFile" class="cover-save-btn" :disabled="coverSaving" @click="doUpdateCover">
                <v-icon size="14">{{ coverSaving ? 'mdi-loading' : 'mdi-check' }}</v-icon>
                {{ coverSaving ? 'Updating…' : 'Update cover' }}
              </button>

              <!-- Quick match -->
              <div class="qmatch-row">
                <select v-model="matchProvider" class="edit-input" style="flex:1;margin:0">
                  <option value="audible">Audible</option>
                  <option value="openlibrary">Open Library</option>
                  <option value="itunes">iTunes</option>
                  <option value="audible.ca">Audible CA</option>
                  <option value="audible.uk">Audible UK</option>
                </select>
                <button class="qmatch-btn" :disabled="matchLoading" @click="doQuickMatch">
                  <v-icon size="14">{{ matchLoading ? 'mdi-loading' : 'mdi-magnify' }}</v-icon>
                  {{ matchLoading ? 'Matching…' : 'Quick Match' }}
                </button>
              </div>
              <p v-if="matchMsg" class="match-msg" :class="{ ok: matchOk }">{{ matchMsg }}</p>

              <input v-model="editMeta.title" class="edit-input" placeholder="Title" />
              <input v-model="editMeta.subtitle" class="edit-input" placeholder="Subtitle" />
              <input v-model="editMeta.authorNames" class="edit-input" placeholder="Authors (comma-separated)" />
              <input v-model="editMeta.narratorNames" class="edit-input" placeholder="Narrators (comma-separated)" />
              <input v-model="editMeta.publishedYear" class="edit-input" placeholder="Published year" />
              <input v-model="editMeta.publisher" class="edit-input" placeholder="Publisher" />
              <input v-model="editMeta.genres" class="edit-input" placeholder="Genres (comma-separated)" />
              <input v-model="editMeta.tags" class="edit-input" placeholder="Tags (comma-separated)" />
              <textarea v-model="editMeta.description" class="edit-input edit-textarea" placeholder="Description" />
              <p v-if="editError" class="form-error-sm">{{ editError }}</p>
              <div class="share-actions">
                <button class="pls-cancel" @click="showEdit = false">Cancel</button>
                <button class="action-btn" :disabled="editSaving" style="flex:1;justify-content:center" @click="doSaveMeta">
                  {{ editSaving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </div>

            <!-- Share panel -->
            <div v-if="showShare" class="playlist-inline">
              <p class="playlist-inline-title">Share link</p>
              <div v-if="shareLoading" class="pls-loading">Loading…</div>
              <div v-else-if="shareLink" class="share-url-row">
                <input :value="shareLink.shareUrl" class="share-url-input" readonly />
                <button class="share-copy-btn" @click="copyShareLink">
                  <v-icon size="16">{{ shareCopied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                </button>
              </div>
              <p v-if="shareError" class="form-error-sm">{{ shareError }}</p>
              <div class="share-actions">
                <button v-if="shareLink" class="pls-cancel red" @click="doRemoveShare">Remove link</button>
                <button class="pls-cancel" @click="showShare = false">Close</button>
              </div>
            </div>

            <!-- Playlist picker -->
            <div v-if="showPlaylistAdd" class="playlist-inline">
              <p class="playlist-inline-title">Add to playlist</p>
              <div v-if="loadingPls" class="pls-loading">Loading…</div>
              <div v-else class="pls-list">
                <button v-for="pl in playlists" :key="pl.id" class="pls-row" @click="addToPlaylist(pl.id)">
                  <v-icon size="14" color="rgba(255,255,255,0.5)">mdi-playlist-music</v-icon>
                  <span>{{ pl.name }}</span>
                  <span class="pls-count">{{ pl.items.length }}</span>
                </button>
                <p v-if="!playlists.length" class="pls-empty">No playlists — create one in the Playlists tab</p>
              </div>
              <button class="pls-cancel" @click="showPlaylistAdd = false">Cancel</button>
            </div>

            <!-- Collection picker -->
            <div v-if="showCollectionAdd" class="playlist-inline">
              <p class="playlist-inline-title">Add to collection</p>
              <div v-if="loadingCols" class="pls-loading">Loading…</div>
              <div v-else class="pls-list">
                <button v-for="col in collections" :key="col.id" class="pls-row" @click="addToCollection(col.id)">
                  <v-icon size="14" color="rgba(255,255,255,0.5)">mdi-bookmark-multiple-outline</v-icon>
                  <span>{{ col.name }}</span>
                  <span class="pls-count">{{ col.books.length }}</span>
                </button>
                <p v-if="!collections.length" class="pls-empty">No collections — create one in Collections</p>
              </div>
              <button class="pls-cancel" @click="showCollectionAdd = false">Cancel</button>
            </div>

            <!-- Description -->
            <div v-if="item.media.metadata.description" class="sheet-desc-wrap">
              <p class="sheet-desc" :class="{ expanded: descExpanded }">
                {{ item.media.metadata.description }}
              </p>
              <button class="show-more" @click="descExpanded = !descExpanded">
                {{ descExpanded ? 'Show less' : 'Show more' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Sub-sheets -->
  <SeriesDetailSheet
    v-if="activeSeriesId"
    :show="!!activeSeriesId"
    :series-id="activeSeriesId"
    :series-name="activeSeriesName"
    @close="activeSeriesId = ''"
    @open-book="onSubSheetBook"
  />
  <AuthorDetailSheet
    v-if="activeAuthorId"
    :show="!!activeAuthorId"
    :author-id="activeAuthorId"
    :author-name="activeAuthorName"
    @close="activeAuthorId = ''"
    @open-book="onSubSheetBook"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDraggableSheet } from '@/composables/useDraggableSheet'
import { useColorThief } from '@/composables/useColorThief'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import { getDirectDownloadUrl } from '@/api/downloads'
import { getBaseUrl, api } from '@/api/client'
import { getPlaylists, addItemToPlaylist } from '@/api/playlists'
import type { Playlist } from '@/api/playlists'
import { getCollections, addBookToCollection } from '@/api/collections'
import type { Collection } from '@/api/collections'
import { createShareLink, removeShareLink } from '@/api/share'
import { matchItem } from '@/api/items'
import type { ShareLink } from '@/api/share'
import type { LibraryItem, Series, Author } from '@/api/types'

const props = defineProps<{
  item: LibraryItem
  coverSrc: string
  show: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const player = usePlayerStore()
const auth   = useAuthStore()
const sheet  = useDraggableSheet({ initial: 85, min: 30, max: 95 })

const coverImgRef = ref<HTMLImageElement | null>(null)
const { accent } = useColorThief(coverImgRef)

const descExpanded    = ref(false)
const activeSeriesId   = ref('')
const activeSeriesName = ref('')
const activeAuthorId   = ref('')
const activeAuthorName = ref('')
const showPlaylistAdd  = ref(false)
const playlists        = ref<Playlist[]>([])
const loadingPls       = ref(false)
const showCollectionAdd = ref(false)
const collections       = ref<Collection[]>([])
const loadingCols       = ref(false)
const showShare         = ref(false)
const shareLink         = ref<ShareLink | null>(null)
const shareLoading      = ref(false)
const showEdit          = ref(false)
const editSaving        = ref(false)
const editError         = ref('')
const editMeta          = ref({ title: '', subtitle: '', authorNames: '', narratorNames: '', publishedYear: '', publisher: '', genres: '', tags: '', description: '' })
const matchProvider     = ref('audible')
const matchLoading      = ref(false)
const matchMsg          = ref('')
const matchOk           = ref(false)

async function doQuickMatch() {
  matchLoading.value = true
  matchMsg.value     = ''
  try {
    const result = await matchItem(props.itemId, matchProvider.value, editMeta.value.title, editMeta.value.authorNames || undefined)
    matchOk.value  = result.updated
    matchMsg.value = result.updated ? 'Metadata updated from provider' : 'No match found'
  } catch {
    matchOk.value  = false
    matchMsg.value = 'Match request failed'
  } finally { matchLoading.value = false }
}

const coverUrl_         = ref('')
const coverFile         = ref<File | null>(null)
const coverFileInput    = ref<HTMLInputElement | null>(null)
const coverSaving       = ref(false)

function onCoverFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { coverFile.value = f; coverUrl_.value = '' }
}

async function doUpdateCover() {
  coverSaving.value = true
  try {
    if (coverFile.value) {
      const form = new FormData()
      form.append('cover', coverFile.value)
      await api.post(`/items/${props.itemId}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    } else if (coverUrl_.value.trim()) {
      await api.post(`/items/${props.itemId}/cover`, { url: coverUrl_.value.trim() })
    }
    coverUrl_.value  = ''
    coverFile.value  = null
  } catch { /* ignore */ }
  finally { coverSaving.value = false }
}
const shareError        = ref('')
const shareCopied       = ref(false)

function openSeries(s: Series) {
  activeSeriesId.value   = s.id
  activeSeriesName.value = s.name
}

function openAuthor(a: Author) {
  activeAuthorId.value   = a.id
  activeAuthorName.value = a.name
}

function onSubSheetBook(item: LibraryItem) {
  activeSeriesId.value = ''
  activeAuthorId.value = ''
  emit('close')
  // slight delay so the parent can reopen detail for new item
  setTimeout(() => { router.push({ name: 'library' }) }, 100)
  void item
}

const isThisPlaying = computed(() =>
  player.isPlaying && player.currentItem?.id === props.item.id
)

const hasEbook = computed(() => {
  const m = props.item.media as unknown as Record<string, unknown>
  return !!(m.ebookFile || m.ebookFormat)
})

async function onDownload() {
  const base = await getBaseUrl()
  const url  = getDirectDownloadUrl(props.item.id, auth.token ?? '', base)
  const a    = document.createElement('a')
  a.href     = url
  a.download = props.item.media.metadata.title + '.zip'
  a.click()
}

function onReadPress() {
  emit('close')
  router.push({ name: 'reader', query: { itemId: props.item.id } })
}

async function onPlayPress() {
  if (isThisPlaying.value) { player.togglePlay(); return }
  emit('close')
  await player.play(props.item)
  router.push({ name: 'player' })
}

const narratorNames = computed(() =>
  (props.item.media.metadata.narrators ?? []).join(', ')
)

const allSeries = computed(() => props.item.media.metadata.series ?? [])

function seriesLabel(s: Series): string {
  return s.sequence ? `${s.name} #${s.sequence}` : s.name
}

const durationLabel = computed(() => {
  const d = props.item.media.duration
  if (!d) return ''
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const progress = computed(() => props.item.userMediaProgress?.progress ?? 0)

watch(() => props.show, (v) => {
  if (v) {
    descExpanded.value = false
    showPlaylistAdd.value = false
    showCollectionAdd.value = false
    showShare.value = false
    shareLink.value = null
    showEdit.value  = false
  }
})

watch(showPlaylistAdd, async (v) => {
  if (!v || playlists.value.length) return
  loadingPls.value = true
  try { playlists.value = await getPlaylists() }
  catch { playlists.value = [] }
  finally { loadingPls.value = false }
})

async function addToPlaylist(playlistId: string) {
  await addItemToPlaylist(playlistId, props.item.id).catch(() => {})
  showPlaylistAdd.value = false
}

watch(showCollectionAdd, async (v) => {
  if (!v || collections.value.length) return
  loadingCols.value = true
  try { collections.value = await getCollections() }
  catch { collections.value = [] }
  finally { loadingCols.value = false }
})

async function addToCollection(collectionId: string) {
  await addBookToCollection(collectionId, props.item.id).catch(() => {})
  showCollectionAdd.value = false
}

async function toggleShare() {
  showShare.value = !showShare.value
  if (showShare.value && !shareLink.value) {
    shareLoading.value = true
    shareError.value = ''
    try {
      shareLink.value = await createShareLink(props.item.id)
    } catch (e: unknown) {
      shareError.value = e instanceof Error ? e.message : 'Failed to create link'
    } finally { shareLoading.value = false }
  }
}

async function copyShareLink() {
  if (!shareLink.value) return
  await navigator.clipboard.writeText(shareLink.value.shareUrl).catch(() => {})
  shareCopied.value = true
  setTimeout(() => { shareCopied.value = false }, 2000)
}

async function doRemoveShare() {
  await removeShareLink(props.item.id).catch(() => {})
  shareLink.value = null
  showShare.value = false
}

function openEdit() {
  const m = props.item.media.metadata
  editMeta.value = {
    title:         m.title ?? '',
    subtitle:      m.subtitle ?? '',
    authorNames:   (m.authors ?? []).map(a => a.name).join(', '),
    narratorNames: (m.narrators ?? []).join(', '),
    publishedYear: m.publishedYear ?? '',
    publisher:     m.publisher ?? '',
    genres:        (m.genres ?? []).join(', '),
    tags:          (props.item.tags ?? []).join(', '),
    description:   m.description ?? '',
  }
  editError.value = ''
  coverUrl_.value  = ''
  coverFile.value  = null
  showEdit.value  = true
}

async function doSaveMeta() {
  editError.value  = ''
  editSaving.value = true
  try {
    const payload = {
      metadata: {
        title:         editMeta.value.title.trim(),
        subtitle:      editMeta.value.subtitle.trim() || null,
        authorName:    editMeta.value.authorNames.trim(),
        narratorName:  editMeta.value.narratorNames.trim() || null,
        publishedYear: editMeta.value.publishedYear.trim() || null,
        publisher:     editMeta.value.publisher.trim() || null,
        genres:        editMeta.value.genres.split(',').map(g => g.trim()).filter(Boolean),
        description:   editMeta.value.description.trim() || null,
      },
      tags: editMeta.value.tags.split(',').map(t => t.trim()).filter(Boolean),
    }
    await api.patch(`/items/${props.item.id}/media`, payload)
    showEdit.value = false
  } catch {
    editError.value = 'Failed to save metadata'
  } finally {
    editSaving.value = false
  }
}
</script>

<style scoped>
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55);
}
.book-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; overflow: hidden;
  display: flex; flex-direction: column;
  transition: height 0.05s;
}
.sheet-bleed {
  position: absolute; top: 0; left: 0; right: 0; height: 45%; overflow: hidden; z-index: 0;
}
.bleed-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(28px) brightness(0.55) saturate(1.3); transform: scale(1.1);
}
.bleed-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17,17,17,1));
}
.drag-handle-area {
  position: relative; z-index: 1; padding: 10px 0 4px; cursor: grab; flex-shrink: 0;
}
.drag-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.25); margin: 0 auto;
}
.sheet-content {
  position: relative; z-index: 1; flex: 1;
  overflow-y: auto; scrollbar-width: none;
  padding: 8px 20px 40px;
}
.sheet-close {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 4px; margin-bottom: 8px; float: right;
}
.cover-container {
  display: flex; justify-content: center; margin: 8px 0 16px; clear: both;
}
.sheet-cover {
  width: 160px; height: 160px; object-fit: cover;
  border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.7);
}
.sheet-title {
  font-size: 15px; font-weight: 700; text-align: center;
  color: rgba(255,255,255,0.95); margin: 0 0 4px;
}
.sheet-subtitle {
  font-size: 12px; color: rgba(255,255,255,0.45); text-align: center; margin: 0 0 4px;
}
.author-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 0 0 4px; }
.author-chip {
  font-size: 12px; color: rgba(212,160,23,0.85); background: transparent;
  border: none; cursor: pointer; padding: 2px 0; text-decoration: underline; text-underline-offset: 2px;
}
.sheet-narrator {
  font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-progress-wrap {
  display: flex; align-items: center; gap: 8px; margin: 8px 0;
}
.sheet-progress-wrap .sheet-progress-bar {
  flex: 1; height: 3px; border-radius: 2px; background: #d4a017; transition: width 0.3s;
}
/* wrapper bg */
.sheet-progress-wrap { background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; }
.sheet-progress-wrap .sheet-progress-bar {
  position: absolute; left: 0; top: 0; height: 100%;
}
.progress-pct { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; }
.finished-badge {
  font-size: 11px; color: #22c55e; text-align: center; margin: 4px 0 8px;
}
.series-rows { margin: 0 0 8px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; }
.series-btn {
  font-size: 10px; color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  padding: 3px 10px; cursor: pointer;
}
.action-row {
  display: flex; gap: 8px; margin: 4px 0 12px;
}
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  cursor: pointer; padding: 8px 4px;
}
.playlist-inline {
  background: rgba(255,255,255,0.04); border-radius: 10px;
  padding: 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.07);
}
.playlist-inline-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.pls-loading { font-size: 12px; color: rgba(255,255,255,0.3); padding: 8px 0; }
.pls-list { display: flex; flex-direction: column; }
.pls-row {
  display: flex; align-items: center; gap: 8px; padding: 9px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.05); background: transparent;
  border-left: none; border-right: none; border-top: none;
  cursor: pointer; color: rgba(255,255,255,0.75); font-size: 13px; text-align: left;
}
.pls-count { font-size: 11px; color: rgba(255,255,255,0.3); margin-left: auto; }
.pls-empty { font-size: 11px; color: rgba(255,255,255,0.25); padding: 8px 0; text-align: center; }
.pls-cancel {
  margin-top: 10px; width: 100%; font-size: 12px; padding: 8px;
  background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.35);
}
.pls-cancel.red { color: #e05555; }
.share-url-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.share-url-input {
  flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 8px 10px; font-size: 11px; color: rgba(255,255,255,0.6);
  outline: none; min-width: 0;
}
.share-copy-btn {
  width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer; color: rgba(255,255,255,0.6);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.share-actions { display: flex; gap: 8px; }
.share-actions .pls-cancel { flex: 1; margin-top: 0; }
.form-error-sm { font-size: 11px; color: #e05555; margin: 4px 0; }
.edit-panel { gap: 8px; }
.edit-input {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 8px 10px; font-size: 12px; color: rgba(255,255,255,0.85);
  outline: none; box-sizing: border-box; font-family: inherit;
}
.edit-input::placeholder { color: rgba(255,255,255,0.3); }
.edit-textarea { height: 80px; resize: none; line-height: 1.5; }
.qmatch-row { display: flex; gap: 8px; align-items: center; width: 100%; margin-bottom: 6px; }
.qmatch-btn {
  display: flex; align-items: center; gap: 5px; white-space: nowrap; padding: 8px 12px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; font-size: 11px; cursor: pointer; flex-shrink: 0;
}
.qmatch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.match-msg { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0 0 6px; }
.match-msg.ok { color: #22c55e; }
.cover-update-row { display: flex; gap: 8px; align-items: center; width: 100%; }
.cover-upload-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer;
}
.cover-save-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 12px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer; width: 100%; justify-content: center;
}
.cover-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.read-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); cursor: pointer;
  background: rgba(255,255,255,0.06); margin: 8px 0 4px;
}
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017; margin: 4px 0 8px;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.chip {
  font-size: 9px; padding: 3px 8px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
}
.chip--tag { background: rgba(212,160,23,0.08); border-color: rgba(212,160,23,0.2); color: rgba(212,160,23,0.8); }
.sheet-desc-wrap { margin: 4px 0 16px; }
.sheet-desc {
  font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.6);
  margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.sheet-desc.expanded { display: block; }
.show-more {
  font-size: 11px; color: #d4a017; background: transparent; border: none; cursor: pointer; padding: 0;
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-sheet, .sheet-leave-active .book-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-sheet, .sheet-leave-to .book-sheet { transform: translateY(100%); }
</style>

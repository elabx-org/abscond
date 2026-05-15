<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="emit('close')">
        <div class="book-sheet" :style="{ height: `${sheet.heightPct.value}vh` }">
          <!-- Full-width bleed cover -->
          <div class="cover-bleed">
            <img ref="coverImgRef" :src="coverSrc" :alt="item.media.metadata.title" class="cover-bleed-img" crossorigin="anonymous" />
            <div class="cover-bleed-scrim" />
            <div class="cover-drag-area" @pointerdown="sheet.onPointerDown">
              <div class="cover-drag-pill" />
            </div>
          </div>

          <!-- Scrollable content -->
          <div class="sheet-content">
            <!-- Close button -->
            <button data-testid="sheet-close" class="sheet-close" @click="emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <!-- Title & Authors -->
            <h2 class="sheet-title">{{ item.media.metadata.title }}</h2>
            <p v-if="item.media.metadata.subtitle" class="sheet-subtitle">{{ item.media.metadata.subtitle }}</p>
            <div class="author-chips">
              <template v-if="item.media.metadata.authors?.length">
                <button
                  v-for="a in item.media.metadata.authors"
                  :key="a.id"
                  class="author-chip"
                  @click.stop="openAuthor(a)"
                >{{ a.name }}</button>
              </template>
              <span v-else-if="item.media.metadata.authorName" class="author-chip-plain">{{ item.media.metadata.authorName }}</span>
            </div>
            <div v-if="(item.media.metadata.narrators ?? []).length || item.media.metadata.narratorName" class="narrator-chips">
              <span class="narrator-by">Read by</span>
              <template v-if="item.media.metadata.narrators?.length">
              <button
                v-for="n in item.media.metadata.narrators"
                :key="n"
                class="author-chip"
                @click.stop="openNarrator(n)"
              >{{ n }}</button>
              </template>
              <span v-else-if="item.media.metadata.narratorName" class="author-chip-plain">{{ item.media.metadata.narratorName }}</span>
            </div>

            <!-- Progress bar -->
            <div v-if="progress > 0 && progress < 1" class="sheet-progress-wrap">
              <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
              <span class="progress-pct">{{ Math.round(progress * 100) }}%</span>
            </div>
            <p v-if="progress >= 1" class="finished-badge">✓ Finished</p>

            <!-- Star rating -->
            <div class="star-row">
              <button
                v-for="n in 5"
                :key="n"
                class="star-btn"
                @click="setRating(n)"
              >
                <v-icon size="22" :color="n <= userRating ? '#d4a017' : 'rgba(255,255,255,0.15)'">
                  {{ n <= userRating ? 'mdi-star' : 'mdi-star-outline' }}
                </v-icon>
              </button>
              <button v-if="userRating > 0" class="star-clear" @click="setRating(0)">
                <v-icon size="14" color="rgba(255,255,255,0.25)">mdi-close</v-icon>
              </button>
            </div>

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
              <span v-if="startedDateLabel" class="chip chip--date">▶ {{ startedDateLabel }}</span>
              <span v-if="finishedDateLabel" class="chip chip--date chip--finished">✓ {{ finishedDateLabel }}</span>
            </div>

            <!-- Primary action row -->
            <div class="action-row-primary">
              <button class="action-download" @click="onDownload">
                <v-icon size="15">mdi-download-outline</v-icon>
                Download
              </button>
              <button
                v-if="progress < 1"
                class="action-finished"
                :disabled="markingFinished"
                @click="markFinished"
              >
                <v-icon size="15">mdi-check-circle-outline</v-icon>
                {{ markingFinished ? 'Marking…' : 'Mark Finished' }}
              </button>
              <div v-else class="action-finished action-finished--done">
                <v-icon size="15" color="#22c55e">mdi-check-circle</v-icon>
                Finished
              </div>
              <button class="action-more" @click="showActions = true">
                <v-icon size="18">mdi-dots-horizontal</v-icon>
              </button>
            </div>

            <!-- Delete confirm -->
            <div v-if="showDeleteConfirm" class="playlist-inline">
              <p class="playlist-inline-title">Delete Item</p>
              <p class="confirm-text-sm">This will permanently delete <strong>{{ item.media.metadata.title }}</strong> from the library. Files on disk will also be deleted.</p>
              <div class="share-actions">
                <button class="pls-cancel" @click="showDeleteConfirm = false">Cancel</button>
                <button class="action-btn action-btn--danger" style="flex:1;justify-content:center" :disabled="deleting" @click="doDeleteItem">
                  {{ deleting ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
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

            <!-- Chapters -->
            <div v-if="item.media.numChapters && item.media.numChapters > 0" class="chapters-section">
              <button class="chapters-toggle" @click="toggleChapters">
                <v-icon size="15" color="rgba(255,255,255,0.5)">mdi-format-list-numbered</v-icon>
                <span class="chapters-toggle-label">Chapters ({{ item.media.numChapters }})</span>
                <v-icon size="16" color="rgba(255,255,255,0.3)">{{ chaptersExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </button>
              <div v-if="chaptersExpanded" class="chapters-list">
                <div v-if="loadingChapters" class="chapters-loading">Loading…</div>
                <button
                  v-else
                  v-for="ch in chapters"
                  :key="ch.id"
                  class="chapter-row"
                  :class="{ active: isCurrentChapter(ch) }"
                  @click="seekToChapter(ch)"
                >
                  <span class="chapter-title">{{ ch.title }}</span>
                  <span class="chapter-time">{{ chapterFormatTime(ch.start) }}</span>
                </button>
              </div>
            </div>

            <!-- Bookmarks -->
            <div v-if="bookmarks.length > 0" class="chapters-section">
              <button class="chapters-toggle" @click="bookmarksExpanded = !bookmarksExpanded">
                <v-icon size="15" color="rgba(255,255,255,0.5)">mdi-bookmark-multiple-outline</v-icon>
                <span class="chapters-toggle-label">Bookmarks ({{ bookmarks.length }})</span>
                <v-icon size="14" color="rgba(255,255,255,0.25)" class="ml-auto">{{ bookmarksExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </button>
              <div v-if="bookmarksExpanded" class="chapters-list">
                <button
                  v-for="bm in bookmarks"
                  :key="bm.time"
                  class="chapter-row"
                  @click="seekToBookmark(bm)"
                >
                  <span class="chapter-title">{{ bm.title }}</span>
                  <span class="chapter-time">{{ chapterFormatTime(bm.time) }}</span>
                </button>
              </div>
            </div>

            <!-- Listening History -->
            <div class="chapters-section">
              <button class="chapters-toggle" @click="historyExpanded = !historyExpanded">
                <v-icon size="15" color="rgba(255,255,255,0.5)">mdi-history</v-icon>
                <span class="chapters-toggle-label">Listening History</span>
                <v-icon size="14" color="rgba(255,255,255,0.25)" class="ml-auto">{{ historyExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </button>
              <div v-if="historyExpanded" class="chapters-list">
                <div v-if="loadingHistory" class="chapters-loading">Loading…</div>
                <div v-else-if="!history.length" class="chapters-loading" style="color:rgba(255,255,255,0.25)">No sessions recorded yet</div>
                <div
                  v-else
                  v-for="sess in history"
                  :key="sess.id"
                  class="history-row"
                >
                  <div class="history-date">{{ _fmtSessionDate(sess.updatedAt) }}</div>
                  <div class="history-dur">{{ _fmtSessionDur(sess.duration) }}</div>
                  <div v-if="sess.deviceInfo?.deviceName" class="history-device">{{ sess.deviceInfo.deviceName }}</div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div v-if="item.media.metadata.description" class="sheet-desc-wrap">
              <div class="sheet-desc" :class="{ expanded: descExpanded }" v-html="item.media.metadata.description" />
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
  <NarratorDetailSheet
    v-if="activeNarratorName"
    :show="!!activeNarratorName"
    :narrator-name="activeNarratorName"
    @close="activeNarratorName = ''"
    @open-book="onSubSheetBook"
  />
  <NotesSheet
    v-if="showNotes"
    v-model="showNotes"
    :item-id="item.id"
    :item-title="item.media.metadata.title"
    :accent="accentHex"
  />
    <MatchSheet
      v-model="showMatch"
      :item="props.item"
      @matched="onMatched"
    />
  <BookActionsSheet
    v-model="showActions"
    :progress="progress"
    :is-admin="auth.isAdmin"
    :goodreads-enabled="goodreadsEnabled"
    @action="handleAction"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDraggableSheet } from '@/composables/useDraggableSheet'
import { useColorThief } from '@/composables/useColorThief'
import { usePlayerStore } from '@/stores/player'
import { useNotificationStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import NarratorDetailSheet from '@/components/sheets/NarratorDetailSheet.vue'
import NotesSheet from '@/components/sheets/NotesSheet.vue'
import MatchSheet from '@/components/sheets/MatchSheet.vue'
import BookActionsSheet from '@/components/sheets/BookActionsSheet.vue'
import { getDirectDownloadUrl } from '@/api/downloads'
import { getBaseUrl, api } from '@/api/client'
import { getItem } from '@/api/items'
import { getPlaylists, addItemToPlaylist } from '@/api/playlists'
import type { Playlist } from '@/api/playlists'
import { getCollections, addBookToCollection } from '@/api/collections'
import type { Collection } from '@/api/collections'
import { createShareLink, removeShareLink } from '@/api/share'
import type { ShareLink } from '@/api/share'
import type { LibraryItem, Series, Author, Chapter } from '@/api/types'
import { getBookmarks } from '@/api/bookmarks'
import type { Bookmark } from '@/api/bookmarks'
import { getItemListeningSessions } from '@/api/stats'
import type { ListeningSession } from '@/api/stats'

const props = defineProps<{
  item: LibraryItem
  coverSrc: string
  show: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const player = usePlayerStore()
const notify = useNotificationStore()

function playNext() {
  player.addToFrontOfQueue(props.item)
  notify.show(`Will play next`, 'success')
}

function addToQueue() {
  player.addToQueue(props.item)
  notify.show(`"${props.item.media.metadata.title}" added to queue`, 'success')
}
const auth   = useAuthStore()
const sheet  = useDraggableSheet({ initial: 85, min: 30, max: 95, onClose: () => emit('close') })

const coverImgRef = ref<HTMLImageElement | null>(null)
const { accent } = useColorThief(coverImgRef)
const accentHex = computed(() => {
  const a = accent.value
  if (!a || a === 'transparent') return '#7c9ef0'
  return a
})

const descExpanded    = ref(false)
const showNotes       = ref(false)
const activeSeriesId   = ref('')
const activeSeriesName = ref('')
const activeAuthorId   = ref('')
const activeAuthorName = ref('')
const activeNarratorName = ref('')
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
const showMatch         = ref(false)
const showActions       = ref(false)
const showDeleteConfirm = ref(false)
const deleting          = ref(false)
const scanning          = ref(false)
const markingFinished   = ref(false)
const removingProgress  = ref(false)
const chaptersExpanded  = ref(false)
const loadingChapters   = ref(false)
const chapters          = ref<Chapter[]>([])
const bookmarksExpanded = ref(false)
const bookmarks         = ref<Bookmark[]>([])
const historyExpanded   = ref(false)
const history           = ref<ListeningSession[]>([])
const loadingHistory    = ref(false)

function isCurrentChapter(ch: Chapter): boolean {
  return player.currentItem?.id === props.item.id && player.currentChapter?.id === ch.id
}

function chapterFormatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

async function toggleChapters() {
  chaptersExpanded.value = !chaptersExpanded.value
  if (!chaptersExpanded.value || chapters.value.length > 0) return
  const sessionChs = player.currentItem?.id === props.item.id ? (player.session?.chapters ?? []) : []
  if (sessionChs.length > 0) { chapters.value = sessionChs; return }
  loadingChapters.value = true
  try {
    const res = await api.get(`/items/${props.item.id}`, { params: { expanded: 1 } })
    chapters.value = res.data?.media?.chapters ?? []
  } catch {}
  finally { loadingChapters.value = false }
}

async function seekToChapter(ch: Chapter) {
  if (player.currentItem?.id !== props.item.id) {
    emit('close')
    await player.play(props.item)
    await new Promise<void>(r => setTimeout(r, 600))
    player.seek(ch.start)
    router.push({ name: 'player' })
  } else {
    player.seek(ch.start)
  }
}

async function seekToBookmark(bm: Bookmark) {
  if (player.currentItem?.id !== props.item.id) {
    emit('close')
    await player.play(props.item)
    await new Promise<void>(r => setTimeout(r, 600))
    player.seek(bm.time)
    router.push({ name: 'player' })
  } else {
    player.seek(bm.time)
  }
}

async function markFinished() {
  markingFinished.value = true
  try {
    await api.patch(`/me/progress/${props.item.id}`, { isFinished: true, progress: 1, currentTime: props.item.media.duration })
    if (props.item.userMediaProgress) {
      props.item.userMediaProgress.isFinished = true
      props.item.userMediaProgress.progress   = 1
    } else {
      (props.item as typeof props.item & { userMediaProgress: unknown }).userMediaProgress = { libraryItemId: props.item.id, isFinished: true, progress: 1, currentTime: 0, duration: 0, lastUpdate: 0 }
    }
  } catch { /* ignore */ }
  finally { markingFinished.value = false }
}

async function removeProgress() {
  removingProgress.value = true
  try {
    await api.delete(`/me/progress/${props.item.id}`)
    // Hide from continue-listening by patching back to zero
    await api.patch(`/me/progress/${props.item.id}`, {
      currentTime: 0, progress: 0, isFinished: false, hideFromContinueListening: true,
    }).catch(() => {})
    if (props.item.userMediaProgress) {
      props.item.userMediaProgress.isFinished = false
      props.item.userMediaProgress.progress   = 0
    }
  } catch { /* ignore */ }
  finally { removingProgress.value = false }
}

async function doDeleteItem() {
  deleting.value = true
  try {
    await api.delete(`/items/${props.item.id}`)
    emit('close')
  } catch { /* ignore */ }
  finally { deleting.value = false }
}

async function doScan() {
  scanning.value = true
  try {
    await api.post(`/items/${props.item.id}/scan`)
    notify.show('Scan triggered', 'success')
  } catch {
    notify.show('Scan failed', 'error')
  } finally { scanning.value = false }
}

async function onMatched(itemId: string) {
  try {
    const updated = await getItem(itemId)
    const m = updated.media.metadata
    editMeta.value.title         = m.title ?? ''
    editMeta.value.subtitle      = m.subtitle ?? ''
    editMeta.value.authorNames   = m.authors?.length ? m.authors.map(a => a.name).join(', ') : (m.authorName ?? '')
    editMeta.value.narratorNames = m.narrators?.length ? m.narrators.join(', ') : (m.narratorName ?? '')
    editMeta.value.publishedYear = m.publishedYear ?? ''
    editMeta.value.publisher     = m.publisher ?? ''
    editMeta.value.genres        = m.genres?.join(', ') ?? ''
    editMeta.value.description   = m.description ?? ''
    editMeta.value.tags          = (updated.tags ?? []).join(', ')
  } catch { /* keep existing values on fetch failure */ }
}

function handleAction(id: string) {
  if      (id === 'notes')      showNotes.value         = true
  else if (id === 'playlist')   showPlaylistAdd.value   = true
  else if (id === 'collection') showCollectionAdd.value = true
  else if (id === 'share')      toggleShare()
  else if (id === 'play-next')  playNext()
  else if (id === 'queue')      addToQueue()
  else if (id === 'reset')      removeProgress()
  else if (id === 'goodreads')  openGoodreads()
  else if (id === 'match')      showMatch.value         = true
  else if (id === 'edit')       openEdit()
  else if (id === 'scan')       doScan()
  else if (id === 'delete')     showDeleteConfirm.value = true
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
      await api.post(`/items/${props.item.id}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    } else if (coverUrl_.value.trim()) {
      await api.post(`/items/${props.item.id}/cover`, { url: coverUrl_.value.trim() })
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

function openNarrator(name: string) {
  activeNarratorName.value = name
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

function _fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const goodreadsEnabled = ref(localStorage.getItem('abs_show_goodreads') === 'true')

function openGoodreads() {
  const title  = props.item.media.metadata.title
  const author = props.item.media.metadata.authors?.[0]?.name
    ?? props.item.media.metadata.authorName
    ?? ''
  const q = encodeURIComponent(`${title} ${author}`.trim())
  window.open(`https://www.goodreads.com/search?q=${q}`, '_blank', 'noopener')
}
const startedDateLabel  = computed(() => {
  const t = props.item.userMediaProgress?.startedAt
  return t ? _fmtDate(t) : ''
})
const finishedDateLabel = computed(() => {
  const t = props.item.userMediaProgress?.finishedAt
  return t ? _fmtDate(t) : ''
})

const userRating = ref(props.item.userMediaProgress?.rating ?? 0)

async function setRating(stars: number) {
  userRating.value = stars
  try {
    await api.patch(`/me/progress/${props.item.id}`, { rating: stars > 0 ? stars : null })
  } catch { /* ignore */ }
}

onBeforeUnmount(() => { document.body.style.overflow = '' })

watch(() => props.show, async (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    descExpanded.value    = false
    userRating.value      = props.item.userMediaProgress?.rating ?? 0
    showPlaylistAdd.value = false
    showCollectionAdd.value = false
    showShare.value       = false
    shareLink.value       = null
    showEdit.value        = false
    chaptersExpanded.value = false
    chapters.value         = []
    bookmarksExpanded.value = false
    bookmarks.value = await getBookmarks(props.item.id)
    historyExpanded.value  = false
    history.value          = []
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

watch(historyExpanded, async (v) => {
  if (!v || history.value.length) return
  loadingHistory.value = true
  try { history.value = await getItemListeningSessions(props.item.id) }
  finally { loadingHistory.value = false }
})

function _fmtSessionDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function _fmtSessionDur(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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
    authorNames:   m.authors?.length ? m.authors.map(a => a.name).join(', ') : (m.authorName ?? ''),
    narratorNames: m.narrators?.length ? m.narrators.join(', ') : (m.narratorName ?? ''),
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
  overscroll-behavior: contain;
}
.cover-bleed {
  position: relative; flex-shrink: 0;
  width: 100%; height: 240px; overflow: hidden;
}
.cover-bleed-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.cover-bleed-scrim {
  position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
  background: linear-gradient(to bottom, transparent, #111);
  pointer-events: none;
}
.cover-drag-area {
  position: absolute; top: 0; left: 0; right: 0;
  padding: 12px 0 8px; cursor: grab; touch-action: none;
  display: flex; justify-content: center;
}
.cover-drag-pill {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.4);
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
.author-chip-plain { font-size: 12px; color: rgba(255,255,255,0.6); }
.narrator-chips { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; margin: 0 0 10px; }
.narrator-by { font-size: 11px; color: rgba(255,255,255,0.3); }
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
.star-row { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 8px 0 4px; }
.star-btn { background: transparent; border: none; cursor: pointer; padding: 2px; }
.star-clear { background: transparent; border: none; cursor: pointer; padding: 2px; margin-left: 4px; }
.series-rows { margin: 0 0 8px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; }
.series-btn {
  font-size: 10px; color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  padding: 3px 10px; cursor: pointer;
}
.action-row-primary {
  display: flex; gap: 8px; margin: 4px 0 12px;
}
.action-download, .action-finished {
  flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px; cursor: pointer;
}
.action-finished:disabled { opacity: 0.5; cursor: not-allowed; }
.action-finished--done {
  cursor: default; color: rgba(34,197,94,0.7);
  background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.15);
}
.action-more {
  width: 44px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px; cursor: pointer; color: rgba(255,255,255,0.5);
}
.confirm-text-sm { font-size: 12px; color: rgba(255,255,255,0.55); margin: 0 0 12px; line-height: 1.5; }
.confirm-text-sm strong { color: rgba(255,255,255,0.85); }
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
.chip--date { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
.chip--finished { color: rgba(34,197,94,0.7); border-color: rgba(34,197,94,0.2); background: rgba(34,197,94,0.06); }
.chapters-section { margin: 12px 0 4px; }
.chapters-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: transparent; border: none; cursor: pointer;
  padding: 10px 0; color: rgba(255,255,255,0.7); text-align: left;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.chapters-toggle-label { flex: 1; font-size: 13px; font-weight: 600; }
.chapters-list { padding: 4px 0 8px; }
.chapters-loading { font-size: 12px; color: rgba(255,255,255,0.3); padding: 8px 0; }
.chapter-row {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: transparent; border: none; cursor: pointer; padding: 9px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04); text-align: left;
}
.chapter-row.active .chapter-title { color: #d4a017; }
.chapter-title { flex: 1; font-size: 12px; color: rgba(255,255,255,0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-time { font-size: 11px; color: rgba(255,255,255,0.35); flex-shrink: 0; font-variant-numeric: tabular-nums; }

.history-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.history-date { font-size: 11px; color: rgba(255,255,255,0.35); min-width: 56px; }
.history-dur { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); }
.history-device { font-size: 11px; color: rgba(255,255,255,0.25); margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }

.sheet-desc-wrap { margin: 4px 0 16px; }
.sheet-desc {
  font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.6);
  margin: 0 0 4px;
  max-height: 9.6em; overflow: hidden; position: relative;
}
.sheet-desc.expanded { max-height: none; }
.sheet-desc :deep(p) { margin: 0 0 0.5em; }
.sheet-desc :deep(p:last-child) { margin-bottom: 0; }
.sheet-desc :deep(a) { color: #d4a017; text-decoration: none; }
.sheet-desc :deep(b), .sheet-desc :deep(strong) { color: rgba(255,255,255,0.8); font-weight: 600; }
.sheet-desc :deep(br) { display: block; content: ''; margin-bottom: 0.25em; }
.show-more {
  font-size: 11px; color: #d4a017; background: transparent; border: none; cursor: pointer; padding: 0;
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-sheet, .sheet-leave-active .book-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-sheet, .sheet-leave-to .book-sheet { transform: translateY(100%); }
</style>

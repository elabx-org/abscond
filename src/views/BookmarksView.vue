<template>
  <div class="bookmarks-view">
    <div class="view-header">
      <h2 class="screen-title">Bookmarks</h2>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !groupedBookmarks.length" class="empty-state">
      <v-icon size="48" color="rgba(255,255,255,0.1)">mdi-bookmark-outline</v-icon>
      <p>No bookmarks yet</p>
      <p class="empty-sub">Bookmarks you add while listening will appear here</p>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="skel-list">
      <div v-for="n in 5" :key="n" class="skel-row">
        <div class="skel-cover" />
        <div class="skel-lines">
          <div class="skel-line long" />
          <div class="skel-line short" />
        </div>
      </div>
    </div>

    <!-- Grouped by book -->
    <div v-else>
      <div v-for="group in groupedBookmarks" :key="group.itemId" class="book-group">
        <div class="group-header" @click="group.expanded = !group.expanded">
          <img :src="coverUrl(group.itemId, auth.token ?? '')" class="group-cover" />
          <div class="group-meta">
            <p class="group-title">{{ group.title }}</p>
            <p class="group-count">{{ group.bookmarks.length }} bookmark{{ group.bookmarks.length !== 1 ? 's' : '' }}</p>
          </div>
          <v-icon size="18" color="rgba(255,255,255,0.3)">
            {{ group.expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </div>

        <Transition name="expand">
          <div v-if="group.expanded" class="bookmark-list">
            <div
              v-for="bm in group.bookmarks"
              :key="bm.time"
              class="bookmark-row"
            >
              <div class="bookmark-time">{{ formatTime(bm.time) }}</div>
              <div class="bookmark-meta">
                <p class="bookmark-title">{{ bm.title }}</p>
              </div>
              <button class="bm-play-btn" @click="playFrom(group.itemId, bm.time, group.item)">
                <v-icon size="18" color="#d4a017">mdi-play-circle</v-icon>
              </button>
              <button class="bm-del-btn" @click="removeBookmark(group.itemId, bm.time, bm)">
                <v-icon size="16" color="rgba(255,255,255,0.3)">mdi-trash-can-outline</v-icon>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <BookDetailSheet
      v-if="selectedItem"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { coverUrl } from '@/api/client'
import { deleteBookmark } from '@/api/bookmarks'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'
import type { Bookmark } from '@/api/bookmarks'
import { api } from '@/api/client'

const auth   = useAuthStore()
const lib    = useLibraryStore()
const player = usePlayerStore()
const router = useRouter()

const loading      = ref(false)
const selectedItem = ref<LibraryItem | null>(null)

interface BookmarkGroup {
  itemId:    string
  title:     string
  item:      LibraryItem
  bookmarks: Bookmark[]
  expanded:  boolean
}

const groups = ref<BookmarkGroup[]>([])

const groupedBookmarks = computed(() => groups.value)

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

async function playFrom(_itemId: string, time: number, item: LibraryItem) {
  await player.play(item)
  player.seek(time)
  router.push({ name: 'player' })
}

async function removeBookmark(itemId: string, time: number, bm: Bookmark) {
  await deleteBookmark(itemId, time).catch(() => {})
  const g = groups.value.find(g => g.itemId === itemId)
  if (g) {
    g.bookmarks = g.bookmarks.filter(b => b.time !== bm.time)
    if (!g.bookmarks.length) groups.value = groups.value.filter(g => g.itemId !== itemId)
  }
}

async function load() {
  if (!lib.activeLibraryId) return
  loading.value = true
  try {
    // Fetch all bookmarks across library items
    const res = await api.get('/me/bookmarks')
    const allBookmarks: Array<Bookmark & { libraryItemId: string }> = res.data ?? []

    // Group by libraryItemId
    const byItem: Record<string, Array<Bookmark & { libraryItemId: string }>> = {}
    for (const bm of allBookmarks) {
      if (!byItem[bm.libraryItemId]) byItem[bm.libraryItemId] = []
      byItem[bm.libraryItemId].push(bm)
    }

    // Load library items for metadata
    const itemIds = Object.keys(byItem)
    const itemsMap: Record<string, LibraryItem> = {}
    await Promise.allSettled(itemIds.map(async id => {
      const r = await api.get(`/items/${id}`)
      itemsMap[id] = r.data
    }))

    groups.value = itemIds
      .filter(id => itemsMap[id])
      .map(id => ({
        itemId:    id,
        title:     itemsMap[id].media.metadata.title,
        item:      itemsMap[id],
        bookmarks: byItem[id].sort((a, b) => a.time - b.time),
        expanded:  true,
      }))
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  load()
})
</script>

<style scoped>
.bookmarks-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 80px; }
.view-header { margin-bottom: 20px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 80px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.empty-sub { font-size: 12px; color: rgba(255,255,255,0.25); max-width: 220px; }

.skel-list { display: flex; flex-direction: column; gap: 12px; }
.skel-row { display: flex; gap: 12px; align-items: center; }
.skel-cover { width: 48px; height: 48px; border-radius: 6px; flex-shrink: 0; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skel-line.long { width: 70%; }
.skel-line.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.book-group { margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.group-header {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: rgba(255,255,255,0.03); cursor: pointer;
}
.group-cover { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.group-meta { flex: 1; min-width: 0; }
.group-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-count { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.bookmark-list { padding: 0 12px; }
.bookmark-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.bookmark-row:last-child { border-bottom: none; }
.bookmark-time {
  font-size: 11px; font-weight: 600; color: #d4a017;
  min-width: 40px; font-variant-numeric: tabular-nums;
}
.bookmark-meta { flex: 1; min-width: 0; }
.bookmark-title { font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bm-play-btn, .bm-del-btn { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }

.expand-enter-active, .expand-leave-active { transition: max-height 0.25s ease, opacity 0.25s; overflow: hidden; max-height: 500px; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
</style>

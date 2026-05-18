<template>
  <div
    class="upcoming-view"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <Transition name="ptr">
      <div v-if="ptr.pulling" class="ptr-indicator">
        <AppIcon icon="mdi-arrow-down" :size="18" color="rgba(255,255,255,0.5)" />
      </div>
    </Transition>
    <div class="view-header">
      <h2 class="screen-title">Upcoming</h2>
      <div class="header-actions">
        <button v-if="!scanning" class="refresh-btn" @click="startScan(true)" :title="cacheAgeLabel">
          <AppIcon icon="mdi-refresh" :size="18" color="rgba(255,255,255,0.5)" />
        </button>
        <div class="region-pill" @click="showRegionPicker = true">
          <span>{{ region.toUpperCase() }}</span>
          <AppIcon icon="mdi-chevron-down" :size="12" color="rgba(255,255,255,0.4)" />
        </div>
      </div>
    </div>

    <!-- Scanning progress -->
    <Transition name="fade">
      <div v-if="scanning" class="scan-card">
        <div class="scan-top">
          <AppIcon icon="mdi-loading" :size="18" color="#d4a017" class="spin" />
          <span class="scan-title">Scanning series…</span>
          <button class="scan-cancel" @click="cancelScan">Cancel</button>
        </div>
        <div class="scan-bar-wrap">
          <div class="scan-bar" :style="{ width: `${scanPct}%` }" />
        </div>
        <p class="scan-current">{{ progress.current || 'Loading…' }}</p>
        <p class="scan-count">{{ progress.done }} / {{ progress.total }} series</p>
      </div>
    </Transition>

    <!-- Stale cache warning -->
    <Transition name="fade">
      <div v-if="!scanning && isCacheStale && books.length" class="stale-banner">
        <AppIcon icon="mdi-clock-outline" :size="14" color="rgba(255,255,255,0.4)" />
        <span>Last scan was {{ cacheAgeLabel }} — tap refresh to update</span>
      </div>
    </Transition>

    <!-- Empty / no ASIN state -->
    <div v-if="!scanning && !books.length && !firstLoad" class="empty-state">
      <AppIcon icon="mdi-calendar-clock-outline" :size="48" color="rgba(255,255,255,0.1)" />
      <p class="empty-title">No upcoming releases found</p>
      <p class="empty-sub">This scans series in your library that have Audible ASINs. Make sure your books were matched to Audible metadata.</p>
      <button class="scan-btn" @click="startScan(true)">Scan now</button>
    </div>

    <!-- First load skeleton -->
    <div v-if="firstLoad" class="skel-list">
      <div v-for="n in 6" :key="n" class="skel-row">
        <div class="skel-cover" />
        <div class="skel-lines">
          <div class="skel-line long" />
          <div class="skel-line short" />
          <div class="skel-line medium" />
        </div>
      </div>
    </div>

    <!-- Results -->
    <div v-if="!firstLoad && books.length" class="books-list">
      <!-- Section: Upcoming -->
      <div v-if="upcomingBooks.length">
        <p class="list-section-label">Coming soon</p>
        <div
          v-for="book in upcomingBooks"
          :key="book.asin"
          class="book-row"
          @click="openBook(book)"
        >
          <div class="book-cover-wrap">
            <img v-if="book.coverUrl" :src="book.coverUrl" class="book-cover" />
            <div v-else class="book-cover-placeholder">
              <AppIcon icon="mdi-headphones" :size="22" color="rgba(255,255,255,0.2)" />
            </div>
            <div v-if="book.inLibrary" class="owned-badge">
              <AppIcon icon="mdi-check" :size="10" color="#22c55e" />
            </div>
          </div>
          <div class="book-meta">
            <p class="book-title">{{ book.title }}</p>
            <p class="book-author">{{ book.authors }}</p>
            <p class="book-series">{{ book.seriesName }}<span v-if="book.seriesPosition"> · #{{ book.seriesPosition }}</span></p>
          </div>
          <div class="book-right">
            <span class="book-date upcoming">{{ fmtDate(book.releaseDate) }}</span>
            <span v-if="book.runtimeMinutes" class="book-runtime">{{ fmtRuntime(book.runtimeMinutes) }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Recent (last 60 days) -->
      <div v-if="recentBooks.length">
        <p class="list-section-label">Recently released</p>
        <div
          v-for="book in recentBooks"
          :key="book.asin"
          class="book-row"
          @click="openBook(book)"
        >
          <div class="book-cover-wrap">
            <img v-if="book.coverUrl" :src="book.coverUrl" class="book-cover" />
            <div v-else class="book-cover-placeholder">
              <AppIcon icon="mdi-headphones" :size="22" color="rgba(255,255,255,0.2)" />
            </div>
            <div v-if="book.inLibrary" class="owned-badge">
              <AppIcon icon="mdi-check" :size="10" color="#22c55e" />
            </div>
          </div>
          <div class="book-meta">
            <p class="book-title">{{ book.title }}</p>
            <p class="book-author">{{ book.authors }}</p>
            <p class="book-series">{{ book.seriesName }}<span v-if="book.seriesPosition"> · #{{ book.seriesPosition }}</span></p>
          </div>
          <div class="book-right">
            <span class="book-date recent">{{ fmtDate(book.releaseDate) }}</span>
            <span v-if="book.runtimeMinutes" class="book-runtime">{{ fmtRuntime(book.runtimeMinutes) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Region picker bottom sheet -->
    <v-bottom-sheet v-model="showRegionPicker">
      <div class="region-sheet">
        <p class="region-title">Audible region</p>
        <div class="region-grid">
          <button
            v-for="r in REGIONS"
            :key="r.code"
            class="region-btn"
            :class="{ active: region === r.code }"
            @click="setRegion(r.code)"
          >
            <span class="region-code">{{ r.code.toUpperCase() }}</span>
            <span class="region-name">{{ r.name }}</span>
          </button>
        </div>
      </div>
    </v-bottom-sheet>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { scanUpcoming, loadCache, clearCache, type UpcomingBook, type ScanProgress } from '@/api/upcoming'

const lib = useLibraryStore()

const ptr = ref({ pulling: false, startY: 0 })

function onTouchStart(e: TouchEvent) {
  if (window.scrollY > 0) return
  ptr.value.startY = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (!ptr.value.startY) return
  ptr.value.pulling = e.touches[0].clientY - ptr.value.startY > 40
}

function onTouchEnd() {
  if (ptr.value.pulling) startScan(true)
  ptr.value.pulling = false
  ptr.value.startY = 0
}

const books     = ref<UpcomingBook[]>([])
const scanning  = ref(false)
const firstLoad = ref(true)
const progress  = ref<ScanProgress>({ total: 0, done: 0, current: '' })
const region    = ref(localStorage.getItem('abs_audible_region') ?? 'us')
const showRegionPicker = ref(false)
const cacheTs   = ref(parseInt(localStorage.getItem('abs_upcoming_ts') ?? '0'))

let abortController: AbortController | null = null

const REGIONS = [
  { code: 'us', name: 'United States' }, { code: 'uk', name: 'United Kingdom' },
  { code: 'au', name: 'Australia' },     { code: 'ca', name: 'Canada' },
  { code: 'de', name: 'Germany' },       { code: 'fr', name: 'France' },
  { code: 'it', name: 'Italy' },         { code: 'es', name: 'Spain' },
  { code: 'jp', name: 'Japan' },         { code: 'in', name: 'India' },
]

const today = new Date().toISOString().slice(0, 10)
const upcomingBooks = computed(() => books.value.filter(b => b.releaseDate >= today))
const recentBooks   = computed(() => books.value.filter(b => b.releaseDate < today))
const scanPct       = computed(() => progress.value.total ? (progress.value.done / progress.value.total) * 100 : 0)

const isCacheStale = computed(() => {
  if (!cacheTs.value) return false
  return Date.now() - cacheTs.value > 7 * 86400_000
})

const cacheAgeLabel = computed(() => {
  if (!cacheTs.value) return ''
  const days = Math.floor((Date.now() - cacheTs.value) / 86400_000)
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  return `Updated ${days} days ago`
})

async function startScan(force = false) {
  if (scanning.value) return
  if (!force) {
    const cached = loadCache()
    if (cached) { books.value = cached; firstLoad.value = false; return }
  } else {
    clearCache()
  }

  if (!lib.activeLibraryId) {
    firstLoad.value = false; return
  }

  scanning.value = true
  firstLoad.value = false
  abortController = new AbortController()

  try {
    const result = await scanUpcoming(
      lib.activeLibraryId,
      region.value,
      (p) => { progress.value = p },
      abortController.signal,
    )
    books.value = result
    cacheTs.value = parseInt(localStorage.getItem('abs_upcoming_ts') ?? '0')
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.error('[Upcoming]', e)
  } finally {
    scanning.value = false
  }
}

function cancelScan() {
  abortController?.abort()
  scanning.value = false
}

function setRegion(r: string) {
  region.value = r
  localStorage.setItem('abs_audible_region', r)
  showRegionPicker.value = false
  clearCache()
  startScan(true)
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRuntime(mins: number): string {
  const h = Math.floor(mins / 60); const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function openBook(book: UpcomingBook) {
  window.open(`https://www.audible.com/pd/${book.asin}`, '_blank', 'noopener')
}

onMounted(() => {
  if (!lib.libraries.length) lib.fetchLibraries().then(() => startScan())
  else startScan()
})
onBeforeUnmount(() => { abortController?.abort() })
</script>

<style scoped>
.upcoming-view { min-height: 100dvh; background: #0e0e0e; padding: 16px 12px 80px; }

.ptr-indicator { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 8px; background: rgba(14,14,14,0.85); backdrop-filter: blur(4px); }
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s, transform 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; transform: translateY(-100%); }

.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.refresh-btn { background: transparent; border: none; cursor: pointer; padding: 6px; display: flex; }
.region-pill {
  display: flex; align-items: center; gap: 4px; padding: 5px 10px;
  background: rgba(255,255,255,0.06); border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
}
.region-pill span { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.6); }

.scan-card {
  background: #111; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
  padding: 14px; margin-bottom: 20px;
}
.scan-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.scan-title { font-size: 13px; color: rgba(255,255,255,0.8); flex: 1; }
.scan-cancel { font-size: 11px; color: rgba(255,255,255,0.3); background: transparent; border: none; cursor: pointer; padding: 0; }
.scan-bar-wrap { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
.scan-bar { height: 100%; background: #d4a017; border-radius: 2px; transition: width 0.3s ease; }
.scan-current { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scan-count { font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; }

.stale-banner {
  display: flex; align-items: center; gap: 6px; padding: 8px 12px;
  background: rgba(255,255,255,0.04); border-radius: 8px;
  font-size: 11px; color: rgba(255,255,255,0.35); margin-bottom: 12px;
}

.empty-state { text-align: center; padding: 60px 20px; }
.empty-title { font-size: 15px; color: rgba(255,255,255,0.6); margin: 12px 0 8px; }
.empty-sub { font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.5; max-width: 280px; margin: 0 auto 20px; }
.scan-btn {
  padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(212,160,23,0.15); color: #d4a017; font-size: 13px; font-weight: 600;
}

.skel-list { display: flex; flex-direction: column; gap: 12px; }
.skel-row { display: flex; gap: 12px; align-items: flex-start; }
.skel-cover { width: 56px; height: 72px; border-radius: 6px; background: #1a1a1a; flex-shrink: 0; }
.skel-lines { flex: 1; padding-top: 4px; display: flex; flex-direction: column; gap: 8px; }
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; }
.skel-line.long { width: 70%; }
.skel-line.short { width: 40%; }
.skel-line.medium { width: 55%; }

.list-section-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;
}
.books-list { display: flex; flex-direction: column; gap: 0; }
.books-list > div { margin-bottom: 20px; }

.book-row {
  display: flex; align-items: flex-start; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer;
}
.book-row:last-child { border-bottom: none; }
.book-cover-wrap { position: relative; flex-shrink: 0; }
.book-cover { width: 52px; height: 68px; border-radius: 6px; object-fit: cover; background: #1a1a1a; display: block; }
.book-cover-placeholder {
  width: 52px; height: 68px; border-radius: 6px; background: #1a1a1a;
  display: flex; align-items: center; justify-content: center;
}
.owned-badge {
  position: absolute; top: -4px; right: -4px; width: 16px; height: 16px;
  background: rgba(34,197,94,0.2); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(34,197,94,0.4);
}
.book-meta { flex: 1; min-width: 0; padding-top: 2px; }
.book-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 3px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-series { font-size: 11px; color: rgba(212,160,23,0.6); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; padding-top: 2px; }
.book-date { font-size: 11px; font-weight: 700; white-space: nowrap; }
.book-date.upcoming { color: #d4a017; }
.book-date.recent { color: rgba(255,255,255,0.4); }
.book-runtime { font-size: 10px; color: rgba(255,255,255,0.25); }

.region-sheet { background: #111; padding: 20px 16px 32px; border-radius: 16px 16px 0 0; }
.region-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0 0 16px; }
.region-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.region-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03); cursor: pointer; text-align: left;
}
.region-btn.active { border-color: rgba(212,160,23,0.5); background: rgba(212,160,23,0.1); }
.region-code { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.8); }
.region-btn.active .region-code { color: #d4a017; }
.region-name { font-size: 10px; color: rgba(255,255,255,0.35); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

<template>
  <div class="stats-view">
    <h2 class="screen-title">Stats</h2>

    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 4" :key="n" class="stat-skeleton" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="stat-cards">
        <div class="stat-card">
          <p class="stat-value">{{ totalHours }}<span class="stat-unit">h</span></p>
          <p class="stat-label">Total listening</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ totalBooksFinished }}</p>
          <p class="stat-label">Books finished</p>
        </div>
        <div class="stat-card" v-if="libStats">
          <p class="stat-value">{{ libStats.totalItems }}</p>
          <p class="stat-label">Library items</p>
        </div>
        <div class="stat-card" v-if="libStats">
          <p class="stat-value">{{ libStats.numAuthors }}</p>
          <p class="stat-label">Authors</p>
        </div>
      </div>

      <!-- Library stats -->
      <section v-if="libStats" class="section">
        <p class="section-label">Library</p>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-key">Total duration</span>
            <span class="info-val">{{ formatHours(libStats.totalDuration) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Total size</span>
            <span class="info-val">{{ formatSize(libStats.totalSize) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Series</span>
            <span class="info-val">{{ libStats.numSeries }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Genres</span>
            <span class="info-val">{{ libStats.numGenres }}</span>
          </div>
        </div>
      </section>

      <!-- Daily chart -->
      <section v-if="chartData.length" class="section">
        <div class="chart-section-header">
          <p class="section-label" style="margin: 0">Last 30 days</p>
          <span class="chart-total">{{ chartPeriodHours.toFixed(1) }}h total</span>
        </div>
        <div class="chart-wrap">
          <div class="chart-bars">
            <div
              v-for="(d, i) in chartData"
              :key="d.label"
              class="chart-col"
            >
              <div
                class="chart-bar"
                :class="{ today: d.isToday }"
                :style="{ height: `${Math.max(d.pct, d.hours > 0 ? 4 : 0)}%` }"
                :title="`${d.label}: ${d.hours.toFixed(1)}h`"
              />
              <span v-if="i % 7 === 0 || d.isToday" class="chart-day-label" :class="{ today: d.isToday }">
                {{ d.isToday ? 'T' : d.weekLabel }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent sessions -->
      <section v-if="sessions.length" class="section">
        <div class="section-row-header">
          <p class="section-label" style="margin:0">Listening History</p>
          <span class="session-total-count">{{ sessionTotal }} sessions</span>
        </div>
        <div class="session-rows">
          <div v-for="s in sessions" :key="s.id" class="session-row">
            <img :src="coverUrl(s.libraryItemId, auth.token ?? '')" class="session-cover" />
            <div class="session-meta">
              <p class="session-title">{{ s.displayTitle }}</p>
              <p class="session-sub">{{ s.displayAuthor }} · {{ formatDate(s.updatedAt) }}</p>
            </div>
            <span class="session-dur">{{ formatMinutes(s.duration) }}</span>
          </div>
        </div>
        <button v-if="sessions.length < sessionTotal" class="load-more-btn" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading…' : `Load more (${sessionTotal - sessions.length} remaining)` }}
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { getUserStats, getLibraryStats, getListeningSessions } from '@/api/stats'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import type { UserStats, LibraryStats, ListeningSession } from '@/api/stats'

const lib  = useLibraryStore()
const auth = useAuthStore()
const loading     = ref(true)
const loadingMore = ref(false)
const sessionPage = ref(0)

const userStats    = ref<UserStats | null>(null)
const libStats     = ref<LibraryStats | null>(null)
const sessions     = ref<ListeningSession[]>([])
const sessionTotal = ref(0)

const totalHours = computed(() => {
  const secs = userStats.value?.totalTime ?? userStats.value?.totalListeningTime ?? 0
  return Math.round(secs / 3600)
})

const totalBooksFinished = computed(() =>
  userStats.value?.booksListeningStats?.completedBooks
  ?? userStats.value?.totalBooksFinished
  ?? 0
)

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const chartData = computed(() => {
  const days = userStats.value?.days ?? userStats.value?.booksListeningStats?.days
  if (!days) return []
  const now = Date.now()
  const todayKey = new Date().toISOString().slice(0, 10)
  const result: { label: string; weekLabel: string; hours: number; pct: number; isToday: boolean }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const secs = days[key] ?? 0
    result.push({
      label:     key.slice(5),
      weekLabel: DAY_ABBR[d.getDay()],
      hours:     secs / 3600,
      pct:       0,
      isToday:   key === todayKey,
    })
  }
  const max = Math.max(...result.map(r => r.hours), 0.001)
  result.forEach(r => { r.pct = (r.hours / max) * 100 })
  return result
})

const chartPeriodHours = computed(() =>
  chartData.value.reduce((sum, d) => sum + d.hours, 0)
)

function formatHours(secs: number): string {
  const h = Math.floor(secs / 3600)
  return `${h}h`
}

function formatSize(bytes: number): string {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function formatMinutes(secs: number): string {
  const m = Math.round(secs / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function loadMore() {
  loadingMore.value = true
  try {
    sessionPage.value++
    const more = await getListeningSessions(sessionPage.value)
    sessions.value.push(...more.sessions)
  } catch { /* ignore */ }
  finally { loadingMore.value = false }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  loading.value = true
  try {
    const [uStats, sess] = await Promise.all([
      getUserStats(),
      getListeningSessions(0),
    ])
    userStats.value = uStats
    sessions.value  = sess.sessions
    sessionTotal.value = sess.total
    if (lib.activeLibraryId) {
      libStats.value = await getLibraryStats(lib.activeLibraryId)
    }
  } catch { /* silently ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.stats-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 60px; }

.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 20px; }

.loading-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.stat-skeleton {
  flex: 1; min-width: 140px; height: 80px; border-radius: 12px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.stat-cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.stat-card {
  flex: 1; min-width: 130px; background: #111;
  border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
  padding: 14px 16px;
}
.stat-value {
  font-size: 28px; font-weight: 700; color: #d4a017; margin: 0 0 4px; line-height: 1;
}
.stat-unit { font-size: 16px; }
.stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }

.section { margin-bottom: 24px; }
.section-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;
}

.info-rows {
  background: #111; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.info-row:last-child { border-bottom: none; }
.info-key { font-size: 13px; color: rgba(255,255,255,0.6); }
.info-val { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }

.chart-section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.chart-total { font-size: 11px; color: rgba(212,160,23,0.7); }

.chart-wrap {
  background: #111; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 14px 14px 4px;
}
.chart-bars {
  display: flex; align-items: flex-end; gap: 2px; height: 80px;
}
.chart-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: flex-end; height: 100%;
}
.chart-bar {
  width: 100%; border-radius: 2px 2px 0 0;
  background: rgba(212,160,23,0.5); transition: opacity 0.2s;
  align-self: flex-end;
}
.chart-bar.today { background: #d4a017; }
.chart-bar:hover { opacity: 1; }
.chart-day-label {
  font-size: 7px; color: rgba(255,255,255,0.2);
  margin-top: 3px; line-height: 1; white-space: nowrap;
}
.chart-day-label.today { color: #d4a017; }

.session-rows {
  background: #111; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.session-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.session-row:last-child { border-bottom: none; }
.session-cover { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.session-meta { flex: 1; min-width: 0; }
.session-title {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8);
  margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.session-sub {
  font-size: 10px; color: rgba(255,255,255,0.35); margin: 0;
}
.session-dur { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; }

.section-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.session-total-count { font-size: 10px; color: rgba(255,255,255,0.25); }

.load-more-btn {
  width: 100%; margin-top: 8px; padding: 10px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer;
}
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.load-more-btn:not(:disabled):hover { background: rgba(255,255,255,0.06); }
</style>

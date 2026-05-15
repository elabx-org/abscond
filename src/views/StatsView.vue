<template>
  <div class="stats-view">
    <h2 class="screen-title">Stats</h2>

    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 4" :key="n" class="stat-skeleton" />
    </div>

    <template v-else>
      <!-- Hero stat -->
      <div class="hero-stat">
        <p class="hero-value">{{ totalHoursDecimal }}<span class="hero-unit">h</span></p>
        <p class="hero-label">Total listening time</p>
      </div>

      <!-- Period + streak cards -->
      <div class="period-cards">
        <div class="period-card">
          <p class="period-value">{{ thisWeekHours.toFixed(1) }}<span class="period-unit">h</span></p>
          <p class="period-label">This week</p>
        </div>
        <div class="period-card">
          <p class="period-value">{{ thisMonthHours.toFixed(1) }}<span class="period-unit">h</span></p>
          <p class="period-label">This month</p>
        </div>
        <div class="period-card">
          <p class="period-value">{{ longestStreak }}</p>
          <p class="period-label">Best streak</p>
          <p class="period-sublabel">days</p>
        </div>
        <div class="period-card">
          <p class="period-value">{{ totalBooksFinished }}</p>
          <p class="period-label">Finished</p>
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

      <!-- Most listened -->
      <section v-if="topItems.length" class="section">
        <p class="section-label">Most Listened</p>
        <div class="top-items">
          <div v-for="(item, i) in topItems" :key="item.title" class="top-item-row">
            <span class="top-item-rank">{{ i + 1 }}</span>
            <div class="top-item-meta">
              <p class="top-item-title">{{ item.title }}</p>
              <p v-if="item.author" class="top-item-author">{{ item.author }}</p>
            </div>
            <div class="top-item-right">
              <span class="top-item-dur">{{ formatMinutes(item.totalSeconds) }}</span>
              <span class="top-item-sessions">{{ item.sessionCount }} session{{ item.sessionCount === 1 ? '' : 's' }}</span>
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
        <div ref="sessionSentinel" class="session-sentinel" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
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
const sessionSentinel = ref<HTMLElement | null>(null)
let sessionObserver: IntersectionObserver | null = null

const userStats    = ref<UserStats | null>(null)
const libStats     = ref<LibraryStats | null>(null)
const sessions     = ref<ListeningSession[]>([])
const sessionTotal = ref(0)

const totalHoursDecimal = computed(() => {
  const secs = userStats.value?.totalTime ?? userStats.value?.totalListeningTime ?? 0
  return (secs / 3600).toFixed(1)
})

const _dayMap = computed(() =>
  userStats.value?.days ?? userStats.value?.booksListeningStats?.days ?? {}
)

const thisWeekHours = computed(() => {
  const map = _dayMap.value
  let total = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    total += (map[key] ?? 0) / 3600
  }
  return total
})

const thisMonthHours = computed(() => {
  const map = _dayMap.value
  let total = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    total += (map[key] ?? 0) / 3600
  }
  return total
})

const longestStreak = computed(() => {
  const map = _dayMap.value
  const keys = Object.keys(map).sort()
  if (!keys.length) return 0
  let longest = 0, current = 0
  let prevDate: Date | null = null
  for (const key of keys) {
    if ((map[key] ?? 0) <= 0) { current = 0; prevDate = null; continue }
    const d = new Date(key)
    if (prevDate) {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / 86400000)
      if (diffDays === 1) { current++ } else { current = 1 }
    } else { current = 1 }
    prevDate = d
    if (current > longest) longest = current
  }
  return longest
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

interface TopItem { title: string; author: string; totalSeconds: number; sessionCount: number }
const topItems = computed<TopItem[]>(() => {
  const byTitle = new Map<string, TopItem>()
  for (const s of sessions.value) {
    const title = s.displayTitle || ''
    if (!title) continue
    const author = s.displayAuthor || ''
    const existing = byTitle.get(title)
    if (existing) {
      existing.totalSeconds += s.duration ?? 0
      existing.sessionCount++
    } else {
      byTitle.set(title, { title, author, totalSeconds: s.duration ?? 0, sessionCount: 1 })
    }
  }
  return [...byTitle.values()]
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 5)
})

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
  if (loadingMore.value || sessions.value.length >= sessionTotal.value) return
  loadingMore.value = true
  try {
    sessionPage.value++
    const more = await getListeningSessions(sessionPage.value)
    sessions.value.push(...more.sessions)
  } catch { /* ignore */ }
  finally { loadingMore.value = false }
}

onBeforeUnmount(() => { sessionObserver?.disconnect() })

watch(sessionSentinel, (el) => {
  if (el && sessionObserver) sessionObserver.observe(el)
})

onMounted(async () => {
  sessionObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && sessions.value.length < sessionTotal.value && !loadingMore.value) {
      loadMore()
    }
  }, { rootMargin: '200px' })
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
  finally {
    loading.value = false
    if (sessionSentinel.value) sessionObserver?.observe(sessionSentinel.value)
  }
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

.hero-stat {
  text-align: center; padding: 24px 0 20px; margin-bottom: 4px;
}
.hero-value {
  font-size: 56px; font-weight: 800; color: #d4a017; margin: 0; line-height: 1;
}
.hero-unit { font-size: 28px; }
.hero-label {
  font-size: 12px; color: rgba(255,255,255,0.4); margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.5px;
}

.period-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; }
.period-card {
  background: #111; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
  padding: 14px 16px; display: flex; flex-direction: column;
}
.period-value {
  font-size: 26px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; line-height: 1;
}
.period-unit { font-size: 14px; color: rgba(255,255,255,0.6); }
.period-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.period-sublabel { font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; }

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

.session-sentinel { height: 1px; }

.top-items {
  background: #111; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.top-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.top-item-row:last-child { border-bottom: none; }
.top-item-rank {
  font-size: 13px; font-weight: 700; color: rgba(212,160,23,0.6);
  width: 18px; flex-shrink: 0; text-align: center;
}
.top-item-meta { flex: 1; min-width: 0; }
.top-item-title {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85);
  margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.top-item-author {
  font-size: 10px; color: rgba(255,255,255,0.3); margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.top-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.top-item-dur { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); }
.top-item-sessions { font-size: 9px; color: rgba(255,255,255,0.2); }
</style>

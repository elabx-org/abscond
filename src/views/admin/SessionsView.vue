<template>
  <div class="admin-sessions">
    <div class="section-header">
      <div class="header-text">
        <h3 class="section-title">Listening Sessions</h3>
        <p v-if="!loading && total > 0" class="session-count">{{ total.toLocaleString() }} sessions</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <div v-else-if="sessions.length === 0" class="empty-state">
      <v-icon size="40" color="rgba(255,255,255,0.2)">mdi-headphones-off</v-icon>
      <p class="empty-text">No sessions found</p>
    </div>

    <div v-else class="session-list">
      <template v-for="s in sessions" :key="s.id">
        <div class="session-row">
          <v-icon size="20" color="rgba(255,255,255,0.3)" class="session-icon">mdi-headphones</v-icon>
          <div class="session-info">
            <p class="session-title">{{ s.displayTitle }}</p>
            <p class="session-meta">
              <span class="meta-dim">{{ s.displayAuthor }}</span>
              <template v-if="s.user?.username">
                <span class="meta-sep">·</span>
                <span class="meta-user">{{ s.user.username }}</span>
              </template>
              <span class="meta-sep">·</span>
              <span class="meta-date">{{ fmtDate(s.updatedAt) }}</span>
            </p>
          </div>
          <div class="session-right">
            <span class="session-duration">{{ fmtDuration(s.timeListening > 0 ? s.timeListening : s.duration) }}</span>
            <button class="del-btn" @click="toggleConfirm(s.id)">
              <v-icon size="18">mdi-delete-outline</v-icon>
            </button>
          </div>
        </div>
        <div v-if="confirmId === s.id" class="confirm-row">
          <span class="confirm-label">Delete this session?</span>
          <button class="confirm-yes" :disabled="deleting" @click="doDelete(s.id)">
            {{ deleting ? 'Deleting…' : 'Confirm delete' }}
          </button>
          <button class="confirm-cancel" @click="confirmId = null">Cancel</button>
        </div>
      </template>
    </div>

    <div v-if="!loading && total > sessions.length" class="load-more-wrap">
      <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAllSessions, deleteSession } from '@/api/admin'
import type { GlobalSession } from '@/api/admin'

const loading     = ref(true)
const loadingMore = ref(false)
const sessions    = ref<GlobalSession[]>([])
const total       = ref(0)
const page        = ref(0)

const confirmId = ref<string | null>(null)
const deleting  = ref(false)

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

function toggleConfirm(id: string) {
  confirmId.value = confirmId.value === id ? null : id
}

async function doDelete(id: string) {
  deleting.value = true
  try {
    await deleteSession(id)
    sessions.value  = sessions.value.filter(s => s.id !== id)
    total.value     = Math.max(0, total.value - 1)
    confirmId.value = null
  } catch { /* ignore */ }
  finally { deleting.value = false }
}

async function loadMore() {
  loadingMore.value = true
  try {
    page.value++
    const result = await getAllSessions({ page: page.value, itemsPerPage: 20 })
    sessions.value.push(...result.sessions)
    total.value = result.total
  } catch { /* ignore */ }
  finally { loadingMore.value = false }
}

onMounted(async () => {
  try {
    const result = await getAllSessions({ page: 0, itemsPerPage: 20 })
    sessions.value = result.sessions
    total.value    = result.total
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-sessions { padding: 4px 0; }

.section-header  { margin-bottom: 16px; }
.header-text     { display: flex; flex-direction: column; gap: 2px; }
.section-title   { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.session-count   { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0; }

.loading-state { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 64px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 48px 0; color: rgba(255,255,255,0.3);
}
.empty-text { font-size: 13px; margin: 0; }

.session-list { display: flex; flex-direction: column; }

.session-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.session-icon { flex-shrink: 0; }
.session-info { flex: 1; min-width: 0; }
.session-title {
  font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9);
  margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.session-meta  { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin: 0; }
.meta-dim      { font-size: 11px; color: rgba(255,255,255,0.35); }
.meta-sep      { font-size: 11px; color: rgba(255,255,255,0.2); }
.meta-user     { font-size: 11px; color: #d4a017; }
.meta-date     { font-size: 10px; color: rgba(255,255,255,0.35); }

.session-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.session-duration { font-size: 12px; color: rgba(255,255,255,0.5); white-space: nowrap; }

.del-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.3); padding: 4px; border-radius: 6px;
  transition: color 0.15s;
}
.del-btn:hover { color: rgba(220,50,50,0.8); }

.confirm-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0 12px 32px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.confirm-label { font-size: 12px; color: rgba(255,255,255,0.5); flex: 1; }
.confirm-yes {
  font-size: 12px; padding: 5px 12px; border-radius: 7px;
  background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.3);
  color: #e05555; cursor: pointer;
}
.confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }
.confirm-cancel {
  font-size: 12px; padding: 5px 12px; border-radius: 7px;
  background: transparent; border: none;
  color: rgba(255,255,255,0.4); cursor: pointer;
}

.load-more-wrap { display: flex; justify-content: center; padding: 20px 0 4px; }
.load-more-btn {
  font-size: 13px; padding: 9px 24px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; transition: opacity 0.15s;
}
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.load-more-btn:not(:disabled):active { opacity: 0.65; }
</style>

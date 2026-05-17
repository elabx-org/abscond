<template>
  <div class="user-detail-view">
    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <template v-else-if="user">
      <!-- Hero card -->
      <div class="user-hero-card">
        <div class="hero-avatar">{{ user.username[0].toUpperCase() }}</div>
        <div class="hero-meta">
          <p class="hero-name">{{ user.username }}</p>
          <div class="hero-badges">
            <span class="badge" :class="user.type">{{ user.type }}</span>
            <span v-if="!user.isActive" class="badge inactive">inactive</span>
          </div>
          <p v-if="user.lastSeen" class="hero-seen">Last seen {{ timeAgo(user.lastSeen) }}</p>
        </div>
        <button v-if="user.type !== 'root'" class="edit-fab" @click="showEdit = true">
          <AppIcon icon="mdi-pencil-outline" :size="18" />
        </button>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-pill">
          <p class="pill-value">{{ totalHours }}</p>
          <p class="pill-label">Hours listened</p>
        </div>
        <div class="stat-pill">
          <p class="pill-value">{{ finishedCount }}</p>
          <p class="pill-label">Finished</p>
        </div>
        <div class="stat-pill">
          <p class="pill-value">{{ sessionTotal }}</p>
          <p class="pill-label">Sessions</p>
        </div>
      </div>

      <!-- Sessions -->
      <p class="section-label">Listening History</p>

      <div v-if="sessionsLoading && !sessions.length" class="loading-wrap">
        <div v-for="n in 4" :key="n" class="skel-row" />
      </div>
      <div v-else-if="!sessions.length" class="empty-state">
        <AppIcon icon="mdi-headphones" :size="32" color="rgba(255,255,255,0.1)" />
        <p>No listening sessions yet</p>
      </div>
      <div v-else class="session-list">
        <div v-for="s in sessions" :key="s.id" class="session-row">
          <img :src="coverUrl(s.libraryItemId, auth.token ?? '')" class="session-cover" />
          <div class="session-meta">
            <p class="session-title">{{ s.displayTitle }}</p>
            <p class="session-sub">{{ s.displayAuthor }} · {{ formatDate(s.updatedAt) }}</p>
          </div>
          <span class="session-dur">{{ formatMinutes(s.duration) }}</span>
        </div>
        <div ref="sentinel" class="sentinel" />
      </div>
    </template>

    <div v-else class="empty-state">
      <AppIcon icon="mdi-account-off" :size="32" color="rgba(255,255,255,0.1)" />
      <p>User not found</p>
    </div>

    <!-- Edit permissions sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showEdit && user" class="sheet-backdrop" @click.self="showEdit = false">
          <div class="edit-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="edit-content">
              <h3 class="edit-title">Edit — {{ user.username }}</h3>
              <div class="perm-row" @click="editActive = !editActive">
                <div class="perm-info"><p class="perm-label">Active</p><p class="perm-sub">Allow user to log in</p></div>
                <div class="toggle" :class="{ on: editActive }"><div class="toggle-thumb" /></div>
              </div>
              <div class="perm-divider" />
              <div v-for="perm in permKeys" :key="perm.key" class="perm-row" @click="editPerms[perm.key] = !editPerms[perm.key]">
                <div class="perm-info"><p class="perm-label">{{ perm.label }}</p><p class="perm-sub">{{ perm.desc }}</p></div>
                <div class="toggle" :class="{ on: editPerms[perm.key] }"><div class="toggle-thumb" /></div>
              </div>
              <div class="perm-divider" />
              <div class="pw-reset-section">
                <p class="pw-reset-label">Reset Password</p>
                <input v-model="newPw" class="form-input" type="password" placeholder="New password" autocomplete="new-password" />
                <button class="pw-reset-btn" :disabled="!newPw.trim() || pwSaving" @click="doResetPw">
                  {{ pwSaving ? 'Updating…' : 'Update Password' }}
                </button>
                <p v-if="pwError" class="form-error">{{ pwError }}</p>
              </div>
              <p v-if="editError" class="form-error">{{ editError }}</p>
              <button class="save-btn" :disabled="editSaving" @click="doSaveEdit">
                {{ editSaving ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getUsers, getUserSessions, updateUser } from '@/api/admin/index'
import type { AdminUser, AdminUserPermissions } from '@/api/admin/index'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'

const route = useRoute()
const auth  = useAuthStore()

const userId = computed(() => route.params.id as string)

const loading         = ref(true)
const user            = ref<AdminUser | null>(null)
const sessions        = ref<Array<{ id: string; libraryItemId: string; displayTitle: string; displayAuthor: string; duration: number; updatedAt: number; isFinished?: boolean }>>([])
const sessionsLoading = ref(false)
const sessionTotal    = ref(0)
const sessionPage     = ref(0)
const sentinel        = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const showEdit   = ref(false)
const editActive = ref(true)
const editSaving = ref(false)
const editError  = ref('')
const newPw      = ref('')
const pwSaving   = ref(false)
const pwError    = ref('')
const editPerms  = reactive<Record<string, boolean>>({
  download: true, update: true, delete: false, upload: false,
  accessAllLibraries: true, accessAllTags: true, accessExplicitContent: false,
})

const permKeys = [
  { key: 'download',              label: 'Download',          desc: 'Download audio files' },
  { key: 'update',                label: 'Update Items',      desc: 'Edit library item metadata' },
  { key: 'delete',                label: 'Delete Items',      desc: 'Delete books and podcasts' },
  { key: 'upload',                label: 'Upload',            desc: 'Upload new library items' },
  { key: 'accessAllLibraries',    label: 'All Libraries',     desc: 'Access all libraries' },
  { key: 'accessAllTags',         label: 'All Tags',          desc: 'Access items with any tag' },
  { key: 'accessExplicitContent', label: 'Explicit Content',  desc: 'Access explicit items' },
]

const totalHours = computed(() => {
  const secs = sessions.value.reduce((sum, s) => sum + (s.duration ?? 0), 0)
  return (secs / 3600).toFixed(1) + 'h'
})

const finishedCount = computed(() => sessions.value.filter(s => s.isFinished).length)

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatMinutes(secs: number) {
  const m = Math.round(secs / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function loadMoreSessions() {
  if (sessionsLoading.value || sessions.value.length >= sessionTotal.value) return
  sessionsLoading.value = true
  try {
    sessionPage.value++
    const more = await getUserSessions(userId.value, sessionPage.value)
    sessions.value.push(...more.sessions)
    sessionTotal.value = more.total
  } catch { /* ignore */ }
  finally { sessionsLoading.value = false }
}

async function doResetPw() {
  if (!user.value || !newPw.value.trim()) return
  pwSaving.value = true; pwError.value = ''
  try {
    await updateUser(user.value.id, { password: newPw.value })
    newPw.value = ''
  } catch (e: unknown) {
    pwError.value = e instanceof Error ? e.message : 'Failed'
  } finally { pwSaving.value = false }
}

async function doSaveEdit() {
  if (!user.value) return
  editSaving.value = true; editError.value = ''
  try {
    await updateUser(user.value.id, {
      isActive: editActive.value,
      permissions: editPerms as unknown as Partial<AdminUserPermissions>,
    })
    user.value = { ...user.value, isActive: editActive.value }
    showEdit.value = false
  } catch (e: unknown) {
    editError.value = e instanceof Error ? e.message : 'Failed to save'
  } finally { editSaving.value = false }
}

watch(sentinel, (el) => { if (el && observer) observer.observe(el) })
onBeforeUnmount(() => observer?.disconnect())

onMounted(async () => {
  observer = new IntersectionObserver(
    (entries) => { if (entries[0]?.isIntersecting) loadMoreSessions() },
    { rootMargin: '200px' }
  )
  loading.value = true
  try {
    const [users, sess] = await Promise.all([
      getUsers(),
      getUserSessions(userId.value, 0),
    ])
    user.value = users.find(u => u.id === userId.value) ?? null
    if (user.value) {
      editActive.value = user.value.isActive
      const p = user.value.permissions
      if (p) Object.assign(editPerms, p)
    }
    sessions.value     = sess.sessions
    sessionTotal.value = sess.total
  } catch { /* ignore */ }
  finally {
    loading.value = false
    if (sentinel.value) observer.observe(sentinel.value)
  }
})
</script>

<style scoped>
.user-detail-view { padding: 4px 0; }

.loading-wrap { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 52px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.user-hero-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 16px; margin-bottom: 14px;
}
.hero-avatar {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: rgba(212,160,23,0.2); color: #d4a017;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
}
.hero-meta { flex: 1; }
.hero-name  { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 5px; }
.hero-badges { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.badge { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.badge.admin { background: rgba(212,160,23,0.15); color: #d4a017; }
.badge.root  { background: rgba(220,50,50,0.15);  color: #e05555; }
.badge.inactive { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }
.hero-seen { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
.edit-fab {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer; color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center;
}

.stats-row {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;
}
.stat-pill {
  background: #111; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 14px 12px; text-align: center;
}
.pill-value { font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 3px; line-height: 1; }
.pill-label { font-size: 10px; color: rgba(255,255,255,0.4); margin: 0; }

.section-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}

.session-list { display: flex; flex-direction: column; }
.session-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.session-row:last-of-type { border-bottom: none; }
.session-cover { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.session-meta { flex: 1; min-width: 0; }
.session-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-sub   { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }
.session-dur   { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; flex-shrink: 0; }
.sentinel { height: 1px; }

/* Edit sheet */
.sheet-backdrop { position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.55); }
.edit-sheet { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); background: #111; max-height: 85vh; overflow-y: auto; scrollbar-width: none; }
.edit-sheet::-webkit-scrollbar { display: none; }
.drag-handle-area { padding: 10px 0 4px; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.edit-content { padding: 8px 20px 48px; }
.edit-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }
.perm-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
.perm-info { flex: 1; }
.perm-label { font-size: 13px; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.perm-sub   { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
.perm-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 6px 0; }
.toggle { width: 42px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.12); position: relative; transition: background 0.2s; flex-shrink: 0; cursor: pointer; }
.toggle.on { background: #d4a017; }
.toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; }
.toggle.on .toggle-thumb { left: 21px; }
.pw-reset-section { padding: 8px 0; }
.pw-reset-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.form-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.9); outline: none; margin-bottom: 8px; box-sizing: border-box; }
.pw-reset-btn { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer; }
.pw-reset-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.form-error { font-size: 12px; color: #e05555; margin: 4px 0; }
.save-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #d4a017; color: white; font-size: 15px; font-weight: 700; margin-top: 12px; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

@media (min-width: 768px) {
  .edit-sheet { width: 480px; left: 50%; transform: translateX(-50%); border-radius: 20px; bottom: auto; top: 50%; margin-top: -300px; }
  .stats-row { grid-template-columns: repeat(3, 200px); }
}
</style>

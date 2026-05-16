# Abscond Admin Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill all 8 admin/feature gaps identified in the audit: admin overview dashboard, server settings expansion, notifications tab, user detail view, podcast episode management, metadata provider config, server info in settings, and downloads section — all scaling correctly on desktop.

**Architecture:** Each new admin tab is a self-contained Vue 3 SFC added under `src/views/admin/`. New API functions go in `src/api/admin/index.ts` (typed additions only). AdminLayout gets a desktop-responsive upgrade and new tabs. SettingsView gets two new lightweight sections. All components follow the established dark-theme token set.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Pinia, Vue Router, Axios (`api` from `@/api/client`), Vitest, MDI icons via Vuetify

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/api/admin/index.ts` | Modify | Add `getServerInfo`, `getUserSessions`, `purgeCache`, `getNotificationSettings`, `updateNotificationSettings`, `getNotifications`, `patchNotification`, `testNotification`, `downloadPodcastEpisode`, `deletePodcastEpisode` + new interfaces |
| `src/api/admin/admin.test.ts` | Create | Tests for all new API functions |
| `src/views/admin/AdminLayout.vue` | Modify | Add Overview + Notifications tabs; desktop-responsive max-width + side-label layout |
| `src/views/admin/OverviewView.vue` | Create | Server stats + Purge Cache + Scan All actions |
| `src/views/admin/ServerSettingsView.vue` | Modify | 8 new settings fields (cover provider, backup schedule, log retention, bookshelf view, token age, scan all file types) |
| `src/views/admin/NotificationsView.vue` | Create | Apprise URL config + event toggle list with Test buttons |
| `src/views/admin/UserDetailView.vue` | Create | User hero card + stats + infinite-scroll session history + inline edit sheet |
| `src/views/admin/UsersView.vue` | Modify | Username tap → navigate to UserDetailView instead of opening edit sheet |
| `src/views/admin/PodcastDetailView.vue` | Create | Two-tab view: Downloaded episodes + Feed episodes; per-podcast settings card |
| `src/views/admin/LibrariesView.vue` | Modify | Podcast library-item tap → navigate to PodcastDetailView |
| `src/views/SettingsView.vue` | Modify | Server info rows in Abscond section + admin-only Downloads section |
| `src/router/index.ts` | Modify | Add routes: `admin/overview`, `admin/notifications`, `admin/users/:id`, `admin/podcast/:id`; change admin default redirect to `overview` |

---

## Task 1: Admin API Layer — New Endpoints + Types

**Files:**
- Modify: `src/api/admin/index.ts`
- Create: `src/api/admin/admin.test.ts`

- [ ] **Step 1: Write failing tests for new API functions**

Create `src/api/admin/admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getServerInfo,
  getUserSessions,
  purgeCache,
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  patchNotification,
  testNotification,
  downloadPodcastEpisode,
  deletePodcastEpisode,
} from './index'

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/api/client'

beforeEach(() => vi.clearAllMocks())

describe('getServerInfo', () => {
  it('returns version from /server/info', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { version: '2.4.0' } })
    const info = await getServerInfo()
    expect(api.get).toHaveBeenCalledWith('/server/info')
    expect(info.version).toBe('2.4.0')
  })
  it('returns fallback on error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('fail'))
    const info = await getServerInfo()
    expect(info.version).toBe('—')
  })
})

describe('getUserSessions', () => {
  it('fetches paginated sessions for a user', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { sessions: [{ id: 's1', duration: 3600 }], total: 1 } })
    const result = await getUserSessions('u1', 0)
    expect(api.get).toHaveBeenCalledWith('/users/u1/listening-sessions', { params: { itemsPerPage: 20, page: 0 } })
    expect(result.sessions).toHaveLength(1)
    expect(result.total).toBe(1)
  })
  it('returns empty on error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('fail'))
    const result = await getUserSessions('u1', 0)
    expect(result.sessions).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

describe('purgeCache', () => {
  it('POSTs to /cache/purge', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    await purgeCache()
    expect(api.post).toHaveBeenCalledWith('/cache/purge')
  })
})

describe('getNotificationSettings', () => {
  it('fetches notification settings', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { settings: { appriseApiUrl: 'http://test' } } })
    const s = await getNotificationSettings()
    expect(s.appriseApiUrl).toBe('http://test')
    expect(api.get).toHaveBeenCalledWith('/notificationSettings')
  })
})

describe('getNotifications', () => {
  it('returns notification events array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { notifications: [{ id: 'n1', eventName: 'onBackupCompleted', enabled: true }] } })
    const result = await getNotifications()
    expect(result).toHaveLength(1)
    expect(result[0].eventName).toBe('onBackupCompleted')
  })
})

describe('testNotification', () => {
  it('GETs the test endpoint for a notification', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true } })
    await testNotification('n1')
    expect(api.get).toHaveBeenCalledWith('/notifications/n1/test')
  })
})

describe('downloadPodcastEpisode', () => {
  it('POSTs download-episodes with episodeId array', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    await downloadPodcastEpisode('item1', 'ep1')
    expect(api.post).toHaveBeenCalledWith('/podcasts/item1/download-episodes', { episodeIds: ['ep1'] })
  })
})

describe('deletePodcastEpisode', () => {
  it('DELETEs the episode without hard delete', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: {} })
    await deletePodcastEpisode('item1', 'ep1')
    expect(api.delete).toHaveBeenCalledWith('/podcasts/item1/episodes/ep1', { params: { hard: 0 } })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /config/workspace/gh/abs-ui && npm run test -- src/api/admin/admin.test.ts 2>&1 | tail -20
```

Expected: multiple FAIL lines — functions not found.

- [ ] **Step 3: Add new types and functions to `src/api/admin/index.ts`**

Append after the existing `getLibraryPodcastItems` function:

```typescript
export interface ServerInfo {
  version: string
}

export interface UserSession {
  id: string
  libraryItemId: string
  episodeId?: string | null
  displayTitle: string
  displayAuthor: string
  duration: number
  updatedAt: number
  isFinished?: boolean
}

export interface UserSessionsResult {
  sessions: UserSession[]
  total: number
}

export interface NotificationSettings {
  appriseApiUrl?: string | null
  appriseType?: string
  maxFailedAttempts?: number
  maxNotificationAttempts?: number
  nextAttemptDelay?: number
}

export interface NotificationEvent {
  id: string
  eventName: string
  urls: string[]
  titleTemplate: string
  bodyTemplate: string
  enabled: boolean
  type: string
  lastFiredAt?: number | null
  numTimesFired: number
}

export interface PodcastEpisodeFile {
  id: string
  index?: number
  title: string
  description?: string | null
  duration: number
  publishedAt?: number | null
  size?: number
  audioFile?: { duration: number; metadata?: { size?: number } }
  downloaded?: boolean
}

export async function getServerInfo(): Promise<ServerInfo> {
  try {
    const res = await api.get('/server/info')
    return { version: res.data?.version ?? '—' }
  } catch {
    return { version: '—' }
  }
}

export async function getUserSessions(userId: string, page: number): Promise<UserSessionsResult> {
  try {
    const res = await api.get(`/users/${userId}/listening-sessions`, {
      params: { itemsPerPage: 20, page },
    })
    return {
      sessions: res.data?.sessions ?? [],
      total:    res.data?.total    ?? 0,
    }
  } catch {
    return { sessions: [], total: 0 }
  }
}

export async function purgeCache(): Promise<void> {
  await api.post('/cache/purge')
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await api.get('/notificationSettings')
  return res.data?.settings ?? res.data ?? {}
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<void> {
  await api.patch('/notificationSettings', data)
}

export async function getNotifications(): Promise<NotificationEvent[]> {
  const res = await api.get('/notifications')
  return res.data?.notifications ?? []
}

export async function patchNotification(id: string, data: Partial<NotificationEvent>): Promise<void> {
  await api.patch(`/notifications/${id}`, data)
}

export async function testNotification(id: string): Promise<void> {
  await api.get(`/notifications/${id}/test`)
}

export async function downloadPodcastEpisode(itemId: string, episodeId: string): Promise<void> {
  await api.post(`/podcasts/${itemId}/download-episodes`, { episodeIds: [episodeId] })
}

export async function deletePodcastEpisode(itemId: string, episodeId: string): Promise<void> {
  await api.delete(`/podcasts/${itemId}/episodes/${episodeId}`, { params: { hard: 0 } })
}
```

Also extend the `ServerSettings` interface by replacing it with:

```typescript
export interface ServerSettings {
  id: string
  scannerFindCovers: boolean
  scannerCoverProvider: string
  scannerParseSubtitle: boolean
  scannerScanAllFileTypes: boolean
  coverAspectRatio: number
  bookshelfView: number
  sortingIgnorePrefix: boolean
  storeCoverWithItem: boolean
  chromecastEnabled: boolean
  logLevel: number
  version: string
  numBackupsToKeep: number
  backupSchedule: string
  loggerDailyLogsToKeep: number
  loggerScannerLogsToKeep: number
  authTokenAge: string
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
cd /config/workspace/gh/abs-ui && npm run test -- src/api/admin/admin.test.ts 2>&1 | tail -20
```

Expected: all PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/api/admin/index.ts src/api/admin/admin.test.ts && git commit -m "feat(api): add server info, user sessions, notifications, podcast episode, purge cache endpoints"
```

---

## Task 2: AdminLayout — Desktop Responsive + New Tabs

**Files:**
- Modify: `src/views/admin/AdminLayout.vue`
- Modify: `src/router/index.ts`

- [ ] **Step 1: Replace `src/views/admin/AdminLayout.vue`**

```vue
<template>
  <div class="admin-layout">
    <div class="admin-topbar">
      <button class="back-btn" @click="router.push({ name: 'settings' })">
        <v-icon size="20">mdi-arrow-left</v-icon>
      </button>
      <span class="admin-title">Admin Panel</span>
    </div>

    <div class="admin-subnav">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="subnav-tab"
        :class="{ active: route.name === tab.name }"
        @click="router.push({ name: tab.name })"
      >
        <v-icon size="16">{{ tab.icon }}</v-icon>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="admin-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()

const tabs = [
  { name: 'admin-overview',       label: 'Overview',       icon: 'mdi-view-dashboard-outline' },
  { name: 'admin-libraries',      label: 'Libraries',      icon: 'mdi-bookshelf' },
  { name: 'admin-users',          label: 'Users',          icon: 'mdi-account-group' },
  { name: 'admin-settings',       label: 'Settings',       icon: 'mdi-cog' },
  { name: 'admin-backups',        label: 'Backups',        icon: 'mdi-backup-restore' },
  { name: 'admin-notifications',  label: 'Notifications',  icon: 'mdi-bell-outline' },
  { name: 'admin-logs',           label: 'Logs',           icon: 'mdi-text-box-outline' },
  { name: 'admin-upload',         label: 'Upload',         icon: 'mdi-upload' },
]
</script>

<style scoped>
.admin-layout { min-height: 100vh; background: #0e0e0e; }

.admin-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 10;
  background: rgba(14,14,14,0.92); backdrop-filter: blur(12px);
}
.back-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.6); padding: 4px;
}
.admin-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); }

.admin-subnav {
  display: flex; overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 0 16px;
}
.admin-subnav::-webkit-scrollbar { display: none; }
.subnav-tab {
  display: flex; align-items: center; gap: 5px; flex-shrink: 0;
  padding: 10px 14px; background: transparent; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 12px; color: rgba(255,255,255,0.4); transition: all 0.15s;
}
.subnav-tab.active { color: #d4a017; border-bottom-color: #d4a017; }

.admin-content { padding: 16px 16px 80px; }

@media (min-width: 768px) {
  .admin-topbar { padding: 14px 32px; }
  .admin-subnav { padding: 0 32px; }
  .admin-content { padding: 24px 32px 80px; max-width: 1100px; margin: 0 auto; }
  .subnav-tab { padding: 12px 18px; font-size: 13px; }
}

@media (min-width: 1280px) {
  .admin-content { max-width: 1200px; }
}
</style>
```

- [ ] **Step 2: Update router — add new routes, change default redirect**

In `src/router/index.ts`, replace the `admin` children block:

```typescript
{
  path: 'admin',
  component: () => import('@/views/admin/AdminLayout.vue'),
  meta: { requiresAdmin: true },
  children: [
    { path: '',              redirect: 'overview' },
    { path: 'overview',      name: 'admin-overview',      component: () => import('@/views/admin/OverviewView.vue') },
    { path: 'libraries',     name: 'admin-libraries',     component: () => import('@/views/admin/LibrariesView.vue') },
    { path: 'users',         name: 'admin-users',         component: () => import('@/views/admin/UsersView.vue') },
    { path: 'users/:id',     name: 'admin-user-detail',   component: () => import('@/views/admin/UserDetailView.vue') },
    { path: 'settings',      name: 'admin-settings',      component: () => import('@/views/admin/ServerSettingsView.vue') },
    { path: 'backups',       name: 'admin-backups',       component: () => import('@/views/admin/BackupsView.vue') },
    { path: 'notifications', name: 'admin-notifications', component: () => import('@/views/admin/NotificationsView.vue') },
    { path: 'logs',          name: 'admin-logs',          component: () => import('@/views/admin/LogsView.vue') },
    { path: 'upload',        name: 'admin-upload',        component: () => import('@/views/admin/UploadView.vue') },
    { path: 'podcast/:id',   name: 'admin-podcast-detail',component: () => import('@/views/admin/PodcastDetailView.vue') },
  ],
},
```

- [ ] **Step 3: Run tests to confirm router changes don't break anything**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS (no router unit tests exist, but existing API tests must still pass).

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/AdminLayout.vue src/router/index.ts && git commit -m "feat(admin): add overview + notifications tabs, desktop responsive layout, new routes"
```

---

## Task 3: Admin Overview Dashboard

**Files:**
- Create: `src/views/admin/OverviewView.vue`

- [ ] **Step 1: Create `src/views/admin/OverviewView.vue`**

```vue
<template>
  <div class="overview-view">
    <div v-if="loading" class="stat-grid">
      <div v-for="n in 4" :key="n" class="skel-card" />
    </div>

    <template v-else>
      <div class="server-banner">
        <div class="server-info">
          <p class="server-version">ABS {{ serverVersion }}</p>
          <p class="server-sub">AudioBookShelf Server</p>
        </div>
        <div class="server-actions">
          <button class="action-chip" :disabled="purging" @click="doPurge">
            <v-icon size="14" :class="{ spin: purging }">{{ purging ? 'mdi-loading' : 'mdi-broom' }}</v-icon>
            <span>{{ purging ? 'Purging…' : 'Purge Cache' }}</span>
          </button>
          <button class="action-chip" :disabled="scanningAll" @click="doScanAll">
            <v-icon size="14" :class="{ spin: scanningAll }">{{ scanningAll ? 'mdi-loading' : 'mdi-magnify-scan' }}</v-icon>
            <span>{{ scanningAll ? 'Scanning…' : 'Scan All' }}</span>
          </button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <v-icon size="22" color="#d4a017">mdi-account-group-outline</v-icon>
          <p class="stat-value">{{ userCount }}</p>
          <p class="stat-label">Total users</p>
        </div>
        <div class="stat-card">
          <v-icon size="22" color="#22c55e">mdi-bookshelf</v-icon>
          <p class="stat-value">{{ libraryCount }}</p>
          <p class="stat-label">Libraries</p>
        </div>
        <div class="stat-card">
          <v-icon size="22" color="#3b82f6">mdi-counter</v-icon>
          <p class="stat-value">{{ totalItems }}</p>
          <p class="stat-label">Total items</p>
        </div>
        <div class="stat-card">
          <v-icon size="22" color="#a855f7">mdi-backup-restore</v-icon>
          <p class="stat-value">{{ backupCount }}</p>
          <p class="stat-label">Backups</p>
          <p v-if="lastBackupLabel" class="stat-sub">{{ lastBackupLabel }}</p>
        </div>
      </div>

      <div v-if="successMsg" class="toast-msg">
        <v-icon size="16" color="#22c55e">mdi-check-circle-outline</v-icon>
        {{ successMsg }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getServerInfo, getUsers, getAdminLibraries, getBackups, purgeCache, scanLibrary } from '@/api/admin/index'

const loading       = ref(true)
const serverVersion = ref('—')
const userCount     = ref(0)
const libraryCount  = ref(0)
const totalItems    = ref(0)
const backupCount   = ref(0)
const lastBackupMs  = ref<number | null>(null)
const purging       = ref(false)
const scanningAll   = ref(false)
const successMsg    = ref('')

const lastBackupLabel = computed(() => {
  if (!lastBackupMs.value) return null
  return new Date(lastBackupMs.value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})

function showSuccess(msg: string) {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = '' }, 3000)
}

async function doPurge() {
  purging.value = true
  try {
    await purgeCache()
    showSuccess('Cache purged successfully')
  } catch { /* ignore */ }
  finally { purging.value = false }
}

async function doScanAll() {
  scanningAll.value = true
  try {
    const libs = await getAdminLibraries()
    for (const lib of libs) {
      try { await scanLibrary(lib.id) } catch { /* per-library non-fatal */ }
    }
    showSuccess(`Scan started for ${libs.length} librar${libs.length === 1 ? 'y' : 'ies'}`)
  } catch { /* ignore */ }
  finally { scanningAll.value = false }
}

onMounted(async () => {
  loading.value = true
  try {
    const [info, users, libs, backups] = await Promise.all([
      getServerInfo(),
      getUsers().catch(() => []),
      getAdminLibraries().catch(() => []),
      getBackups().catch(() => []),
    ])
    serverVersion.value = info.version
    userCount.value     = users.length
    libraryCount.value  = libs.length
    totalItems.value    = libs.reduce((sum, l) => sum + (l.stats?.totalItems ?? 0), 0)
    backupCount.value   = backups.length
    const latest        = [...backups].sort((a, b) => b.createdAt - a.createdAt)[0]
    lastBackupMs.value  = latest?.createdAt ?? null
  } finally { loading.value = false }
})
</script>

<style scoped>
.overview-view { padding: 4px 0; }

.server-banner {
  display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: rgba(212,160,23,0.06); border: 1px solid rgba(212,160,23,0.15);
  border-radius: 14px; padding: 16px; margin-bottom: 18px;
}
.server-version { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.92); margin: 0 0 2px; }
.server-sub     { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.server-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.action-chip {
  display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
  padding: 7px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); cursor: pointer; transition: opacity 0.15s;
}
.action-chip:disabled { opacity: 0.45; cursor: not-allowed; }
.action-chip:not(:disabled):active { opacity: 0.65; }

.stat-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px;
}
.stat-card {
  background: #111; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 16px 14px; display: flex; flex-direction: column; gap: 4px;
}
.stat-value { font-size: 30px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 6px 0 0; line-height: 1; }
.stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.stat-sub   { font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; }

.skel-card {
  height: 96px; border-radius: 14px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.toast-msg {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #22c55e;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15);
  border-radius: 10px; padding: 10px 14px;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (min-width: 600px) {
  .stat-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 768px) {
  .server-banner { padding: 20px 24px; }
  .stat-card { padding: 20px 18px; }
  .stat-value { font-size: 34px; }
}
</style>
```

- [ ] **Step 2: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all existing tests still PASS.

- [ ] **Step 3: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/OverviewView.vue && git commit -m "feat(admin): add Overview dashboard with server stats, purge cache, scan all"
```

---

## Task 4: Server Settings Expansion

**Files:**
- Modify: `src/views/admin/ServerSettingsView.vue`

- [ ] **Step 1: Replace `src/views/admin/ServerSettingsView.vue`**

```vue
<template>
  <div class="admin-settings">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 7" :key="n" class="skel-row" />
    </div>

    <div v-else-if="settings" class="settings-content">
      <!-- Scanner -->
      <div class="settings-group">
        <p class="group-label">Scanner</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Find covers</p>
            <p class="setting-desc">Auto-find covers during scan</p>
          </div>
          <button class="toggle" :class="{ on: settings.scannerFindCovers }" @click="toggle('scannerFindCovers')">
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Cover provider</p>
            <p class="setting-desc">Source used when auto-finding covers</p>
          </div>
          <select v-model="settings.scannerCoverProvider" class="setting-select" @change="dirty = true">
            <option value="audible">Audible</option>
            <option value="itunes">iTunes</option>
            <option value="openlibrary">Open Library</option>
            <option value="googlebooks">Google Books</option>
            <option value="audiobookshelf">AudioBookShelf</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Parse subtitle</p>
            <p class="setting-desc">Extract subtitles from filenames</p>
          </div>
          <button class="toggle" :class="{ on: settings.scannerParseSubtitle }" @click="toggle('scannerParseSubtitle')">
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Scan all file types</p>
            <p class="setting-desc">Include non-audio files during scan</p>
          </div>
          <button class="toggle" :class="{ on: settings.scannerScanAllFileTypes }" @click="toggle('scannerScanAllFileTypes')">
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Sorting ignores prefix</p>
            <p class="setting-desc">Ignore "The", "A", etc. when sorting</p>
          </div>
          <button class="toggle" :class="{ on: settings.sortingIgnorePrefix }" @click="toggle('sortingIgnorePrefix')">
            <div class="toggle-thumb" />
          </button>
        </div>
      </div>

      <!-- Storage -->
      <div class="settings-group">
        <p class="group-label">Storage</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Store cover with item</p>
            <p class="setting-desc">Save covers in the item folder</p>
          </div>
          <button class="toggle" :class="{ on: settings.storeCoverWithItem }" @click="toggle('storeCoverWithItem')">
            <div class="toggle-thumb" />
          </button>
        </div>
      </div>

      <!-- Backups -->
      <div class="settings-group">
        <p class="group-label">Backups</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Auto-backup schedule</p>
            <p class="setting-desc">How often to create automatic backups</p>
          </div>
          <select v-model="settings.backupSchedule" class="setting-select" @change="dirty = true">
            <option value="">Off</option>
            <option value="0 1 * * *">Daily</option>
            <option value="0 1 * * 0">Weekly</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Backups to keep</p>
            <p class="setting-desc">Delete older backups beyond this count</p>
          </div>
          <input
            v-model.number="settings.numBackupsToKeep"
            type="number" min="1" max="20"
            class="setting-input"
            @input="dirty = true"
          />
        </div>
      </div>

      <!-- Logs -->
      <div class="settings-group">
        <p class="group-label">Logs</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Daily logs retention (days)</p>
            <p class="setting-desc">How many days of daily logs to keep</p>
          </div>
          <input
            v-model.number="settings.loggerDailyLogsToKeep"
            type="number" min="1" max="365"
            class="setting-input"
            @input="dirty = true"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Scanner logs retention (days)</p>
            <p class="setting-desc">How many days of scanner logs to keep</p>
          </div>
          <input
            v-model.number="settings.loggerScannerLogsToKeep"
            type="number" min="1" max="365"
            class="setting-input"
            @input="dirty = true"
          />
        </div>
      </div>

      <!-- Library Display -->
      <div class="settings-group">
        <p class="group-label">Library Display</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Default library view</p>
            <p class="setting-desc">Server-default view mode for the library</p>
          </div>
          <select v-model.number="settings.bookshelfView" class="setting-select" @change="dirty = true">
            <option :value="0">Bookshelf grid</option>
            <option :value="1">List view</option>
          </select>
        </div>
      </div>

      <!-- Playback -->
      <div class="settings-group">
        <p class="group-label">Playback</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Chromecast</p>
            <p class="setting-desc">Enable Chromecast support</p>
          </div>
          <button class="toggle" :class="{ on: settings.chromecastEnabled }" @click="toggle('chromecastEnabled')">
            <div class="toggle-thumb" />
          </button>
        </div>
      </div>

      <!-- Security -->
      <div class="settings-group">
        <p class="group-label">Security</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Session token age</p>
            <p class="setting-desc">How long login tokens remain valid</p>
          </div>
          <select v-model="settings.authTokenAge" class="setting-select" @change="dirty = true">
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="1y">1 year</option>
          </select>
        </div>
      </div>

      <!-- Server info -->
      <div class="settings-group">
        <p class="group-label">Server</p>
        <div class="info-row">
          <span class="info-key">Version</span>
          <span class="info-val">{{ settings.version }}</span>
        </div>
      </div>

      <button class="save-btn" :disabled="saving || !dirty" @click="doSave">
        {{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getServerSettings, updateServerSettings } from '@/api/admin/index'
import type { ServerSettings } from '@/api/admin/index'

const loading  = ref(true)
const settings = ref<ServerSettings | null>(null)
const dirty    = ref(false)
const saving   = ref(false)

function toggle(key: keyof ServerSettings) {
  if (!settings.value) return
  ;(settings.value as Record<string, unknown>)[key] = !(settings.value as Record<string, unknown>)[key]
  dirty.value = true
}

async function doSave() {
  if (!settings.value) return
  saving.value = true
  try {
    await updateServerSettings(settings.value)
    dirty.value = false
  } catch { /* ignore */ }
  finally { saving.value = false }
}

onMounted(async () => {
  try { settings.value = await getServerSettings() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-settings { padding: 4px 0; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 56px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.settings-content { display: flex; flex-direction: column; gap: 24px; }
.settings-group { display: flex; flex-direction: column; }
.group-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 8px;
}

.setting-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.setting-row:last-child { border-bottom: none; }
.setting-info { flex: 1; }
.setting-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.setting-desc { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.toggle {
  width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0; transition: background 0.2s;
}
.toggle.on { background: #d4a017; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 22px; }

.setting-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 10px; font-size: 12px;
  color: rgba(255,255,255,0.8); outline: none; cursor: pointer; flex-shrink: 0;
  appearance: none;
}
.setting-input {
  width: 64px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 10px; font-size: 12px;
  color: rgba(255,255,255,0.8); outline: none; text-align: right; flex-shrink: 0;
}

.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.info-key { font-size: 13px; color: rgba(255,255,255,0.5); }
.info-val { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }

.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (min-width: 768px) {
  .settings-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .save-btn { grid-column: 1 / -1; max-width: 320px; }
}
</style>
```

- [ ] **Step 2: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/ServerSettingsView.vue && git commit -m "feat(admin): expand server settings — cover provider, backup schedule, log retention, bookshelf view, token age"
```

---

## Task 5: Notifications Admin Tab

**Files:**
- Create: `src/views/admin/NotificationsView.vue`

- [ ] **Step 1: Create `src/views/admin/NotificationsView.vue`**

```vue
<template>
  <div class="notifications-view">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 4" :key="n" class="skel-row" />
    </div>

    <template v-else>
      <!-- Apprise URL card -->
      <div class="settings-group">
        <p class="group-label">Apprise Server</p>
        <div class="apprise-card">
          <p class="apprise-desc">Enter an Apprise API URL to send notifications via email, Slack, Telegram, and 80+ other services.</p>
          <input
            v-model="appriseUrl"
            class="form-input"
            placeholder="http://apprise-api:8000/notify/abs"
            type="url"
          />
          <button class="save-btn" :disabled="savingUrl || appriseUrl === savedAppriseUrl" @click="doSaveUrl">
            {{ savingUrl ? 'Saving…' : 'Save URL' }}
          </button>
          <p v-if="urlSuccess" class="success-msg">
            <v-icon size="14" color="#22c55e">mdi-check</v-icon> Saved
          </p>
        </div>
      </div>

      <!-- Notification events -->
      <div class="settings-group">
        <p class="group-label">Events</p>

        <div v-if="!events.length" class="empty-state">
          <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-bell-off-outline</v-icon>
          <p>No notification events configured on this server.</p>
          <p class="empty-sub">Apprise URL must be set first.</p>
        </div>

        <div v-else class="event-list">
          <div v-for="ev in events" :key="ev.id" class="event-row">
            <div class="event-info">
              <p class="event-name">{{ formatEventName(ev.eventName) }}</p>
              <p v-if="ev.lastFiredAt" class="event-sub">Last fired {{ formatDate(ev.lastFiredAt) }}</p>
              <p v-else class="event-sub">Never fired</p>
            </div>
            <div class="event-controls">
              <button
                class="test-chip"
                :disabled="testingId === ev.id || !appriseUrl"
                @click="doTest(ev.id)"
                title="Send a test notification"
              >
                <v-icon size="12">{{ testingId === ev.id ? 'mdi-loading' : 'mdi-send-outline' }}</v-icon>
                Test
              </button>
              <div
                class="toggle"
                :class="{ on: ev.enabled }"
                @click="doToggle(ev)"
              >
                <div class="toggle-thumb" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  patchNotification,
  testNotification,
} from '@/api/admin/index'
import type { NotificationEvent } from '@/api/admin/index'

const loading        = ref(true)
const appriseUrl     = ref('')
const savedAppriseUrl = ref('')
const savingUrl      = ref(false)
const urlSuccess     = ref(false)
const events         = ref<NotificationEvent[]>([])
const testingId      = ref<string | null>(null)

function formatEventName(name: string): string {
  return name
    .replace(/^on/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function doSaveUrl() {
  savingUrl.value = true
  urlSuccess.value = false
  try {
    await updateNotificationSettings({ appriseApiUrl: appriseUrl.value.trim() || null })
    savedAppriseUrl.value = appriseUrl.value
    urlSuccess.value = true
    setTimeout(() => { urlSuccess.value = false }, 3000)
  } catch { /* ignore */ }
  finally { savingUrl.value = false }
}

async function doToggle(ev: NotificationEvent) {
  const newVal = !ev.enabled
  ev.enabled = newVal
  try {
    await patchNotification(ev.id, { enabled: newVal })
  } catch {
    ev.enabled = !newVal
  }
}

async function doTest(id: string) {
  testingId.value = id
  try {
    await testNotification(id)
  } catch { /* ignore — test fires even if it throws */ }
  finally { testingId.value = null }
}

onMounted(async () => {
  loading.value = true
  try {
    const [nSettings, evs] = await Promise.all([
      getNotificationSettings().catch(() => ({})),
      getNotifications().catch(() => []),
    ])
    appriseUrl.value      = nSettings.appriseApiUrl ?? ''
    savedAppriseUrl.value = appriseUrl.value
    events.value          = evs
  } finally { loading.value = false }
})
</script>

<style scoped>
.notifications-view { padding: 4px 0; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 64px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.settings-group { margin-bottom: 24px; }
.group-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px;
}

.apprise-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.apprise-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.5; }
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; box-sizing: border-box;
}
.save-btn {
  align-self: flex-start; padding: 8px 20px; border-radius: 10px; border: none; cursor: pointer;
  background: #d4a017; color: #111; font-size: 13px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.success-msg { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #22c55e; margin: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 32px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.empty-sub { font-size: 11px; color: rgba(255,255,255,0.25); margin: 0; }

.event-list { display: flex; flex-direction: column; }
.event-row {
  display: flex; align-items: center; gap: 12px; padding: 13px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.event-row:last-child { border-bottom: none; }
.event-info { flex: 1; }
.event-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.event-sub  { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
.event-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.test-chip {
  display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600;
  padding: 5px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; white-space: nowrap;
}
.test-chip:disabled { opacity: 0.4; cursor: not-allowed; }

.toggle {
  width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0;
  transition: background 0.2s;
}
.toggle.on { background: #d4a017; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 22px; }

@media (min-width: 768px) {
  .apprise-card { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
  .apprise-desc { flex-basis: 100%; }
  .form-input { flex: 1; }
}
</style>
```

- [ ] **Step 2: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/NotificationsView.vue && git commit -m "feat(admin): add Notifications tab with Apprise URL config and event toggles"
```

---

## Task 6: User Detail View

**Files:**
- Create: `src/views/admin/UserDetailView.vue`
- Modify: `src/views/admin/UsersView.vue`

- [ ] **Step 1: Create `src/views/admin/UserDetailView.vue`**

```vue
<template>
  <div class="user-detail-view">
    <!-- Back header (only visible when navigating directly) -->
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
          <v-icon size="18">mdi-pencil-outline</v-icon>
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
        <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-headphones</v-icon>
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
      <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-account-off</v-icon>
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
```

- [ ] **Step 2: Update `src/views/admin/UsersView.vue` — username row navigates to detail**

Change the `edit-btn` click from opening the sheet to navigating, and remove the `openEdit` call from the user row's `edit-btn`. Add `useRouter` import and replace the existing edit button:

Find this block (around line 26-29):

```vue
        <button v-if="u.type !== 'root'" class="edit-btn" @click="openEdit(u)">
          <v-icon size="16">mdi-pencil-outline</v-icon>
        </button>
```

Replace with:

```vue
        <button v-if="u.type !== 'root'" class="edit-btn" @click="router.push({ name: 'admin-user-detail', params: { id: u.id } })">
          <v-icon size="16">mdi-chevron-right</v-icon>
        </button>
```

Also add `useRouter` to the script — find:

```typescript
import { computed, onMounted, ref, reactive } from 'vue'
```

Replace with:

```typescript
import { computed, onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
```

And add at the top of the script body (after the last import):

```typescript
const router = useRouter()
```

- [ ] **Step 3: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/UserDetailView.vue src/views/admin/UsersView.vue && git commit -m "feat(admin): add User Detail view with session history and inline edit sheet"
```

---

## Task 7: Podcast Episode Management

**Files:**
- Create: `src/views/admin/PodcastDetailView.vue`
- Modify: `src/views/admin/LibrariesView.vue`

- [ ] **Step 1: Create `src/views/admin/PodcastDetailView.vue`**

```vue
<template>
  <div class="podcast-detail-view">
    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <template v-else-if="podcast">
      <!-- Header card -->
      <div class="podcast-hero-card">
        <img :src="coverUrl(podcast.id, auth.token ?? '')" class="podcast-hero-cover" />
        <div class="podcast-hero-meta">
          <p class="podcast-hero-title">{{ podcast.media?.metadata?.title ?? 'Podcast' }}</p>
          <p class="podcast-hero-author">{{ podcast.media?.metadata?.author ?? '' }}</p>
          <p class="podcast-hero-count">{{ totalEpisodes }} episodes</p>
        </div>
      </div>

      <!-- Tab strip -->
      <div class="tab-strip">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <!-- Downloaded tab -->
      <div v-if="activeTab === 'downloaded'">
        <div v-if="!downloadedEpisodes.length" class="empty-state">
          <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-download-off</v-icon>
          <p>No downloaded episodes</p>
        </div>
        <div v-else class="episode-list">
          <div v-for="ep in downloadedEpisodes" :key="ep.id" class="episode-row">
            <div class="ep-meta">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">{{ formatMinutes(ep.audioFile?.duration ?? ep.duration) }} · {{ formatSize(ep.audioFile?.metadata?.size ?? 0) }}</p>
            </div>
            <button class="ep-action-btn ep-delete" :disabled="deletingId === ep.id" @click="doDelete(ep.id)" title="Delete episode">
              <v-icon size="16">{{ deletingId === ep.id ? 'mdi-loading' : 'mdi-delete-outline' }}</v-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Feed tab -->
      <div v-if="activeTab === 'feed'">
        <div v-if="!feedEpisodes.length" class="empty-state">
          <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-rss-off</v-icon>
          <p>No feed episodes available</p>
        </div>
        <div v-else class="episode-list">
          <div v-for="ep in feedEpisodes" :key="ep.id" class="episode-row">
            <div class="ep-meta">
              <p class="ep-title">{{ ep.title }}</p>
              <p class="ep-sub">{{ formatMinutes(ep.duration) }}{{ ep.publishedAt ? ' · ' + formatDate(ep.publishedAt) : '' }}</p>
            </div>
            <button
              class="ep-action-btn ep-download"
              :disabled="downloadingId === ep.id || ep.downloaded"
              @click="doDownload(ep.id)"
              :title="ep.downloaded ? 'Already downloaded' : 'Download episode'"
            >
              <v-icon size="16">{{ downloadingId === ep.id ? 'mdi-loading' : ep.downloaded ? 'mdi-check' : 'mdi-download-outline' }}</v-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Settings card -->
      <div class="settings-card">
        <p class="group-label">Podcast Settings</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Feed URL</p>
          </div>
          <button class="copy-url-btn" @click="copyFeedUrl">
            <v-icon size="14">mdi-content-copy</v-icon>
            Copy
          </button>
        </div>
        <p class="feed-url-display">{{ podcast.media?.metadata?.feedUrl ?? 'Not set' }}</p>
        <div class="check-episodes-row">
          <button class="check-btn" :disabled="checking" @click="doCheck">
            <v-icon size="14" :class="{ spin: checking }">{{ checking ? 'mdi-loading' : 'mdi-refresh' }}</v-icon>
            {{ checking ? 'Checking…' : 'Check for new episodes' }}
          </button>
          <span v-if="checkResult !== null" class="check-result">{{ checkResult }} new</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, coverUrl } from '@/api/client'
import { downloadPodcastEpisode, deletePodcastEpisode, checkNewPodcastEpisodes } from '@/api/admin/index'
import { useAuthStore } from '@/stores/auth'
import type { PodcastEpisodeFile } from '@/api/admin/index'

const route = useRoute()
const auth  = useAuthStore()
const id    = computed(() => route.params.id as string)

const loading  = ref(true)
const podcast  = ref<any>(null)
const activeTab = ref<'downloaded' | 'feed'>('downloaded')
const deletingId   = ref<string | null>(null)
const downloadingId = ref<string | null>(null)
const checking     = ref(false)
const checkResult  = ref<number | null>(null)

const tabs = [
  { id: 'downloaded', label: 'Downloaded' },
  { id: 'feed',       label: 'Feed' },
] as const

const downloadedEpisodes = computed<PodcastEpisodeFile[]>(() =>
  (podcast.value?.media?.episodes ?? []).filter((e: any) => !!e.audioFile)
)

const feedEpisodes = computed<PodcastEpisodeFile[]>(() =>
  (podcast.value?.media?.episodes ?? []).map((e: any) => ({
    ...e,
    downloaded: !!e.audioFile,
  }))
)

const totalEpisodes = computed(() => podcast.value?.media?.numEpisodes ?? feedEpisodes.value.length)

function formatMinutes(secs: number) {
  if (!secs) return '—'
  const m = Math.round(secs / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function copyFeedUrl() {
  const url = podcast.value?.media?.metadata?.feedUrl
  if (!url) return
  try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
}

async function doDelete(epId: string) {
  deletingId.value = epId
  try {
    await deletePodcastEpisode(id.value, epId)
    if (podcast.value?.media?.episodes) {
      const ep = podcast.value.media.episodes.find((e: any) => e.id === epId)
      if (ep) delete ep.audioFile
    }
  } catch { /* ignore */ }
  finally { deletingId.value = null }
}

async function doDownload(epId: string) {
  downloadingId.value = epId
  try {
    await downloadPodcastEpisode(id.value, epId)
  } catch { /* ignore */ }
  finally { downloadingId.value = null }
}

async function doCheck() {
  checking.value = true
  checkResult.value = null
  try {
    const count = await checkNewPodcastEpisodes(id.value)
    checkResult.value = count
  } catch { /* ignore */ }
  finally { checking.value = false }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get(`/items/${id.value}`, { params: { expanded: 1, include: 'progress' } })
    podcast.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.podcast-detail-view { padding: 4px 0; }

.loading-wrap { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 52px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.podcast-hero-card {
  display: flex; gap: 14px; align-items: flex-start;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 14px; margin-bottom: 16px;
}
.podcast-hero-cover { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.podcast-hero-title  { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 3px; }
.podcast-hero-author { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
.podcast-hero-count  { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }

.tab-strip {
  display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px;
}
.tab-btn {
  padding: 10px 18px; background: transparent; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); transition: all 0.15s;
}
.tab-btn.active { color: #d4a017; border-bottom-color: #d4a017; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.episode-list { display: flex; flex-direction: column; }
.episode-row {
  display: flex; align-items: center; gap: 10px; padding: 11px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.episode-row:last-child { border-bottom: none; }
.ep-meta { flex: 1; min-width: 0; }
.ep-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-sub   { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }

.ep-action-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ep-delete   { background: rgba(239,68,68,0.1); color: rgba(239,68,68,0.6); }
.ep-download { background: rgba(212,160,23,0.1); color: #d4a017; }
.ep-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.settings-card {
  margin-top: 20px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px;
}
.group-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
.setting-info { flex: 1; }
.setting-name { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
.copy-url-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 12px; border-radius: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); cursor: pointer; }
.feed-url-display { font-size: 11px; color: rgba(255,255,255,0.3); font-family: monospace; word-break: break-all; margin: 4px 0 12px; }
.check-episodes-row { display: flex; align-items: center; gap: 12px; }
.check-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(212,160,23,0.25); background: rgba(212,160,23,0.1); color: #d4a017; font-size: 12px; cursor: pointer; }
.check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.check-result { font-size: 12px; color: #22c55e; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (min-width: 768px) {
  .episode-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .episode-row { border-bottom: 1px solid rgba(255,255,255,0.05); }
}
</style>
```

- [ ] **Step 2: Update `src/views/admin/LibrariesView.vue` — tap podcast library item navigates to PodcastDetailView**

Add `useRouter` import. Find:

```typescript
import { onMounted, ref } from 'vue'
```

Replace with:

```typescript
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
```

Add `const router = useRouter()` at the top of the script body (after the socket line).

In the template, find the podcast library card header where the library name is displayed. In `lib-name`, add a click handler. Find in the template (around line 22-25):

```vue
          <div class="lib-info">
            <p class="lib-name">{{ lib.name }}</p>
```

Replace with:

```vue
          <div class="lib-info">
            <p
              class="lib-name"
              :class="{ 'lib-name--clickable': lib.mediaType === 'podcast' }"
              @click="lib.mediaType === 'podcast' && router.push({ name: 'admin-podcast-detail', params: { id: lib.id } })"
            >{{ lib.name }}</p>
```

Add style to the scoped styles:

```css
.lib-name--clickable { cursor: pointer; text-decoration: underline; text-underline-offset: 2px; text-decoration-color: rgba(255,255,255,0.2); }
.lib-name--clickable:hover { color: #d4a017; }
```

Wait — this navigates to the library overview, not a podcast. The `admin/podcast/:id` route expects a **podcast item** id (a specific podcast show), not a library id. The correct flow is: user goes to Libraries tab → sees a podcast library → clicks a podcast name within the library podcast list. 

However, LibrariesView currently does not list individual podcasts within a library. The "Check episodes" button checks ALL podcasts at once. To navigate to a per-podcast detail, we need to show podcast items under the library card.

**Revised approach:** Add a "Manage" button next to each podcast library that loads and shows its podcasts inline (collapsed), and tapping a podcast item navigates to PodcastDetailView.

Find in LibrariesView template the line after `.folder-list`:

```vue
        <!-- Real-time scan progress -->
```

Insert before that:

```vue
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
```

Add to script:

```typescript
const podcastItems = ref<Record<string, Array<{ id: string; media?: { metadata?: { title?: string } } }>>>({})
const loadingPodcastsId = ref<string | null>(null)

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
```

Add `import { api } from '@/api/client'` to the imports.

Add styles:

```css
.podcast-items-list { margin: 8px 0; display: flex; flex-direction: column; }
.podcast-item-row { display: flex; align-items: center; gap: 7px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
.podcast-item-row:last-child { border-bottom: none; }
.podcast-item-title { flex: 1; font-size: 12px; color: rgba(255,255,255,0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.show-podcasts-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; margin-top: 8px; }
.show-podcasts-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/admin/PodcastDetailView.vue src/views/admin/LibrariesView.vue && git commit -m "feat(admin): add Podcast Detail view with episode management and library drill-down"
```

---

## Task 8: Settings — Server Info + Downloads Section

**Files:**
- Modify: `src/views/SettingsView.vue`

- [ ] **Step 1: Add server info to the Abscond section**

In `src/views/SettingsView.vue`, find the `Abscond` collapsible section. It is identified by the toggle key `'abscond'`. Find the `isOpen('abscond')` div content and locate wherever the section content currently ends (before the closing `</div>`). Add server info fetch in `onMounted` and display it.

Find the line that reads (in the script, near `onMounted`):

```typescript
onMounted(async () => {
```

The function already has content. Add a server info fetch. In the `script setup` block, add after existing `ref` declarations (find `const settingsStore = useSettingsStore()`):

```typescript
const serverVersion = ref<string | null>(null)
```

Then inside the existing `onMounted` (find the end of existing `onMounted` and add before the closing `}`):

Actually, since SettingsView is large and complex, do a targeted search. Find in the file the pattern `isOpen('abscond')`. The block looks like:

```vue
      <Transition name="sect" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
        <div v-if="isOpen('abscond')">
          ...existing content...
        </div>
      </Transition>
```

Find the `</div>` that closes `v-if="isOpen('abscond')"`. Before that closing div, add:

```vue
          <div v-if="serverVersion" class="settings-item settings-item--info">
            <v-icon size="18" color="rgba(255,255,255,0.3)">mdi-server-outline</v-icon>
            <span class="item-label">Server version</span>
            <span class="item-value-badge">{{ serverVersion }}</span>
          </div>
```

In the `<script setup>` block, add `const serverVersion = ref<string | null>(null)` with the other refs.

Find `import { api } from '@/api/client'` (or add it if not present) and after it add:

```typescript
import { getServerInfo } from '@/api/admin/index'
```

In the existing `onMounted`, add at the end before the closing brace:

```typescript
  getServerInfo().then(info => { serverVersion.value = info.version !== '—' ? info.version : null })
```

Add style (in `<style scoped>`):

```css
.settings-item--info { cursor: default; }
.item-value-badge {
  font-size: 11px; padding: 3px 8px; border-radius: 8px;
  background: rgba(212,160,23,0.12); color: #d4a017; font-weight: 600; flex-shrink: 0;
}
```

- [ ] **Step 2: Add admin-only Downloads section**

In SettingsView, find the `data` collapsible section (key `'data'`). After the `</section>` for the data section, add a new section. Find the closing `</section>` of the data section by finding `isOpen('data')` and finding its wrapping `</section>`. After it, add:

```vue
    <!-- Downloads (admin only) -->
    <section v-if="auth.isAdmin" class="settings-section">
      <button class="section-toggle" @click="toggle('downloads')">
        <span class="section-toggle-title">Downloads</span>
        <v-icon class="section-chevron" :class="{ open: isOpen('downloads') }" size="16" color="rgba(255,255,255,0.3)">mdi-chevron-down</v-icon>
      </button>

      <Transition name="sect" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
        <div v-if="isOpen('downloads')">
          <div v-if="downloadsLoading" class="settings-item">
            <span class="item-label" style="color:rgba(255,255,255,0.3)">Loading…</span>
          </div>
          <div v-else-if="!downloads.length" class="settings-item">
            <v-icon size="18" color="rgba(255,255,255,0.2)">mdi-download-off</v-icon>
            <span class="item-label" style="color:rgba(255,255,255,0.4)">No active downloads</span>
          </div>
          <div v-else>
            <div v-for="d in downloads" :key="d.id" class="settings-item">
              <v-icon size="18" color="rgba(212,160,23,0.6)">mdi-download</v-icon>
              <div class="item-label-stack">
                <span class="item-label">{{ d.filename }}</span>
                <span class="item-sublabel">{{ formatDownloadSize(d.size) }}</span>
              </div>
              <button class="dl-delete-btn" @click="doDeleteDownload(d.id)">
                <v-icon size="14">mdi-close</v-icon>
              </button>
            </div>
          </div>
          <div class="settings-item" @click="loadDownloads">
            <v-icon size="18" color="rgba(255,255,255,0.3)">mdi-refresh</v-icon>
            <span class="item-label">Refresh</span>
          </div>
        </div>
      </Transition>
    </section>
```

In the `<script setup>` block, add these refs and imports:

```typescript
import { getDownloads, deleteDownload } from '@/api/downloads'
import type { DownloadedItem } from '@/api/downloads'
```

And add refs:

```typescript
const downloads        = ref<DownloadedItem[]>([])
const downloadsLoading = ref(false)
```

And add functions (before the closing of the script):

```typescript
async function loadDownloads() {
  downloadsLoading.value = true
  try { downloads.value = await getDownloads() } catch { /* ignore */ }
  finally { downloadsLoading.value = false }
}

function formatDownloadSize(bytes: number) {
  if (!bytes) return ''
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

async function doDeleteDownload(id: string) {
  try {
    await deleteDownload(id)
    downloads.value = downloads.value.filter(d => d.id !== id)
  } catch { /* ignore */ }
}
```

Add style:

```css
.dl-delete-btn {
  width: 24px; height: 24px; border-radius: 50%; background: rgba(239,68,68,0.1);
  border: none; cursor: pointer; color: rgba(239,68,68,0.6); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
```

- [ ] **Step 3: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/views/SettingsView.vue && git commit -m "feat(settings): add server version display and admin downloads section"
```

---

## Final Check

- [ ] **Run full test suite**

```bash
cd /config/workspace/gh/abs-ui && npm run test 2>&1 | tail -30
```

Expected: all tests PASS, 0 failures.

- [ ] **Verify TypeScript compiles without errors**

```bash
cd /config/workspace/gh/abs-ui && npx tsc --noEmit 2>&1 | head -40
```

Expected: no output (zero errors).

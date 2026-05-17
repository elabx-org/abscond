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
            <AppIcon :icon="purging ? 'mdi-loading' : 'mdi-broom'" :size="14" :class="{ spin: purging }" />
            <span>{{ purging ? 'Purging…' : 'Purge Cache' }}</span>
          </button>
          <button class="action-chip" :disabled="scanningAll" @click="doScanAll">
            <AppIcon :icon="scanningAll ? 'mdi-loading' : 'mdi-magnify-scan'" :size="14" :class="{ spin: scanningAll }" />
            <span>{{ scanningAll ? 'Scanning…' : 'Scan All' }}</span>
          </button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <AppIcon icon="mdi-account-group-outline" :size="22" color="#d4a017" />
          <p class="stat-value">{{ userCount }}</p>
          <p class="stat-label">Total users</p>
        </div>
        <div class="stat-card">
          <AppIcon icon="mdi-bookshelf" :size="22" color="#22c55e" />
          <p class="stat-value">{{ libraryCount }}</p>
          <p class="stat-label">Libraries</p>
        </div>
        <div class="stat-card">
          <AppIcon icon="mdi-counter" :size="22" color="#3b82f6" />
          <p class="stat-value">{{ totalItems }}</p>
          <p class="stat-label">Total items</p>
        </div>
        <div class="stat-card">
          <AppIcon icon="mdi-backup-restore" :size="22" color="#a855f7" />
          <p class="stat-value">{{ backupCount }}</p>
          <p class="stat-label">Backups</p>
          <p v-if="lastBackupLabel" class="stat-sub">{{ lastBackupLabel }}</p>
        </div>
      </div>

      <div v-if="successMsg" class="toast-msg">
        <AppIcon icon="mdi-check-circle-outline" :size="16" color="#22c55e" />
        {{ successMsg }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, onMounted, ref } from 'vue'
import { getServerInfo, getUsers, getAdminLibraries, getBackups, purgeCache, scanLibrary } from '@/api/admin/index'
import type { AdminLibrary, AdminBackup } from '@/api/admin/index'

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
    totalItems.value    = libs.reduce((sum: number, l: AdminLibrary) => sum + (l.stats?.totalItems ?? 0), 0)
    backupCount.value   = backups.length
    const latest        = [...backups].sort((a: AdminBackup, b: AdminBackup) => b.createdAt - a.createdAt)[0]
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

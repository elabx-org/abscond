<template>
  <div class="admin-libraries">
    <div class="section-header">
      <h3 class="section-title">Libraries</h3>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 3" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!libraries.length" class="empty-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-bookshelf</v-icon>
      <p>No libraries found</p>
    </div>

    <div v-else class="lib-list">
      <div v-for="lib in libraries" :key="lib.id" class="lib-card">
        <div class="lib-card-header">
          <v-icon size="20" color="#d4a017">{{ lib.mediaType === 'podcast' ? 'mdi-podcast' : 'mdi-bookshelf' }}</v-icon>
          <div class="lib-info">
            <p class="lib-name">{{ lib.name }}</p>
            <p class="lib-type">{{ lib.mediaType }} · {{ lib.stats?.totalItems ?? '?' }} items</p>
          </div>
          <button class="scan-btn" :class="{ scanning: scanningId === lib.id }" @click="scan(lib.id)">
            <v-icon size="16">{{ scanningId === lib.id ? 'mdi-loading' : 'mdi-magnify-scan' }}</v-icon>
            <span>{{ scanningId === lib.id ? 'Scanning…' : 'Scan' }}</span>
          </button>
        </div>
        <div class="folder-list">
          <div v-for="f in lib.folders" :key="f.id" class="folder-row">
            <v-icon size="13" color="rgba(255,255,255,0.35)">mdi-folder-outline</v-icon>
            <span class="folder-path">{{ f.fullPath }}</span>
          </div>
        </div>
        <p v-if="lib.lastScan" class="last-scan">Last scan {{ formatDate(lib.lastScan) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminLibraries, scanLibrary } from '@/api/admin'
import type { AdminLibrary } from '@/api/admin'

const loading    = ref(true)
const libraries  = ref<AdminLibrary[]>([])
const scanningId = ref<string | null>(null)

async function scan(id: string) {
  scanningId.value = id
  try { await scanLibrary(id) } catch { /* ignore */ }
  finally { scanningId.value = null }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(async () => {
  try { libraries.value = await getAdminLibraries() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-libraries { padding: 4px 0; }
.section-header { margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row { height: 80px; border-radius: 10px; background: #1a1a1a; animation: shimmer 1.5s infinite; background-size: 200% 100%;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.lib-list { display: flex; flex-direction: column; gap: 10px; }
.lib-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; }
.lib-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.lib-info { flex: 1; }
.lib-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
.lib-type { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; text-transform: capitalize; }
.scan-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 5px 10px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer; flex-shrink: 0;
}
.scan-btn.scanning { opacity: 0.6; cursor: not-allowed; }

.folder-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.folder-row { display: flex; align-items: center; gap: 6px; }
.folder-path { font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.last-scan { font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; }
</style>

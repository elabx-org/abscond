<template>
  <div class="admin-metadata">
    <div class="section-header">
      <h3 class="section-title">Item Metadata Utils</h3>
    </div>
    <p class="section-desc">Quick match fetches metadata from the configured provider for all unmatched items in a library.</p>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 3" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!libraries.length" class="empty-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-bookshelf-outline</v-icon>
      <p>No libraries</p>
    </div>

    <div v-else class="lib-list">
      <div v-for="lib in libraries" :key="lib.id" class="lib-card">
        <div class="lib-card-left">
          <v-icon size="20" color="#d4a017">mdi-bookshelf</v-icon>
          <div class="lib-info">
            <p class="lib-name">{{ lib.name }}</p>
            <p class="lib-meta">{{ lib.stats?.totalItems ?? 0 }} items · {{ lib.mediaType }}</p>
          </div>
        </div>
        <button
          class="match-btn"
          :class="matchState(lib.id)"
          :disabled="matchState(lib.id) === 'running'"
          @click="doQuickMatch(lib.id)"
        >
          <v-icon v-if="matchState(lib.id) === 'running'" size="13" class="spin">mdi-loading</v-icon>
          {{ matchLabel(lib.id) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getAdminLibraries, quickMatchLibrary } from '@/api/admin'
import type { AdminLibrary } from '@/api/admin'

const loading   = ref(true)
const libraries = ref<AdminLibrary[]>([])
const states    = reactive<Record<string, 'idle' | 'running' | 'done'>>({})

function matchState(id: string): 'idle' | 'running' | 'done' {
  return states[id] ?? 'idle'
}

function matchLabel(id: string): string {
  const s = matchState(id)
  if (s === 'running') return 'Matching…'
  if (s === 'done')    return 'Done ✓'
  return 'Quick Match All'
}

async function doQuickMatch(id: string) {
  states[id] = 'running'
  try {
    await quickMatchLibrary(id)
    states[id] = 'done'
    setTimeout(() => { states[id] = 'idle' }, 3000)
  } catch {
    states[id] = 'idle'
  }
}

onMounted(async () => {
  try { libraries.value = await getAdminLibraries() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-metadata { padding: 4px 0; }

.section-header { margin-bottom: 6px; }
.section-title {
  font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7);
  margin: 0; text-transform: uppercase; letter-spacing: 0.05em;
}
.section-desc { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0 0 16px; line-height: 1.5; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 64px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.lib-list { display: flex; flex-direction: column; gap: 10px; }

.lib-card {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 14px 16px;
}

.lib-card-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

.lib-info { min-width: 0; }
.lib-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lib-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; text-transform: capitalize; }

.match-btn {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25); color: #d4a017;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.match-btn.running { opacity: 0.6; cursor: not-allowed; }
.match-btn.done { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.25); color: #22c55e; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }
</style>

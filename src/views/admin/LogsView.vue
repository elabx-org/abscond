<template>
  <div class="admin-logs">
    <div class="section-header">
      <h3 class="section-title">Server Logs</h3>
      <button class="refresh-btn" :disabled="loading" @click="load">
        <v-icon size="16">mdi-refresh</v-icon>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 8" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!logs.length" class="empty-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-text-box-outline</v-icon>
      <p>No logs available</p>
    </div>

    <div v-else ref="logsEl" class="log-output">
      <div v-for="(entry, i) in logs" :key="i" class="log-line" :class="levelClass(entry)">
        <span class="log-text">{{ formatEntry(entry) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { getServerLogs } from '@/api/admin'

const loading = ref(true)
const logs = ref<unknown[]>([])
const logsEl  = ref<HTMLElement | null>(null)

function formatEntry(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (typeof entry === 'object' && entry !== null) {
    const e = entry as Record<string, unknown>
    const rawTs = e.timestamp
    const ts = typeof rawTs === 'string' ? (rawTs.split(' ')[1] ?? rawTs) : rawTs ? new Date(rawTs as number).toLocaleTimeString() : ''
    const msg = (e.message ?? e.msg ?? JSON.stringify(e)) as string
    return ts ? `[${ts}] ${msg}` : msg
  }
  return String(entry)
}

function levelClass(entry: unknown): string {
  if (typeof entry === 'object' && entry !== null) {
    const lvl = (entry as Record<string, unknown>).levelName
    if (lvl === 'DEBUG') return 'debug'
    if (lvl === 'INFO')  return 'info'
    if (lvl === 'WARN')  return 'warn'
    if (lvl === 'ERROR') return 'error'
  }
  return 'info'
}

async function load() {
  loading.value = true
  try { logs.value = await getServerLogs() } catch { /* ignore */ }
  finally {
    loading.value = false
    await nextTick()
    if (logsEl.value) logsEl.value.scrollTop = logsEl.value.scrollHeight
  }
}

onMounted(load)
</script>

<style scoped>
.admin-logs { padding: 4px 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.refresh-btn {
  width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); cursor: pointer; color: rgba(255,255,255,0.6);
  display: flex; align-items: center; justify-content: center;
}
.refresh-btn:disabled { opacity: 0.4; }

.loading-state { display: flex; flex-direction: column; gap: 6px; }
.skel-row { height: 18px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.log-output {
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
  padding: 12px; max-height: 60vh; overflow-y: auto; scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.log-line { padding: 2px 0; }
.log-text { font-size: 11px; font-family: 'Courier New', monospace; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }
.log-line.debug .log-text { color: rgba(255,255,255,0.35); }
.log-line.info  .log-text { color: rgba(255,255,255,0.65); }
.log-line.warn  .log-text { color: #d4a017; }
.log-line.error .log-text { color: #e05555; }
</style>

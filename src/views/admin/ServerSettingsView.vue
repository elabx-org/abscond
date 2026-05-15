<template>
  <div class="admin-settings">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 5" :key="n" class="skel-row" />
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
            <p class="setting-name">Parse subtitle</p>
            <p class="setting-desc">Extract subtitles from filenames</p>
          </div>
          <button class="toggle" :class="{ on: settings.scannerParseSubtitle }" @click="toggle('scannerParseSubtitle')">
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
import { getServerSettings, updateServerSettings } from '@/api/admin'
import type { ServerSettings } from '@/api/admin'

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
.skel-row { height: 56px; border-radius: 10px; background: #1a1a1a; animation: shimmer 1.5s infinite;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.settings-content { display: flex; flex-direction: column; gap: 20px; }
.settings-group { display: flex; flex-direction: column; gap: 0; }
.group-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px; }

.setting-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
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

.info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.info-key { font-size: 13px; color: rgba(255,255,255,0.5); }
.info-val { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }

.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

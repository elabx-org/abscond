<template>
  <div class="admin-settings">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 7" :key="n" class="skel-row" />
    </div>

    <div v-else-if="loadError" class="error-state">
      <AppIcon icon="mdi-alert-circle-outline" :size="36" color="rgba(255,255,255,0.15)" />
      <p>Failed to load server settings.</p>
      <button class="retry-btn" @click="loadSettings">Retry</button>
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
          <AppSelect
            v-model="settings.scannerCoverProvider"
            :options="[
              { value: 'audible', label: 'Audible' },
              { value: 'itunes', label: 'iTunes' },
              { value: 'openlibrary', label: 'Open Library' },
              { value: 'googlebooks', label: 'Google Books' },
              { value: 'audiobookshelf', label: 'AudioBookShelf' },
            ]"
            @change="dirty = true"
          />
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

      <!-- Backups -->
      <div class="settings-group">
        <p class="group-label">Backups</p>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Auto-backup schedule</p>
            <p class="setting-desc">How often to create automatic backups</p>
          </div>
          <AppSelect
            v-model="settings.backupSchedule"
            :options="[
              { value: false, label: 'Off' },
              { value: '0 1 * * *', label: 'Daily' },
              { value: '0 1 * * 0', label: 'Weekly' },
            ]"
            @change="dirty = true"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Backups to keep</p>
            <p class="setting-desc">Delete older backups beyond this count</p>
          </div>
          <input
            v-model.number="settings.backupsToKeep"
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
          <AppSelect
            v-model="settings.bookshelfView"
            :options="[
              { value: 0, label: 'Bookshelf grid' },
              { value: 1, label: 'List view' },
            ]"
            @change="dirty = true"
          />
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
import { getServerSettings, updateServerSettings } from '@/api/admin/index'
import type { ServerSettings } from '@/api/admin/index'
import AppSelect from '@/components/common/AppSelect.vue'

const loading   = ref(true)
const loadError = ref(false)
const settings  = ref<ServerSettings | null>(null)
const dirty     = ref(false)
const saving    = ref(false)

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

async function loadSettings() {
  loading.value   = true
  loadError.value = false
  try { settings.value = await getServerSettings() }
  catch { loadError.value = true }
  finally { loading.value = false }
}

onMounted(loadSettings)
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

.error-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.retry-btn {
  padding: 8px 24px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(212,160,23,0.12); color: #d4a017; font-size: 13px; font-weight: 600;
}

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

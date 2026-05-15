<template>
  <div class="metadata-view">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <template v-else>
      <div class="settings-group">
        <p class="group-label">Quick Match All</p>
        <p class="group-desc">Match all items in a library to a metadata provider. Runs in the background.</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Library</p>
          </div>
          <select v-model="selectedLibraryId" class="setting-select">
            <option value="" disabled>Select library</option>
            <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Provider</p>
            <p class="setting-desc">Metadata source used for matching</p>
          </div>
          <select v-model="selectedProvider" class="setting-select">
            <option v-for="p in bookProviders" :key="p.value" :value="p.value">{{ p.text }}</option>
          </select>
        </div>

        <div class="setting-row" @click="overrideCover = !overrideCover">
          <div class="setting-info">
            <p class="setting-name">Override cover</p>
            <p class="setting-desc">Replace existing cover with matched result</p>
          </div>
          <div class="toggle" :class="{ on: overrideCover }"><div class="toggle-thumb" /></div>
        </div>

        <div class="setting-row" @click="overrideDetails = !overrideDetails">
          <div class="setting-info">
            <p class="setting-name">Override details</p>
            <p class="setting-desc">Replace title, author, description, etc.</p>
          </div>
          <div class="toggle" :class="{ on: overrideDetails }"><div class="toggle-thumb" /></div>
        </div>

        <p v-if="matchStatus === 'running'" class="status-msg">
          <v-icon size="13" class="spin">mdi-loading</v-icon> Queuing items…
        </p>
        <p v-else-if="matchStatus === 'done'" class="status-msg success">
          <v-icon size="13">mdi-check-circle-outline</v-icon> Match job started in background
        </p>
        <p v-else-if="matchStatus === 'error'" class="status-msg err">
          <v-icon size="13">mdi-alert-circle-outline</v-icon> {{ matchError }}
        </p>

        <button
          class="action-btn"
          :disabled="!selectedLibraryId || matchStatus === 'running'"
          @click="doQuickMatch"
        >
          {{ matchStatus === 'running' ? 'Starting…' : 'Quick Match All' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminLibraries, getSearchProviders, getLibraryItemIds, batchQuickMatch } from '@/api/admin'
import type { AdminLibrary } from '@/api/admin'

const loading            = ref(true)
const libraries          = ref<AdminLibrary[]>([])
const bookProviders      = ref<Array<{ value: string; text: string }>>([])
const selectedLibraryId  = ref('')
const selectedProvider   = ref('google')
const overrideCover      = ref(false)
const overrideDetails    = ref(false)
const matchStatus        = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const matchError         = ref('')

async function doQuickMatch() {
  if (!selectedLibraryId.value) return
  matchStatus.value = 'running'
  matchError.value  = ''
  try {
    const ids = await getLibraryItemIds(selectedLibraryId.value)
    if (!ids.length) {
      matchError.value = 'No items found in this library'
      matchStatus.value = 'error'
      return
    }
    await batchQuickMatch(ids, {
      provider:        selectedProvider.value,
      overrideCover:   overrideCover.value,
      overrideDetails: overrideDetails.value,
    })
    matchStatus.value = 'done'
    setTimeout(() => { matchStatus.value = 'idle' }, 4000)
  } catch (e: unknown) {
    matchError.value  = e instanceof Error ? e.message : 'Failed to start match'
    matchStatus.value = 'error'
  }
}

onMounted(async () => {
  try {
    const [libs, providers] = await Promise.all([
      getAdminLibraries(),
      getSearchProviders(),
    ])
    libraries.value     = libs
    bookProviders.value = providers.books
    if (libs.length) selectedLibraryId.value = libs[0].id
    if (providers.books.length) selectedProvider.value = providers.books[0].value
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.metadata-view { padding: 4px 0; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 56px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.settings-group { display: flex; flex-direction: column; margin-bottom: 24px; }
.group-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 4px;
}
.group-desc { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0 0 8px; line-height: 1.5; }

.setting-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05); cursor: default;
}
.setting-row:last-of-type { border-bottom: none; }
.setting-info { flex: 1; }
.setting-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.setting-desc { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.setting-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 10px; font-size: 12px;
  color: rgba(255,255,255,0.8); outline: none; cursor: pointer; flex-shrink: 0;
  appearance: none; max-width: 160px;
}

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

.status-msg {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(255,255,255,0.5); margin: 10px 0 0;
}
.status-msg.success { color: #22c55e; }
.status-msg.err     { color: #e05555; }

.action-btn {
  margin-top: 16px; padding: 13px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 14px; font-weight: 700; width: 100%;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }

@media (min-width: 768px) {
  .action-btn { max-width: 280px; }
}
</style>

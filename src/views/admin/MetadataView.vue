<template>
  <div class="metadata-view">
    <div class="nav-list">
      <button class="nav-row" @click="open('tags')">
        <span class="nav-label">Manage Tags</span>
        <AppIcon icon="mdi-chevron-right" :size="18" color="rgba(255,255,255,0.3)" />
      </button>
      <button class="nav-row" @click="open('genres')">
        <span class="nav-label">Manage Genres</span>
        <AppIcon icon="mdi-chevron-right" :size="18" color="rgba(255,255,255,0.3)" />
      </button>
      <button class="nav-row" @click="open('providers')">
        <span class="nav-label">Custom Metadata Providers</span>
        <AppIcon icon="mdi-chevron-right" :size="18" color="rgba(255,255,255,0.3)" />
      </button>
    </div>
  </div>

  <!-- Tags sheet -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="activeSheet === 'tags'" class="sheet-backdrop" @click.self="close">
        <div class="sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>
          <div class="sheet-header">
            <h3 class="sheet-title">Manage Tags</h3>
            <button class="sheet-close" @click="close"><AppIcon icon="mdi-close" :size="20" /></button>
          </div>
          <div class="sheet-body">
            <div v-if="listLoading" class="list-loading">
              <div v-for="n in 5" :key="n" class="skel-item" />
            </div>
            <div v-else-if="!items.length" class="empty-state">
              <AppIcon icon="mdi-tag-off-outline" :size="32" color="rgba(255,255,255,0.1)" />
              <p>No tags found</p>
            </div>
            <div v-else class="item-list">
              <div v-for="item in items" :key="item" class="item-row">
                <template v-if="editingItem === item">
                  <input v-model="editValue" class="inline-input" @keyup.enter="saveRename(item)" @keyup.escape="editingItem = ''" />
                  <button class="icon-btn save" :disabled="!editValue.trim() || editValue === item" @click="saveRename(item)">
                    <AppIcon icon="mdi-check" :size="16" />
                  </button>
                  <button class="icon-btn cancel" @click="editingItem = ''">
                    <AppIcon icon="mdi-close" :size="16" />
                  </button>
                </template>
                <template v-else>
                  <span class="item-name">{{ item }}</span>
                  <button class="icon-btn edit" @click="startEdit(item)"><AppIcon icon="mdi-pencil-outline" :size="15" /></button>
                  <button class="icon-btn del" @click="doDelete(item)"><AppIcon icon="mdi-delete-outline" :size="15" /></button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Genres sheet -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="activeSheet === 'genres'" class="sheet-backdrop" @click.self="close">
        <div class="sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>
          <div class="sheet-header">
            <h3 class="sheet-title">Manage Genres</h3>
            <button class="sheet-close" @click="close"><AppIcon icon="mdi-close" :size="20" /></button>
          </div>
          <div class="sheet-body">
            <div v-if="listLoading" class="list-loading">
              <div v-for="n in 5" :key="n" class="skel-item" />
            </div>
            <div v-else-if="!items.length" class="empty-state">
              <AppIcon icon="mdi-shape-outline" :size="32" color="rgba(255,255,255,0.1)" />
              <p>No genres found</p>
            </div>
            <div v-else class="item-list">
              <div v-for="item in items" :key="item" class="item-row">
                <template v-if="editingItem === item">
                  <input v-model="editValue" class="inline-input" @keyup.enter="saveRename(item)" @keyup.escape="editingItem = ''" />
                  <button class="icon-btn save" :disabled="!editValue.trim() || editValue === item" @click="saveRename(item)">
                    <AppIcon icon="mdi-check" :size="16" />
                  </button>
                  <button class="icon-btn cancel" @click="editingItem = ''">
                    <AppIcon icon="mdi-close" :size="16" />
                  </button>
                </template>
                <template v-else>
                  <span class="item-name">{{ item }}</span>
                  <button class="icon-btn edit" @click="startEdit(item)"><AppIcon icon="mdi-pencil-outline" :size="15" /></button>
                  <button class="icon-btn del" @click="doDelete(item)"><AppIcon icon="mdi-delete-outline" :size="15" /></button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Custom Providers sheet -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="activeSheet === 'providers'" class="sheet-backdrop" @click.self="close">
        <div class="sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>
          <div class="sheet-header">
            <h3 class="sheet-title">Custom Metadata Providers</h3>
            <button class="sheet-close" @click="close"><AppIcon icon="mdi-close" :size="20" /></button>
          </div>
          <div class="sheet-body">
            <div v-if="listLoading" class="list-loading">
              <div v-for="n in 3" :key="n" class="skel-item" />
            </div>
            <div v-else>
              <div v-if="providers.length" class="item-list" style="margin-bottom:16px">
                <div v-for="p in providers" :key="p.id" class="provider-row">
                  <div class="provider-info">
                    <p class="provider-name">{{ p.name }}</p>
                    <p class="provider-meta">{{ p.mediaType }} · <span class="provider-url">{{ p.url }}</span></p>
                  </div>
                  <button class="icon-btn del" @click="doDeleteProvider(p.id)"><AppIcon icon="mdi-delete-outline" :size="15" /></button>
                </div>
              </div>
              <div v-else class="empty-state" style="margin-bottom:16px">
                <AppIcon icon="mdi-api" :size="32" color="rgba(255,255,255,0.1)" />
                <p>No custom providers</p>
              </div>

              <div class="add-provider-form">
                <p class="form-label">Add Provider</p>
                <input v-model="newProvider.name" class="form-input" placeholder="Name" />
                <input v-model="newProvider.url" class="form-input" placeholder="URL (https://…)" />
                <input v-model="newProvider.authHeaderValue" class="form-input" placeholder="Auth header value (optional)" />
                <AppSelect
                  v-model="newProvider.mediaType"
                  :options="[
                    { value: 'book', label: 'Book' },
                    { value: 'podcast', label: 'Podcast' },
                  ]"
                  :full="true"
                />
                <p v-if="providerError" class="form-error">{{ providerError }}</p>
                <button class="save-btn" :disabled="!newProvider.name.trim() || !newProvider.url.trim() || providerSaving" @click="doCreateProvider">
                  {{ providerSaving ? 'Adding…' : 'Add Provider' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import {
  getTags, renameTag, deleteTag,
  getGenres, renameGenre, deleteGenre,
  getCustomMetadataProviders, createCustomMetadataProvider, deleteCustomMetadataProvider,
} from '@/api/admin'
import type { CustomMetadataProvider } from '@/api/admin'
import AppSelect from '@/components/common/AppSelect.vue'

type Sheet = 'tags' | 'genres' | 'providers' | null

const activeSheet  = ref<Sheet>(null)
const listLoading  = ref(false)
const items        = ref<string[]>([])
const providers    = ref<CustomMetadataProvider[]>([])
const editingItem  = ref('')
const editValue    = ref('')

const newProvider = ref({ name: '', url: '', mediaType: 'book' as 'book' | 'podcast', authHeaderValue: '' })
const providerSaving = ref(false)
const providerError  = ref('')

async function open(sheet: Sheet) {
  activeSheet.value = sheet
  listLoading.value = true
  items.value       = []
  providers.value   = []
  editingItem.value = ''
  try {
    if (sheet === 'tags')      items.value     = (await getTags()).sort()
    if (sheet === 'genres')    items.value     = (await getGenres()).sort()
    if (sheet === 'providers') providers.value = await getCustomMetadataProviders()
  } catch { /* ignore */ }
  finally { listLoading.value = false }
}

function close() { activeSheet.value = null }

function startEdit(item: string) {
  editingItem.value = item
  editValue.value   = item
}

async function saveRename(oldVal: string) {
  const newVal = editValue.value.trim()
  if (!newVal || newVal === oldVal) return
  try {
    if (activeSheet.value === 'tags')   await renameTag(oldVal, newVal)
    if (activeSheet.value === 'genres') await renameGenre(oldVal, newVal)
    const idx = items.value.indexOf(oldVal)
    if (idx !== -1) items.value[idx] = newVal
    items.value.sort()
  } catch { /* ignore */ }
  finally { editingItem.value = '' }
}

async function doDelete(val: string) {
  try {
    if (activeSheet.value === 'tags')   await deleteTag(val)
    if (activeSheet.value === 'genres') await deleteGenre(val)
    items.value = items.value.filter(i => i !== val)
  } catch { /* ignore */ }
}

async function doDeleteProvider(id: string) {
  try {
    await deleteCustomMetadataProvider(id)
    providers.value = providers.value.filter(p => p.id !== id)
  } catch { /* ignore */ }
}

async function doCreateProvider() {
  if (!newProvider.value.name.trim() || !newProvider.value.url.trim()) return
  providerSaving.value = true
  providerError.value  = ''
  try {
    const p = await createCustomMetadataProvider({
      name:            newProvider.value.name.trim(),
      url:             newProvider.value.url.trim(),
      mediaType:       newProvider.value.mediaType,
      authHeaderValue: newProvider.value.authHeaderValue.trim() || undefined,
    })
    providers.value.push(p)
    newProvider.value = { name: '', url: '', mediaType: 'book', authHeaderValue: '' }
  } catch (e: unknown) {
    providerError.value = e instanceof Error ? e.message : 'Failed to add provider'
  } finally { providerSaving.value = false }
}
</script>

<style scoped>
.metadata-view { padding: 4px 0; }

.nav-list { display: flex; flex-direction: column; }
.nav-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.06);
  cursor: pointer; width: 100%; text-align: left;
}
.nav-row:last-child { border-bottom: none; }
.nav-label { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.85); }

.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; max-height: 80vh; display: flex; flex-direction: column;
}
.drag-handle-area { padding: 10px 0 4px; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 20px 12px; flex-shrink: 0;
}
.sheet-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 4px; }
.sheet-body { overflow-y: auto; padding: 0 20px 40px; flex: 1; }

.list-loading { display: flex; flex-direction: column; gap: 8px; }
.skel-item {
  height: 40px; border-radius: 8px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.item-list { display: flex; flex-direction: column; }
.item-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.item-row:last-child { border-bottom: none; }
.item-name { flex: 1; font-size: 13px; color: rgba(255,255,255,0.85); }

.inline-input {
  flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px; padding: 5px 8px; font-size: 13px; color: rgba(255,255,255,0.9); outline: none;
}

.icon-btn {
  background: transparent; border: none; cursor: pointer; padding: 5px; border-radius: 6px; flex-shrink: 0;
}
.icon-btn.edit   { color: rgba(255,255,255,0.35); }
.icon-btn.del    { color: rgba(220,50,50,0.5); }
.icon-btn.save   { color: #22c55e; }
.icon-btn.cancel { color: rgba(255,255,255,0.35); }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.provider-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.provider-row:last-child { border-bottom: none; }
.provider-info { flex: 1; min-width: 0; }
.provider-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.provider-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; text-transform: capitalize; }
.provider-url  { font-size: 10px; color: rgba(255,255,255,0.3); word-break: break-all; }

.add-provider-form { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 4px; }
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; box-sizing: border-box;
}
.form-select { appearance: none; }
.form-error { font-size: 12px; color: #e05555; margin: 0; }
.save-btn {
  padding: 12px; border-radius: 10px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 14px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

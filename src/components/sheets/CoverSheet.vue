<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="cover-sheet-overlay" @click.self="close">
        <div class="cover-sheet">
          <div class="sheet-handle" />

          <div class="sheet-header">
            <p class="sheet-title">Update Cover</p>
            <button class="sheet-close-btn" @click="close">
              <AppIcon icon="mdi-close" :size="16" />
            </button>
          </div>

          <div class="sheet-body">
            <!-- Section 1: Search -->
            <p class="section-label">Search for Cover</p>
            <select v-model="searchProvider" class="cover-input cover-select" :disabled="searching || saving">
              <option value="google">Google Books</option>
              <option value="openlibrary">Open Library</option>
              <option value="audible">Audible</option>
              <option value="itunes">iTunes</option>
            </select>
            <input
              v-model="searchTitle"
              class="cover-input"
              placeholder="Title"
              :disabled="searching || saving"
              @keydown.enter="doSearch"
            />
            <input
              v-model="searchAuthor"
              class="cover-input"
              placeholder="Author"
              :disabled="searching || saving"
              @keydown.enter="doSearch"
            />
            <button
              class="gold-btn"
              :disabled="!searchTitle.trim() || searching || saving"
              @click="doSearch"
            >
              <AppIcon icon="mdi-loading" v-if="searching" :size="15" class="spin" />
              <AppIcon icon="mdi-magnify" v-else :size="15" />
              {{ searching ? 'Searching…' : 'Search' }}
            </button>

            <div v-if="searchDone && !coverResults.length" class="no-results">No results found</div>
            <div v-if="coverResults.length" class="cover-results-grid">
              <button
                v-for="(r, i) in coverResults"
                :key="i"
                class="cover-result-item"
                :disabled="saving"
                @click="applyCoverFromSearch(r.cover)"
              >
                <img :src="r.cover" :alt="r.title" loading="lazy" />
                <span class="cover-result-title">{{ r.title }}</span>
              </button>
            </div>

            <div class="section-gap" />

            <!-- Section 2: URL -->
            <p class="section-label">Cover URL</p>
            <input
              v-model="urlInput"
              class="cover-input"
              placeholder="https://…"
              type="url"
              :disabled="saving"
              @keydown.enter="applyUrl"
            />
            <button
              class="gold-btn"
              :disabled="!urlInput.trim() || saving"
              @click="applyUrl"
            >
              <AppIcon icon="mdi-loading" v-if="saving && activeAction === 'url'" :size="15" class="spin" />
              {{ saving && activeAction === 'url' ? 'Applying…' : 'Apply' }}
            </button>

            <div class="section-gap" />

            <!-- Section 3: Upload -->
            <p class="section-label">Upload Image</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden-file-input"
              @change="onFileChange"
            />
            <button class="upload-pick-btn" :disabled="saving" @click="fileInputRef?.click()">
              <AppIcon icon="mdi-image-plus-outline" :size="15" color="rgba(212,160,23,0.8)" />
              {{ pickedFile ? pickedFile.name : 'Choose Image' }}
            </button>
            <button
              class="gold-btn"
              :disabled="!pickedFile || saving"
              @click="uploadFile"
            >
              <AppIcon icon="mdi-loading" v-if="saving && activeAction === 'upload'" :size="15" class="spin" />
              {{ saving && activeAction === 'upload' ? 'Uploading…' : 'Upload' }}
            </button>

            <div class="section-gap" />

            <!-- Section 4: Remove -->
            <p class="section-label">Remove</p>
            <button
              class="destructive-btn"
              :disabled="saving"
              @click="removeCover"
            >
              <AppIcon icon="mdi-loading" v-if="saving && activeAction === 'remove'" :size="15" class="spin" />
              {{ saving && activeAction === 'remove' ? 'Removing…' : 'Remove Cover' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api/client'
import { useNotificationStore } from '@/stores/notifications'

const props = defineProps<{ modelValue: boolean; itemId: string; itemTitle?: string; itemAuthor?: string }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean]; updated: [] }>()

const notify = useNotificationStore()

const urlInput      = ref('')
const pickedFile    = ref<File | null>(null)
const fileInputRef  = ref<HTMLInputElement | null>(null)
const saving        = ref(false)
const activeAction  = ref<'url' | 'upload' | 'remove' | null>(null)

const searchProvider = ref('google')
const searchTitle    = ref('')
const searchAuthor   = ref('')
const searching      = ref(false)
const searchDone     = ref(false)
const coverResults   = ref<Array<{ title: string; cover: string }>>([])

watch(() => props.modelValue, (opened) => {
  if (opened) {
    urlInput.value      = ''
    pickedFile.value    = null
    saving.value        = false
    activeAction.value  = null
    searchTitle.value   = props.itemTitle ?? ''
    searchAuthor.value  = props.itemAuthor ?? ''
    searchDone.value    = false
    coverResults.value  = []
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}, { immediate: true })

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  pickedFile.value = target.files?.[0] ?? null
}

async function doSearch() {
  if (!searchTitle.value.trim() || searching.value) return
  searching.value   = true
  searchDone.value  = false
  coverResults.value = []
  try {
    const res = await api.get('/search/books', {
      params: { title: searchTitle.value.trim(), author: searchAuthor.value.trim(), provider: searchProvider.value },
    })
    const matches = res.data?.matches ?? res.data ?? []
    coverResults.value = (matches as Array<Record<string, unknown>>)
      .filter(m => m.cover)
      .map(m => ({ title: String(m.title ?? ''), cover: String(m.cover) }))
    searchDone.value = true
  } catch {
    notify.show('Search failed', 'error')
  } finally {
    searching.value = false
  }
}

async function applyCoverFromSearch(url: string) {
  if (saving.value) return
  saving.value      = true
  activeAction.value = 'url'
  try {
    await api.post(`/items/${props.itemId}/cover`, { url })
    notify.show('Cover updated', 'success')
    emit('updated')
    close()
  } catch {
    notify.show('Failed to update cover', 'error')
  } finally {
    saving.value      = false
    activeAction.value = null
  }
}

async function applyUrl() {
  if (!urlInput.value.trim() || saving.value) return
  saving.value = true
  activeAction.value = 'url'
  try {
    await api.post(`/items/${props.itemId}/cover`, { url: urlInput.value.trim() })
    notify.show('Cover updated', 'success')
    urlInput.value = ''
    emit('updated')
    close()
  } catch {
    notify.show('Failed to update cover', 'error')
  } finally {
    saving.value = false
    activeAction.value = null
  }
}

async function uploadFile() {
  if (!pickedFile.value || saving.value) return
  saving.value = true
  activeAction.value = 'upload'
  try {
    const formData = new FormData()
    formData.append('cover', pickedFile.value)
    await api.post(`/items/${props.itemId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    notify.show('Cover updated', 'success')
    pickedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    emit('updated')
    close()
  } catch {
    notify.show('Failed to upload cover', 'error')
  } finally {
    saving.value = false
    activeAction.value = null
  }
}

async function removeCover() {
  if (saving.value) return
  saving.value = true
  activeAction.value = 'remove'
  try {
    await api.delete(`/items/${props.itemId}/cover`)
    notify.show('Cover removed', 'success')
    emit('updated')
    close()
  } catch {
    notify.show('Failed to remove cover', 'error')
  } finally {
    saving.value = false
    activeAction.value = null
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.cover-sheet-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end;
}
.cover-sheet {
  width: 100%; background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 0 40px;
  max-height: 85vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain;
}
.cover-sheet::-webkit-scrollbar { display: none; }

.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.18); margin: 10px auto 0;
}
@media (min-width: 520px) {
  .sheet-handle { display: none; }
}

.sheet-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px 8px;
}
.sheet-title {
  flex: 1; margin: 0;
  font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.92);
}
.sheet-close-btn {
  background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; color: rgba(255,255,255,0.5);
}

.sheet-body {
  padding: 4px 16px 0;
}

.section-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: rgba(255,255,255,0.3);
  margin: 0 0 8px;
}

.section-gap {
  height: 20px;
}

.cover-input {
  width: 100%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  outline: none;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.cover-input:focus { border-color: rgba(212,160,23,0.4); }
.cover-input:disabled { opacity: 0.5; cursor: not-allowed; }

.hidden-file-input {
  position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0;
}

.upload-pick-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px; color: rgba(255,255,255,0.6);
  cursor: pointer; text-align: left;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.upload-pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.gold-btn {
  width: 100%;
  background: #d4a017; color: #111;
  font-size: 13px; font-weight: 700;
  padding: 12px; border-radius: 12px;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.gold-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.destructive-btn {
  background: rgba(255,60,60,0.08);
  border: 1px solid rgba(255,60,60,0.15);
  color: rgba(255,80,80,0.75);
  border-radius: 12px; padding: 10px;
  width: 100%; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.destructive-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cover-select {
  appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; background-size: 10px;
  padding-right: 32px; cursor: pointer;
}
.no-results {
  font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px 0 4px;
}
.cover-results-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px;
}
.cover-result-item {
  background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  overflow: hidden; cursor: pointer; padding: 0; display: flex; flex-direction: column;
  transition: border-color 0.15s;
}
.cover-result-item:hover { border-color: rgba(212,160,23,0.4); }
.cover-result-item:disabled { opacity: 0.5; cursor: not-allowed; }
.cover-result-item img { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
.cover-result-title {
  font-size: 9px; color: rgba(255,255,255,0.45); padding: 4px 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
}

.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Transitions — mobile: slide up from bottom */
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .cover-sheet, .sheet-leave-active .cover-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .cover-sheet, .sheet-leave-to .cover-sheet { transform: translateY(100%); }

/* Desktop: centered modal card with scale animation */
@media (min-width: 520px) {
  .cover-sheet-overlay { align-items: center; justify-content: center; }
  .cover-sheet {
    width: 480px; border-radius: 20px;
    border-top: none; max-height: 80vh;
  }
  .sheet-enter-from .cover-sheet, .sheet-leave-to .cover-sheet { transform: scale(0.96) translateY(8px); }
}
</style>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="cover-sheet-overlay" @click.self="close">
        <div class="cover-sheet">
          <div class="sheet-handle" />

          <div class="sheet-header">
            <p class="sheet-title">Update Cover</p>
            <button class="sheet-close-btn" @click="close">
              <v-icon size="16">mdi-close</v-icon>
            </button>
          </div>

          <div class="sheet-body">
            <!-- Section 1: URL -->
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
              <v-icon v-if="saving && activeAction === 'url'" size="15" class="spin">mdi-loading</v-icon>
              {{ saving && activeAction === 'url' ? 'Applying…' : 'Apply' }}
            </button>

            <div class="section-gap" />

            <!-- Section 2: Upload -->
            <p class="section-label">Upload Image</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden-file-input"
              @change="onFileChange"
            />
            <button class="upload-pick-btn" :disabled="saving" @click="fileInputRef?.click()">
              <v-icon size="15" color="rgba(212,160,23,0.8)">mdi-image-plus-outline</v-icon>
              {{ pickedFile ? pickedFile.name : 'Choose Image' }}
            </button>
            <button
              class="gold-btn"
              :disabled="!pickedFile || saving"
              @click="uploadFile"
            >
              <v-icon v-if="saving && activeAction === 'upload'" size="15" class="spin">mdi-loading</v-icon>
              {{ saving && activeAction === 'upload' ? 'Uploading…' : 'Upload' }}
            </button>

            <div class="section-gap" />

            <!-- Section 3: Remove -->
            <p class="section-label">Remove</p>
            <button
              class="destructive-btn"
              :disabled="saving"
              @click="removeCover"
            >
              <v-icon v-if="saving && activeAction === 'remove'" size="15" class="spin">mdi-loading</v-icon>
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

const props = defineProps<{ modelValue: boolean; itemId: string }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean]; updated: [] }>()

const notify = useNotificationStore()

const urlInput = ref('')
const pickedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const activeAction = ref<'url' | 'upload' | 'remove' | null>(null)

watch(() => props.modelValue, (opened) => {
  if (opened) {
    urlInput.value = ''
    pickedFile.value = null
    saving.value = false
    activeAction.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
})

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  pickedFile.value = target.files?.[0] ?? null
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

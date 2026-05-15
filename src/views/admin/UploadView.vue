<template>
  <div class="upload-view">
    <div class="view-header">
      <h3 class="view-title">Upload Files</h3>
    </div>

    <!-- Library picker -->
    <div class="form-group">
      <label class="form-label">Library</label>
      <select v-model="selectedLibraryId" class="form-select">
        <option value="">Select library…</option>
        <option v-for="l in lib.libraries" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
    </div>

    <!-- Folder / item title -->
    <div class="form-group">
      <label class="form-label">Folder / Book title</label>
      <input v-model="folderName" class="form-input" placeholder="My New Book" />
    </div>

    <!-- Drop zone -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragging, 'has-files': files.length > 0 }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInputEl?.click()"
    >
      <input ref="fileInputEl" type="file" multiple accept="audio/*,.m4b,.mp3,.flac,.ogg,.epub,.pdf" class="file-input" @change="onFileChange" />
      <v-icon v-if="!files.length" size="40" color="rgba(255,255,255,0.2)">mdi-cloud-upload-outline</v-icon>
      <p v-if="!files.length" class="drop-text">Tap or drag audio files here</p>
      <p v-if="!files.length" class="drop-sub">mp3, m4b, flac, ogg, epub, pdf</p>
      <div v-else class="file-list">
        <div v-for="f in files" :key="f.name" class="file-row">
          <v-icon size="16" color="rgba(255,255,255,0.5)">{{ fileIcon(f) }}</v-icon>
          <span class="file-name">{{ f.name }}</span>
          <span class="file-size">{{ formatSize(f.size) }}</span>
        </div>
      </div>
    </div>

    <!-- Clear files -->
    <button v-if="files.length" class="clear-btn" @click="files = []">Clear files</button>

    <!-- Upload progress -->
    <div v-if="uploading" class="progress-wrap">
      <div class="progress-bar" :style="{ width: `${uploadProgress}%` }" />
      <p class="progress-label">{{ Math.round(uploadProgress) }}% — {{ uploadedCount }} / {{ files.length }} files</p>
    </div>

    <!-- Result -->
    <div v-if="uploadResult" class="result-msg" :class="uploadResult.type">
      <v-icon size="18">{{ uploadResult.type === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ uploadResult.message }}
    </div>

    <!-- Upload button -->
    <button
      class="upload-btn"
      :disabled="!selectedLibraryId || !files.length || uploading"
      @click="doUpload"
    >
      <v-icon size="18" color="white">mdi-upload</v-icon>
      {{ uploading ? 'Uploading…' : `Upload ${files.length ? files.length + ' file' + (files.length !== 1 ? 's' : '') : ''}` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { api } from '@/api/client'

const lib = useLibraryStore()

const selectedLibraryId = ref(lib.activeLibraryId ?? '')
const folderName        = ref('')
const files             = ref<File[]>([])
const isDragging        = ref(false)
const uploading         = ref(false)
const uploadProgress    = ref(0)
const uploadedCount     = ref(0)
const uploadResult      = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const fileInputEl       = ref<HTMLInputElement | null>(null)

function fileIcon(f: File): string {
  if (f.type.startsWith('audio') || f.name.match(/\.(m4b|mp3|flac|ogg|aac)$/i)) return 'mdi-music'
  if (f.name.match(/\.epub$/i)) return 'mdi-book-open-variant'
  if (f.name.match(/\.pdf$/i)) return 'mdi-file-pdf-box'
  return 'mdi-file-outline'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const dropped = Array.from(e.dataTransfer?.files ?? [])
  files.value = [...files.value, ...dropped]
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  files.value = Array.from(input.files ?? [])
}

async function doUpload() {
  if (!selectedLibraryId.value || !files.value.length) return
  uploading.value     = true
  uploadResult.value  = null
  uploadedCount.value = 0
  uploadProgress.value = 0

  const total = files.value.length
  let succeeded = 0

  for (let i = 0; i < files.value.length; i++) {
    const f   = files.value[i]
    const fd  = new FormData()
    fd.append('title', folderName.value || f.name.replace(/\.[^.]+$/, ''))
    fd.append('library', selectedLibraryId.value)
    fd.append('folder', folderName.value || '')
    fd.append(`0`, f)
    try {
      await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      succeeded++
    } catch { /* individual file failure is non-fatal */ }
    uploadedCount.value = i + 1
    uploadProgress.value = ((i + 1) / total) * 100
  }

  uploading.value = false
  if (succeeded === total) {
    uploadResult.value = { type: 'success', message: `${succeeded} file${succeeded !== 1 ? 's' : ''} uploaded successfully` }
    files.value = []
    folderName.value = ''
  } else {
    uploadResult.value = { type: 'error', message: `${succeeded}/${total} files uploaded — some failed` }
  }
}
</script>

<style scoped>
.upload-view { padding: 16px 0 40px; }
.view-header { margin-bottom: 20px; }
.view-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.85);
  outline: none; box-sizing: border-box;
}
.form-select {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.85);
  outline: none; appearance: none;
}

.drop-zone {
  border: 2px dashed rgba(255,255,255,0.12); border-radius: 14px;
  padding: 32px 16px; display: flex; flex-direction: column;
  align-items: center; gap: 6px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 12px;
}
.drop-zone.drag-over { border-color: #d4a017; background: rgba(212,160,23,0.06); }
.drop-zone.has-files { padding: 16px; }
.file-input { display: none; }
.drop-text { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }
.drop-sub { font-size: 11px; color: rgba(255,255,255,0.25); margin: 0; }

.file-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.file-row { display: flex; align-items: center; gap: 8px; }
.file-name { flex: 1; font-size: 12px; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 10px; color: rgba(255,255,255,0.3); flex-shrink: 0; }

.clear-btn {
  display: block; font-size: 11px; color: rgba(255,255,255,0.3); background: transparent;
  border: none; cursor: pointer; padding: 0; margin-bottom: 12px;
}

.progress-wrap { margin-bottom: 14px; }
.progress-bar {
  height: 4px; border-radius: 2px; background: #d4a017;
  transition: width 0.3s; margin-bottom: 4px;
}
.progress-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }

.result-msg {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-radius: 10px; font-size: 12px; margin-bottom: 14px;
}
.result-msg.success { background: rgba(34,197,94,0.1); color: #22c55e; }
.result-msg.error   { background: rgba(239,68,68,0.1); color: #ef4444; }

.upload-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  background: #d4a017; color: white; font-size: 14px; font-weight: 700;
  cursor: pointer;
}
.upload-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

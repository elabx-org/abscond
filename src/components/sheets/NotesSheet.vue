<template>
  <v-bottom-sheet v-model="show" :scrim="true" max-height="90vh">
    <v-card class="notes-sheet" rounded="t-xl">
      <div class="drag-handle" />

      <!-- Header -->
      <div class="sheet-header">
        <AppIcon icon="mdi-note-text" :size="20" :color="accent" />
        <div class="header-meta">
          <span class="header-title">Notes</span>
          <span class="header-sub">{{ itemTitle }}</span>
        </div>
        <v-btn v-if="notes.length > 0" icon variant="text" size="small" @click="exportNotes">
          <AppIcon icon="mdi-export-variant" :size="18" />
        </v-btn>
        <v-btn icon variant="text" size="small" @click="openEditor()">
          <AppIcon icon="mdi-plus" :size="20" />
        </v-btn>
      </div>
      <v-divider />

      <!-- Empty state -->
      <div v-if="notes.length === 0" class="empty-state">
        <AppIcon icon="mdi-note-plus-outline" :size="48" color="rgba(255,255,255,0.1)" />
        <p class="empty-title">No notes yet</p>
        <p class="empty-sub">Markdown is supported</p>
      </div>

      <!-- Notes list -->
      <div v-else class="notes-list">
        <div
          v-for="(note, i) in notes"
          :key="note.createdAt"
          class="note-card"
          @click="openEditor(i)"
        >
          <div class="note-card-header">
            <span class="note-title">{{ note.title || 'Untitled' }}</span>
            <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
          </div>
          <p v-if="note.body" class="note-preview">{{ stripMarkdown(note.body) }}</p>
          <v-btn
            icon variant="text" size="x-small"
            class="note-delete"
            @click.stop="confirmDelete(i)"
          >
            <AppIcon icon="mdi-delete-outline" :size="14" color="rgba(255,255,255,0.25)" />
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-bottom-sheet>

  <!-- Editor dialog -->
  <v-dialog v-model="editorOpen" max-width="600" scrollable>
    <v-card class="note-editor" rounded="xl">
      <div class="editor-header">
        <span class="editor-title">{{ editIndex === null ? 'New Note' : 'Edit Note' }}</span>
        <div style="flex:1" />
        <v-btn variant="text" size="small" @click="togglePreview">
          {{ preview ? 'Edit' : 'Preview' }}
        </v-btn>
        <v-btn variant="tonal" size="small" :color="accent" @click="saveNote">Save</v-btn>
      </div>
      <v-divider />
      <div class="editor-body">
        <v-text-field
          v-model="editTitle"
          placeholder="Title"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />
        <div v-if="preview" class="md-preview" v-html="renderedBody" />
        <v-textarea
          v-else
          v-model="editBody"
          placeholder="Write your note... (Markdown supported)"
          variant="outlined"
          rows="10"
          auto-grow
          hide-details
          style="font-family: monospace; font-size: 13px;"
        />
      </div>
    </v-card>
  </v-dialog>

  <!-- Delete confirm -->
  <v-dialog v-model="deleteDialog" max-width="340">
    <v-card rounded="xl" class="pa-4">
      <v-card-title class="text-body-1 font-weight-bold">Delete note?</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ deleteTargetTitle ? `"${deleteTargetTitle}"` : 'This note' }} will be permanently removed.
      </v-card-text>
      <v-card-actions class="justify-end pt-0">
        <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn variant="tonal" color="error" @click="doDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getNotes, addNote, updateNote, deleteNote } from '@/api/notes'
import type { Note } from '@/api/notes'

const props = defineProps<{ modelValue: boolean; itemId: string; itemTitle: string; accent?: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const show = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })
const accent = computed(() => props.accent ?? '#7c9ef0')

const notes = ref<Note[]>([])
const editorOpen = ref(false)
const editIndex = ref<number | null>(null)
const editTitle = ref('')
const editBody = ref('')
const preview = ref(false)
const deleteDialog = ref(false)
const deleteIndex = ref<number | null>(null)
const deleteTargetTitle = ref('')

watch(() => props.modelValue, v => { if (v) notes.value = getNotes(props.itemId) })

function openEditor(index?: number) {
  if (index !== undefined) {
    editIndex.value = index
    editTitle.value = notes.value[index].title
    editBody.value = notes.value[index].body
  } else {
    editIndex.value = null
    editTitle.value = ''
    editBody.value = ''
  }
  preview.value = false
  editorOpen.value = true
}

function saveNote() {
  const t = editTitle.value.trim()
  const b = editBody.value.trim()
  if (!t && !b) { editorOpen.value = false; return }
  if (editIndex.value !== null) {
    notes.value = updateNote(props.itemId, editIndex.value, t, b)
  } else {
    notes.value = addNote(props.itemId, t, b)
  }
  editorOpen.value = false
}

function confirmDelete(i: number) {
  deleteIndex.value = i
  deleteTargetTitle.value = notes.value[i].title || 'Untitled'
  deleteDialog.value = true
}

function doDelete() {
  if (deleteIndex.value !== null) notes.value = deleteNote(props.itemId, deleteIndex.value)
  deleteDialog.value = false
}

function togglePreview() { preview.value = !preview.value }

const renderedBody = computed(() => {
  if (!editBody.value) return ''
  return editBody.value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>')
})

function stripMarkdown(md: string): string {
  return md.replace(/[*_`#>]/g, '').replace(/\n/g, ' ').slice(0, 120)
}

function formatDate(iso: string): string {
  const dt = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - dt.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return dt.toLocaleDateString()
}

function exportNotes() {
  const lines: string[] = [`# ${props.itemTitle} — Notes\n`]
  for (const n of notes.value) {
    const title = n.title || 'Untitled'
    lines.push(`## ${title}`)
    if (n.body) lines.push('', n.body)
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${props.itemTitle.replace(/[^a-z0-9]/gi, '_')}_notes.md`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.notes-sheet { background: #1a1a2e; min-height: 60vh; display: flex; flex-direction: column; }
.drag-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 10px auto 0; }
.sheet-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px 10px; }
.header-meta { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.header-title { font-size: 15px; font-weight: 600; }
.header-sub { font-size: 12px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; }
.empty-title { font-size: 14px; color: rgba(255,255,255,0.3); }
.empty-sub { font-size: 12px; color: rgba(255,255,255,0.18); }
.notes-list { overflow-y: auto; padding: 8px 16px 32px; display: flex; flex-direction: column; gap: 8px; }
.note-card { position: relative; background: rgba(255,255,255,0.05); border-radius: 14px; padding: 12px 36px 12px 14px; cursor: pointer; }
.note-card:hover { background: rgba(255,255,255,0.08); }
.note-card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.note-title { font-size: 13px; font-weight: 600; }
.note-date { font-size: 11px; color: rgba(255,255,255,0.35); white-space: nowrap; }
.note-preview { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.note-delete { position: absolute; top: 8px; right: 6px; }
.note-editor { background: #1a1a2e; }
.editor-header { display: flex; align-items: center; gap: 8px; padding: 14px 16px 12px; }
.editor-title { font-size: 15px; font-weight: 600; }
.editor-body { padding: 16px; }
.md-preview { min-height: 200px; padding: 14px; background: rgba(255,255,255,0.04); border-radius: 12px; font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.8); }
.md-preview :deep(h1) { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
.md-preview :deep(h2) { font-size: 15px; font-weight: 600; margin: 12px 0 6px; }
.md-preview :deep(h3) { font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
.md-preview :deep(code) { background: rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 5px; font-family: monospace; }
.md-preview :deep(blockquote) { border-left: 3px solid v-bind(accent); padding-left: 12px; color: rgba(255,255,255,0.55); margin: 8px 0; }
.md-preview :deep(strong) { font-weight: 700; }
</style>

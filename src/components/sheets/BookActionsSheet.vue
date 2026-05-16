<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="book-actions-overlay" @click.self="close">
        <div class="book-actions-sheet">
          <div class="actions-handle" />

          <button
            v-for="item in visibleItems"
            :key="item.id"
            class="action-row"
            :class="{ 'action-row--destructive': item.destructive }"
            :data-action="item.id"
            @click="pick(item.id)"
          >
            <v-icon size="18" class="action-row-icon">{{ item.icon }}</v-icon>
            <span class="action-row-label">{{ item.label }}</span>
            <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  progress: number
  isAdmin: boolean
  goodreadsEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  action: [id: string]
}>()

const ALL_ITEMS = [
  { id: 'notes',      label: 'Notes',              icon: 'mdi-note-text-outline',        destructive: false, always: true  },
  { id: 'playlist',   label: 'Add to Playlist',    icon: 'mdi-playlist-plus',            destructive: false, always: true  },
  { id: 'collection', label: 'Add to Collection',  icon: 'mdi-bookmark-plus-outline',    destructive: false, always: true  },
  { id: 'share',      label: 'Share',              icon: 'mdi-share-outline',            destructive: false, always: true  },
  { id: 'play-next',  label: 'Play Next',          icon: 'mdi-skip-next-circle-outline', destructive: false, always: true  },
  { id: 'queue',      label: 'Add to Queue',       icon: 'mdi-playlist-music',           destructive: false, always: true  },
  { id: 'reset',      label: 'Reset Progress',     icon: 'mdi-restart',                  destructive: false, always: false },
  { id: 'goodreads',  label: 'Goodreads',          icon: 'mdi-bookshelf',                destructive: false, always: false },
  { id: 'cover',         label: 'Update Cover',       icon: 'mdi-image-edit-outline',       destructive: false, always: false },
  { id: 'chapters',      label: 'Edit Chapters',      icon: 'mdi-format-list-numbered',     destructive: false, always: false },
  { id: 'files',         label: 'View Files',         icon: 'mdi-file-multiple-outline',    destructive: false, always: false },
  { id: 'match',         label: 'Match Metadata',     icon: 'mdi-magnify-scan',             destructive: false, always: false },
  { id: 'edit',          label: 'Edit Metadata',      icon: 'mdi-pencil-outline',           destructive: false, always: false },
  { id: 'embed-meta',    label: 'Embed Metadata',     icon: 'mdi-tag-arrow-down-outline',   destructive: false, always: false },
  { id: 'make-m4b',      label: 'Make M4B',           icon: 'mdi-music-box-outline',        destructive: false, always: false },
  { id: 'scan',          label: 'Scan',               icon: 'mdi-radar',                    destructive: false, always: false },
  { id: 'delete',        label: 'Delete',             icon: 'mdi-delete-outline',           destructive: true,  always: false },
]

const visibleItems = computed(() =>
  ALL_ITEMS.filter(item => {
    if (item.always) return true
    if (item.id === 'reset')     return props.progress > 0
    if (item.id === 'goodreads') return props.goodreadsEnabled
    if (item.id === 'cover')      return props.isAdmin
    if (item.id === 'chapters')   return props.isAdmin
    if (item.id === 'files')      return props.isAdmin
    if (item.id === 'match')      return props.isAdmin
    if (item.id === 'edit')       return props.isAdmin
    if (item.id === 'embed-meta') return props.isAdmin
    if (item.id === 'make-m4b')   return props.isAdmin
    if (item.id === 'scan')       return props.isAdmin
    if (item.id === 'delete')     return props.isAdmin
    return false
  })
)

function pick(id: string) {
  emit('action', id)
  emit('update:modelValue', false)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.book-actions-overlay {
  position: fixed; inset: 0; z-index: 450;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end;
}
.book-actions-sheet {
  width: 100%; background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 12px 40px;
  max-height: 85vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain;
}
.book-actions-sheet::-webkit-scrollbar { display: none; }
.actions-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.18); margin: 10px auto 8px;
}
.action-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 8px;
  background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer; width: 100%; text-align: left;
}
.action-row:last-child { border-bottom: none; }
.action-row-icon { flex-shrink: 0; color: rgba(212,160,23,0.8); }
.action-row--destructive .action-row-icon { color: rgba(255,80,80,0.75); }
.action-row-label {
  flex: 1; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.8);
}
.action-row--destructive .action-row-label { color: rgba(255,80,80,0.8); }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-actions-sheet, .sheet-leave-active .book-actions-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-actions-sheet, .sheet-leave-to .book-actions-sheet { transform: translateY(100%); }
@media (min-width: 1280px) {
  .book-actions-overlay { align-items: center; justify-content: center; }
  .book-actions-sheet { width: 480px; border-radius: 20px; max-height: 80vh; }
  .sheet-enter-from .book-actions-sheet, .sheet-leave-to .book-actions-sheet { transform: scale(0.96) translateY(8px); }
}
</style>

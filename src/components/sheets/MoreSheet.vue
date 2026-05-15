<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="modelValue" class="more-scrim" @click="$emit('update:modelValue', false)" />
    </Transition>
    <Transition name="sheet">
      <div v-if="modelValue" class="more-sheet">
        <div class="more-drag-row">
          <div class="more-drag-handle" />
          <button class="more-edit-btn" @click="editing = true" title="Edit layout">
            <v-icon size="15" color="rgba(255,255,255,0.4)">mdi-pencil-outline</v-icon>
          </button>
        </div>

        <!-- Normal mode: list of overflow items -->
        <template v-if="!editing">
          <button
            v-for="item in ITEMS"
            :key="item.id"
            class="more-row"
            :class="{ 'more-row--destructive': item.destructive }"
            @click="handleItem(item.id)"
          >
            <v-icon size="18" class="more-row-icon" :color="item.destructive ? 'rgba(255,80,80,0.75)' : 'rgba(212,160,23,0.8)'">
              {{ item.icon }}
            </v-icon>
            <span class="more-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
          </button>
        </template>

        <!-- Edit Layout mode -->
        <template v-else>
          <div class="edit-header">
            <span class="edit-title">Edit Layout</span>
            <button class="edit-done-btn" @click="editing = false">
              <v-icon size="16" color="#d4a017">mdi-check</v-icon>
              Done
            </button>
          </div>
          <div class="edit-chips">
            <button
              class="edit-chip"
              :class="{ active: iconsOnly }"
              @click="iconsOnly = !iconsOnly; saveLayout()"
            >Icons only</button>
            <button
              class="edit-chip"
              :class="{ active: moreInGrid }"
              @click="moreInGrid = !moreInGrid; saveLayout()"
            >More in grid</button>
          </div>
          <p class="edit-hint">Drag items across the divider to move them between the grid and this menu.</p>
          <div class="edit-section-label">On card</div>
          <div
            v-for="item in ITEMS.slice(0, 4)"
            :key="item.id"
            class="edit-row edit-row--on-card"
          >
            <v-icon size="16" :color="item.destructive ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.55)'">{{ item.icon }}</v-icon>
            <span class="edit-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-drag-vertical</v-icon>
          </div>
          <div class="edit-divider"><div class="edit-div-line"/><span class="edit-div-label">In menu</span><div class="edit-div-line"/></div>
          <div
            v-for="item in ITEMS.slice(4)"
            :key="item.id"
            class="edit-row"
          >
            <v-icon size="16" :color="item.destructive ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.55)'">{{ item.icon }}</v-icon>
            <span class="edit-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-drag-vertical</v-icon>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  action: [id: string]
}>()

const editing    = ref(false)
const iconsOnly  = ref(localStorage.getItem('abs_player_icons_only')  === 'true')
const moreInGrid = ref(localStorage.getItem('abs_player_more_in_grid') === 'true')

watch(() => props.modelValue, (v) => { if (!v) editing.value = false })

function saveLayout() {
  localStorage.setItem('abs_player_icons_only', String(iconsOnly.value))
  localStorage.setItem('abs_player_more_in_grid', String(moreInGrid.value))
}

const ITEMS = [
  { id: 'details',  icon: 'mdi-information-outline',    label: 'Book Details',              destructive: false },
  { id: 'eq',       icon: 'mdi-equalizer',               label: 'Equalizer',                 destructive: false },
  { id: 'history',  icon: 'mdi-history',                 label: 'Playback History',          destructive: false },
  { id: 'remove',   icon: 'mdi-close-circle-outline',    label: 'Remove from Absconding',    destructive: true  },
  { id: 'car',      icon: 'mdi-car-outline',             label: 'Car Mode',                  destructive: false },
  { id: 'notes',    icon: 'mdi-note-text-outline',       label: 'Notes',                     destructive: false },
  { id: 'download', icon: 'mdi-download-outline',        label: 'Download',                  destructive: false },
]

function handleItem(id: string) {
  emit('update:modelValue', false)
  emit('action', id)
}
</script>

<style scoped>
.more-scrim {
  position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.5);
}
.scrim-enter-active, .scrim-leave-active { transition: opacity 0.2s; }
.scrim-enter-from, .scrim-leave-to { opacity: 0; }

.more-sheet {
  position: fixed; left: 0; right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  z-index: 200; background: #1e1e1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(212,160,23,0.2);
  padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 32px rgba(0,0,0,0.6);
  max-height: 70vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain;
}
.more-sheet::-webkit-scrollbar { display: none; }
@media (min-width: 768px) and (max-width: 1279px) { .more-sheet { left: 72px; bottom: 0; } }
@media (min-width: 1280px) { .more-sheet { left: 200px; bottom: 0; } }

.sheet-enter-active, .sheet-leave-active { transition: transform 0.25s cubic-bezier(0.32,0.72,0,1), opacity 0.2s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }

.more-drag-row {
  display: flex; align-items: center; justify-content: center;
  position: relative; margin-bottom: 12px;
}
.more-drag-handle {
  width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2);
}
.more-edit-btn {
  position: absolute; right: 0; top: -6px;
  background: none; border: none; cursor: pointer; padding: 6px;
}

/* Normal rows */
.more-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; margin-bottom: 6px; width: 100%; cursor: pointer;
  text-align: left;
}
.more-row:last-child { margin-bottom: 0; }
.more-row-icon { flex-shrink: 0; }
.more-row-label {
  flex: 1; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.8);
}
.more-row--destructive .more-row-label { color: rgba(255,80,80,0.8); }

/* Edit mode */
.edit-header { display: flex; align-items: center; margin-bottom: 10px; }
.edit-title { flex: 1; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); }
.edit-done-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  border-radius: 8px; padding: 4px 10px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: #d4a017;
}
.edit-chips { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.edit-chip {
  font-size: 11px; padding: 4px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5); cursor: pointer;
}
.edit-chip.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3);
  color: rgba(212,160,23,0.9);
}
.edit-hint {
  font-size: 10px; color: rgba(255,255,255,0.28); margin-bottom: 10px; line-height: 1.4;
}
.edit-section-label {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
  color: rgba(212,160,23,0.5); margin-bottom: 6px;
}
.edit-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px; margin-bottom: 3px;
}
.edit-row--on-card { background: rgba(212,160,23,0.07); }
.edit-row-label { flex: 1; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
.edit-divider {
  display: flex; align-items: center; gap: 8px; margin: 6px 0;
}
.edit-div-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
.edit-div-label {
  font-size: 9px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; color: rgba(255,255,255,0.28);
}
</style>

<template>
  <v-bottom-sheet v-model="show" :scrim="true" max-height="85vh">
    <v-card class="customize-sheet" rounded="t-xl">
      <div class="drag-handle" />
      <div class="sheet-header">
        <span class="sheet-title">Customize Home</span>
        <v-spacer />
        <v-btn variant="text" size="small" @click="reset">Reset</v-btn>
      </div>
      <v-divider />
      <p class="hint">Drag to reorder, tap eye to hide</p>
      <div class="sections-list">
        <div
          v-for="(section, i) in localOrder"
          :key="section.id"
          class="section-row"
          :class="{ dragging: dragIndex === i, over: overIndex === i }"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover.prevent="onDragOver(i)"
          @drop="onDrop(i)"
          @dragend="onDragEnd"
        >
          <AppIcon icon="mdi-drag-horizontal-variant" :size="20" class="drag-icon" color="rgba(255,255,255,0.25)" />
          <AppIcon :icon="section.icon" :size="18" color="rgba(255,255,255,0.4)" />
          <span class="section-name" :class="{ hidden: hiddenIds.has(section.id) }">{{ section.label }}</span>
          <button class="eye-btn" @click="toggleHidden(section.id)">
            <AppIcon :icon="hiddenIds.has(section.id) ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" :size="18" :color="hiddenIds.has(section.id) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)'" />
          </button>
        </div>
      </div>
      <div style="height:24px" />
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface HomeSection {
  id: string
  label: string
  icon: string
}

const props = defineProps<{ modelValue: boolean; sections: HomeSection[] }>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'change': [order: string[], hidden: string[]]
}>()

const show = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

const localOrder = ref<HomeSection[]>([])
const hiddenIds  = ref(new Set<string>())

watch(() => props.modelValue, v => {
  if (v) {
    const savedOrder: string[] = JSON.parse(localStorage.getItem('abs_home_section_order') ?? '[]')
    const savedHidden: string[] = JSON.parse(localStorage.getItem('abs_home_hidden_sections') ?? '[]')
    hiddenIds.value = new Set(savedHidden)
    if (savedOrder.length) {
      const ordered: HomeSection[] = []
      for (const id of savedOrder) {
        const s = props.sections.find(x => x.id === id)
        if (s) ordered.push(s)
      }
      for (const s of props.sections) {
        if (!savedOrder.includes(s.id)) ordered.push(s)
      }
      localOrder.value = ordered
    } else {
      localOrder.value = [...props.sections]
    }
  }
})

function toggleHidden(id: string) {
  if (hiddenIds.value.has(id)) hiddenIds.value.delete(id)
  else hiddenIds.value.add(id)
  _save()
}

function reset() {
  localOrder.value = [...props.sections]
  hiddenIds.value = new Set()
  localStorage.removeItem('abs_home_section_order')
  localStorage.removeItem('abs_home_hidden_sections')
  emit('change', props.sections.map(s => s.id), [])
}

function _save() {
  const order = localOrder.value.map(s => s.id)
  const hidden = [...hiddenIds.value]
  localStorage.setItem('abs_home_section_order', JSON.stringify(order))
  localStorage.setItem('abs_home_hidden_sections', JSON.stringify(hidden))
  emit('change', order, hidden)
}

// Drag to reorder
const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function onDragStart(i: number) { dragIndex.value = i }
function onDragOver(i: number) { overIndex.value = i }
function onDragEnd() { dragIndex.value = null; overIndex.value = null }
function onDrop(targetIdx: number) {
  if (dragIndex.value === null || dragIndex.value === targetIdx) return
  const arr = [...localOrder.value]
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(targetIdx, 0, moved)
  localOrder.value = arr
  dragIndex.value = null
  overIndex.value = null
  _save()
}
</script>

<style scoped>
.customize-sheet { background: #1a1a2e; }
.drag-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 10px auto 0; }
.sheet-header { display: flex; align-items: center; padding: 12px 16px 10px; }
.sheet-title { font-size: 15px; font-weight: 600; }
.hint { font-size: 11px; color: rgba(255,255,255,0.3); padding: 6px 16px 8px; }
.sections-list { padding: 0 8px; }
.section-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 8px; border-radius: 12px; cursor: grab;
  transition: background 0.15s;
}
.section-row:hover { background: rgba(255,255,255,0.04); }
.section-row.dragging { opacity: 0.5; }
.section-row.over { background: rgba(255,255,255,0.08); }
.drag-icon { cursor: grab; flex-shrink: 0; }
.section-name { flex: 1; font-size: 14px; font-weight: 500; }
.section-name.hidden { color: rgba(255,255,255,0.3); text-decoration: line-through; }
.eye-btn { padding: 4px; border: none; background: none; cursor: pointer; border-radius: 6px; }
.eye-btn:hover { background: rgba(255,255,255,0.06); }
</style>

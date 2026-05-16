<template>
  <div ref="root" class="app-select" :class="{ 'app-select--full': full }">
    <button type="button" class="app-select__trigger" @click="toggle">
      <span class="app-select__label" :class="{ 'app-select__label--placeholder': currentLabel === placeholder }">
        {{ currentLabel }}
      </span>
      <svg class="app-select__arrow" :class="{ 'app-select__arrow--open': isOpen }" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="app-select__overlay" @click="close" />
      <ul v-if="isOpen" class="app-select__menu" :style="menuStyle">
        <li
          v-for="opt in options"
          :key="String(opt.value)"
          class="app-select__item"
          :class="{ 'app-select__item--active': isActive(opt.value) }"
          @click="choose(opt.value)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

interface Option {
  value: unknown
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: unknown
  options: Option[]
  placeholder?: string
  full?: boolean
}>(), {
  placeholder: '',
  full: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: unknown): void
  (e: 'change', val: unknown): void
}>()

const root    = ref<HTMLElement | null>(null)
const isOpen  = ref(false)
const menuStyle = ref<Record<string, string>>({})

const currentLabel = computed(() => {
  const match = props.options.find(o => o.value === props.modelValue)
  return match ? match.label : (props.placeholder || '')
})

function isActive(val: unknown): boolean {
  return val === props.modelValue
}

function toggle() {
  if (isOpen.value) { close(); return }
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const menuHeight = Math.min(props.options.length * 40 + 8, 240)
  const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

  menuStyle.value = {
    position:   'fixed',
    left:       `${rect.left}px`,
    minWidth:   `${rect.width}px`,
    maxHeight:  '240px',
    zIndex:     '9999',
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top:    `${rect.bottom + 4}px` }),
  }
  isOpen.value = true
  nextTick(() => {
    const menu = document.querySelector('.app-select__menu') as HTMLElement | null
    if (menu) {
      const mr = menu.getBoundingClientRect()
      if (mr.right > window.innerWidth - 8) {
        menu.style.left  = 'auto'
        menu.style.right = '8px'
      }
    }
  })
}

function close() { isOpen.value = false }

function choose(val: unknown) {
  emit('update:modelValue', val)
  emit('change', val)
  close()
}
</script>

<style>
.app-select {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.app-select--full {
  width: 100%;
  display: flex;
}

.app-select__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  outline: none;
  white-space: nowrap;
  min-width: 0;
  width: 100%;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.app-select__trigger:hover {
  background: rgba(255,255,255,0.09);
  border-color: rgba(255,255,255,0.18);
}

.app-select__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-select__label--placeholder { color: rgba(255,255,255,0.35); }

.app-select__arrow {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: rgba(255,255,255,0.4);
  transition: transform 0.2s;
}
.app-select__arrow--open { transform: rotate(180deg); }

.app-select__overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.app-select__menu {
  background: #1c1c1e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 4px;
  margin: 0;
  list-style: none;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  overscroll-behavior: contain;
}

.app-select__item {
  padding: 9px 12px;
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}
.app-select__item:hover { background: rgba(255,255,255,0.07); }
.app-select__item--active {
  color: #d4a017;
  background: rgba(212,160,23,0.1);
  font-weight: 600;
}
</style>

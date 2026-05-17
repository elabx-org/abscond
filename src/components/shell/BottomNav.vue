<template>
  <nav class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.route"
      data-testid="nav-item"
      class="nav-item"
      :class="{ active: isActive(item.route) }"
      @click="navigate(item.route)"
    >
      <span class="nav-icon">
        <AppLogo
          v-if="item.route === 'player'"
          :size="44"
          :animated="isPlaying ? 'draw' : 'none'"
          :color="isActive('player') ? '#a78bfa' : 'rgba(255,255,255,0.4)'"
        />
        <AppIcon v-else :icon="isActive(item.route) ? item.iconActive : item.icon" :size="20" />
      </span>
      <span class="nav-label">{{ item.label }}</span>
      <span class="nav-dot" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{ isPlaying: boolean }>()
const emit  = defineEmits<{ navigate: [route: string] }>()

const route  = useRoute()
const router = useRouter()

const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',     iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',        iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',       iconActive: 'mdi-headphones' },
  { route: 'browse',   label: 'Browse',   icon: 'mdi-compass-outline',  iconActive: 'mdi-compass' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',      iconActive: 'mdi-cog' },
]

const isActive = (name: string) => route.name === name

function navigate(name: string) {
  emit('navigate', name)
  router.push({ name })
}
</script>

<style scoped>
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(14,14,14,0.82); backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: flex-start; justify-content: space-around;
  padding-top: 0;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: transparent; border: none; cursor: pointer;
  padding: 4px 8px; flex: 1; color: rgba(255,255,255,0.4);
  transition: color 0.15s; height: 56px; justify-content: center;
}
.nav-item.active { color: #d4a017; }
.nav-icon { display: flex; align-items: center; justify-content: center; height: 22px; }
.nav-label { font-size: 9px; font-weight: 500; line-height: 1; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: transparent; margin-top: 1px; }
.nav-item.active .nav-dot { background: #d4a017; }
</style>

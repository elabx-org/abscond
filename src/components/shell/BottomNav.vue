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
      <span class="nav-icon-wrap">
        <AppLogo
          v-if="item.route === 'player'"
          :size="24"
          :animated="isPlaying ? 'draw' : 'none'"
          :color="isActive('player') ? '#a78bfa' : 'rgba(255,255,255,0.45)'"
        />
        <AppIcon v-else :icon="isActive(item.route) ? item.iconActive : item.icon" :size="24" />
      </span>
      <span class="nav-label">{{ item.label }}</span>
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
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',       iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',          iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',         iconActive: 'mdi-headphones' },
  { route: 'stats',    label: 'Stats',    icon: 'mdi-chart-bar',          iconActive: 'mdi-chart-bar' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',        iconActive: 'mdi-cog' },
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
  height: calc(80px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: 12px;
  background: #0e0e0e;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: flex-start; justify-content: space-around;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: transparent; border: none; cursor: pointer;
  padding: 0 4px; flex: 1; color: rgba(255,255,255,0.45);
  transition: color 0.18s;
}
.nav-item.active { color: #a78bfa; }
/* Stadium pill indicator behind icon — matches Absorb's indicatorColor: primary×15% */
.nav-icon-wrap {
  width: 64px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16px;
  transition: background 0.18s;
}
.nav-item.active .nav-icon-wrap {
  background: rgba(134,59,255,0.18);
}
.nav-label { font-size: 11px; font-weight: 500; line-height: 1; }
</style>

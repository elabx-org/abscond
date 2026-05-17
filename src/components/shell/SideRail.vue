<template>
  <nav class="side-rail">
    <div class="rail-logo">
      <div class="logo-icon">◉</div>
    </div>
    <button v-for="item in navItems" :key="item.route" class="rail-item"
      :class="{ active: isActive(item.route) }" @click="router.push({ name: item.route })">
      <AppIcon :icon="isActive(item.route) ? item.iconActive : item.icon" :size="22" />
      <span class="rail-label">{{ item.label }}</span>
    </button>
    <div class="rail-spacer" />
    <button class="rail-item" :class="{ active: isActive('settings') }" @click="router.push({ name: 'settings' })">
      <AppIcon :icon="isActive('settings') ? 'mdi-cog' : 'mdi-cog-outline'" :size="22" />
      <span class="rail-label">Settings</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
const isActive = (name: string) => route.name === name
const navItems = [
  { route: 'home',        label: 'Home',        icon: 'mdi-home-outline',    iconActive: 'mdi-home' },
  { route: 'library',     label: 'Library',     icon: 'mdi-bookshelf',       iconActive: 'mdi-bookshelf' },
  { route: 'player',      label: 'Player',      icon: 'mdi-headphones',      iconActive: 'mdi-headphones' },
  { route: 'search',      label: 'Search',      icon: 'mdi-magnify',         iconActive: 'mdi-magnify' },
  { route: 'browse',      label: 'Browse',      icon: 'mdi-compass-outline', iconActive: 'mdi-compass' },
  { route: 'bookmarks',   label: 'Bookmarks',   icon: 'mdi-bookmark-outline',        iconActive: 'mdi-bookmark' },
  { route: 'upcoming',    label: 'Upcoming',    icon: 'mdi-calendar-clock-outline',  iconActive: 'mdi-calendar-clock' },
  { route: 'collections', label: 'Collections', icon: 'mdi-bookmark-multiple-outline', iconActive: 'mdi-bookmark-multiple' },
  { route: 'playlists',   label: 'Playlists',   icon: 'mdi-playlist-music',  iconActive: 'mdi-playlist-music' },
  { route: 'stats',       label: 'Stats',       icon: 'mdi-chart-bar',       iconActive: 'mdi-chart-bar' },
]
</script>

<style scoped>
.side-rail {
  width: 72px; height: 100vh; position: fixed; left: 0; top: 0; z-index: 100;
  background: rgba(14,14,14,0.9); border-right: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; align-items: center; padding: 8px 0; gap: 4px;
}
.rail-logo { padding: 12px 0 16px; }
.logo-icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg,#2a1500,#d4a017);
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.rail-item {
  width: 56px; padding: 8px 4px; border-radius: 12px; border: none; background: transparent;
  cursor: pointer; color: rgba(255,255,255,0.4); display: flex; flex-direction: column;
  align-items: center; gap: 3px; transition: all 0.15s;
}
.rail-item.active { background: rgba(212,160,23,0.12); color: #d4a017; }
.rail-label { font-size: 9px; font-weight: 500; }
.rail-spacer { flex: 1; }
</style>

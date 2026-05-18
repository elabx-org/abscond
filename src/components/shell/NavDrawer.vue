<template>
  <nav class="nav-drawer">
    <div class="drawer-brand">
      <AppLogo :size="18" color="rgba(134,59,255,0.6)" />
      <span class="drawer-brand-name">ABSCOND</span>
      <ConnectionStatus />
    </div>

    <div class="drawer-scroll">
      <p class="drawer-section-label">Discover</p>
      <button v-for="item in mainItems" :key="item.route" class="drawer-item"
        :class="{ active: isActive(item.route) }" @click="router.push({ name: item.route })">
        <AppIcon :icon="isActive(item.route) ? item.iconActive : item.icon" :size="20" class="drawer-icon" />
        <span>{{ item.label }}</span>
      </button>

      <p class="drawer-section-label">My Library</p>
      <button v-for="item in libraryItems" :key="item.route" class="drawer-item"
        :class="{ active: isActive(item.route) }" @click="router.push({ name: item.route })">
        <AppIcon :icon="isActive(item.route) ? item.iconActive : item.icon" :size="20" class="drawer-icon" />
        <span>{{ item.label }}</span>
      </button>

      <p class="drawer-section-label">Settings</p>
      <button v-for="item in bottomItems" :key="item.route" class="drawer-item"
        :class="{ active: isActive(item.route) }" @click="router.push({ name: item.route })">
        <AppIcon :icon="isActive(item.route) ? item.iconActive : item.icon" :size="20" class="drawer-icon" />
        <span>{{ item.label }}</span>
      </button>

      <template v-if="auth.user?.isAdminOrUp">
        <p class="drawer-section-label">Admin</p>
        <button class="drawer-item" :class="{ active: isActive('admin-libraries') }" @click="router.push({ name: 'admin-libraries' })">
          <AppIcon icon="mdi-server" :size="20" class="drawer-icon" />
          <span>Admin</span>
        </button>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const route = useRoute(); const router = useRouter()
const auth  = useAuthStore()
const isActive = (name: string) => route.name === name || (name === 'admin-libraries' && String(route.name).startsWith('admin'))

const mainItems = [
  { route: 'home',        label: 'Home',        icon: 'mdi-home-outline',    iconActive: 'mdi-home' },
  { route: 'library',     label: 'Library',     icon: 'mdi-bookshelf',       iconActive: 'mdi-bookshelf' },
  { route: 'search',      label: 'Search',      icon: 'mdi-magnify',         iconActive: 'mdi-magnify' },
  { route: 'browse',      label: 'Browse',      icon: 'mdi-compass-outline', iconActive: 'mdi-compass' },
  { route: 'player',      label: 'Now Playing', icon: 'mdi-headphones',      iconActive: 'mdi-headphones' },
]
const libraryItems = [
  { route: 'bookmarks',   label: 'Bookmarks',   icon: 'mdi-bookmark-outline',          iconActive: 'mdi-bookmark' },
  { route: 'upcoming',    label: 'Upcoming',    icon: 'mdi-calendar-clock-outline',    iconActive: 'mdi-calendar-clock' },
  { route: 'collections', label: 'Collections', icon: 'mdi-bookmark-multiple-outline', iconActive: 'mdi-bookmark-multiple' },
  { route: 'playlists',   label: 'Playlists',   icon: 'mdi-playlist-music',            iconActive: 'mdi-playlist-music' },
  { route: 'stats',       label: 'Stats',       icon: 'mdi-chart-bar',                 iconActive: 'mdi-chart-bar' },
]
const bottomItems = [
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline', iconActive: 'mdi-cog' },
]
</script>

<style scoped>
.nav-drawer {
  width: 200px; height: 100dvh; position: fixed; left: 0; top: 0; z-index: 100;
  background: rgba(11,11,11,0.95); border-right: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; padding: 0 8px;
}
.drawer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 8px;
}
.drawer-brand-name {
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0.4em;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  flex: 1;
  white-space: nowrap;
}
.drawer-scroll { flex: 1; overflow-y: auto; scrollbar-width: none; padding-bottom: 20px; }
.drawer-section-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 12px 4px; margin: 0; }
.drawer-item {
  display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px;
  border: none; background: transparent; cursor: pointer; width: 100%;
  font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.5);
  transition: all 0.15s; text-align: left;
}
.drawer-item.active { background: rgba(212,160,23,0.1); color: #d4a017; }
.drawer-icon { flex-shrink: 0; }
</style>

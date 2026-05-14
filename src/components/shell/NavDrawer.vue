<template>
  <nav class="nav-drawer">
    <div class="drawer-logo">
      <div class="logo-icon">◉</div>
      <span class="logo-name">abs<span class="accent">cond</span></span>
    </div>

    <div class="drawer-items">
      <button
        v-for="item in navItems" :key="item.route"
        class="drawer-item"
        :class="{ active: isActive(item.route) }"
        @click="router.push({ name: item.route })"
      >
        <v-icon size="20" class="drawer-icon">{{ isActive(item.route) ? item.iconActive : item.icon }}</v-icon>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
const isActive = (name: string) => route.name === name
const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',  iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',     iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',    iconActive: 'mdi-headphones' },
  { route: 'search',   label: 'Search',   icon: 'mdi-magnify',       iconActive: 'mdi-magnify' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',   iconActive: 'mdi-cog' },
]
</script>

<style scoped>
.nav-drawer {
  width: 200px; height: 100vh; position: fixed; left: 0; top: 0; z-index: 100;
  background: rgba(11,11,11,0.95); border-right: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; padding: 0 8px;
}
.drawer-logo { display: flex; align-items: center; gap: 10px; padding: 20px 8px 16px; }
.logo-icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(135deg,#2a1500,#d4a017);
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.logo-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.3px; }
.accent { color: #d4a017; }
.drawer-items { display: flex; flex-direction: column; gap: 2px; }
.drawer-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
  border: none; background: transparent; cursor: pointer;
  font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.5);
  transition: all 0.15s; text-align: left;
}
.drawer-item.active { background: rgba(212,160,23,0.1); color: #d4a017; }
.drawer-icon { flex-shrink: 0; }
</style>

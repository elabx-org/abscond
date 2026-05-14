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
        <template v-if="item.route === 'player' && isPlaying">
          <span class="wave-wrap">
            <span v-for="n in 5" :key="n" class="wave-bar" :style="`animation-delay:${(n-1)*0.1}s`" />
          </span>
        </template>
        <v-icon v-else size="20">{{ isActive(item.route) ? item.iconActive : item.icon }}</v-icon>
      </span>
      <span class="nav-label">{{ item.label }}</span>
      <span class="nav-dot" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{ isPlaying: boolean }>()
const emit  = defineEmits<{ navigate: [route: string] }>()

const route  = useRoute()
const router = useRouter()

const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',  iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',     iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',    iconActive: 'mdi-headphones' },
  { route: 'search',   label: 'Search',   icon: 'mdi-magnify',       iconActive: 'mdi-magnify' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',   iconActive: 'mdi-cog' },
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
  height: 56px; padding-bottom: env(safe-area-inset-bottom);
  background: rgba(14,14,14,0.82); backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: space-around;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: transparent; border: none; cursor: pointer;
  padding: 4px 8px; flex: 1; color: rgba(255,255,255,0.4);
  transition: color 0.15s;
}
.nav-item.active { color: #d4a017; }
.nav-icon { display: flex; align-items: center; justify-content: center; height: 22px; }
.nav-label { font-size: 9px; font-weight: 500; line-height: 1; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: transparent; margin-top: 1px; }
.nav-item.active .nav-dot { background: #d4a017; }
.wave-wrap { display: flex; align-items: flex-end; gap: 1.5px; height: 16px; }
.wave-bar {
  width: 2px; background: #d4a017; border-radius: 1px;
  animation: wave 0.8s ease-in-out infinite alternate;
}
.wave-bar:nth-child(1) { height: 6px; }
.wave-bar:nth-child(2) { height: 12px; }
.wave-bar:nth-child(3) { height: 16px; }
.wave-bar:nth-child(4) { height: 10px; }
.wave-bar:nth-child(5) { height: 7px; }
@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
</style>

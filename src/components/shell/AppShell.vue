<template>
  <div class="app-shell" :class="shellClass">
    <!-- Offline / reconnecting banner -->
    <Transition name="banner">
      <div v-if="showOfflineBanner" class="offline-banner">
        <v-icon size="14" color="rgba(255,255,255,0.6)">mdi-wifi-off</v-icon>
        <span>Reconnecting to server…</span>
      </div>
    </Transition>

    <!-- Mobile bottom nav -->
    <BottomNav v-if="isMobile" :is-playing="player.isPlaying" />

    <!-- Mini player (mobile) -->
    <MiniPlayer v-if="isMobile" />

    <!-- Tablet side rail -->
    <SideRail v-else-if="isTablet" />

    <!-- Desktop drawer -->
    <NavDrawer v-else />

    <!-- Page content -->
    <main class="shell-content" :style="contentStyle">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import BottomNav  from './BottomNav.vue'
import SideRail   from './SideRail.vue'
import NavDrawer  from './NavDrawer.vue'
import MiniPlayer from './MiniPlayer.vue'
import { usePlayerStore } from '@/stores/player'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'

const player = usePlayerStore()
const socket = useSocketStore()
const auth   = useAuthStore()

const showOfflineBanner = ref(false)
let offlineTimer: ReturnType<typeof setTimeout> | null = null

watch(() => socket.connected, (isConnected) => {
  if (isConnected) {
    showOfflineBanner.value = false
    if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null }
  } else if (auth.isLoggedIn) {
    offlineTimer = setTimeout(() => { showOfflineBanner.value = true }, 3000)
  }
})

const width = ref(window.innerWidth)
const onResize = () => { width.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const isMobile  = computed(() => width.value < 768)
const isTablet  = computed(() => width.value >= 768 && width.value < 1280)
const isDesktop = computed(() => width.value >= 1280)

const shellClass = computed(() => ({
  'shell--mobile':  isMobile.value,
  'shell--tablet':  isTablet.value,
  'shell--desktop': isDesktop.value,
}))

const contentStyle = computed(() => {
  if (isMobile.value) {
    const base = player.currentItem ? '116px' : '56px'
    return { paddingBottom: `calc(${base} + env(safe-area-inset-bottom))` }
  }
  if (isTablet.value)  return { paddingLeft: '72px' }
  return { paddingLeft: '200px' }
})
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #0e0e0e; }
.shell-content { min-height: 100vh; }

.offline-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 6px 16px; background: rgba(30,30,30,0.95);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 11px; color: rgba(255,255,255,0.55);
}
.banner-enter-active, .banner-leave-active { transition: transform 0.2s ease, opacity 0.2s; }
.banner-enter-from, .banner-leave-to { transform: translateY(-100%); opacity: 0; }
</style>

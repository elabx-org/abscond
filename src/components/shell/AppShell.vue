<template>
  <div class="app-shell" :class="shellClass">
    <!-- Offline / reconnecting banner -->
    <Transition name="banner">
      <div v-if="showOfflineBanner" class="offline-banner">
        <AppIcon icon="mdi-wifi-off" :size="14" color="rgba(255,255,255,0.6)" />
        <span>Reconnecting to server…</span>
      </div>
    </Transition>

    <!-- Mobile top header (brand row) -->
    <header v-if="isMobile" class="mobile-header">
      <AppLogo :size="18" color="rgba(134,59,255,0.65)" />
      <span class="mobile-brand-name">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</span>
      <ConnectionStatus />
    </header>

    <!-- Mobile bottom nav -->
    <BottomNav v-if="isMobile" :is-playing="player.isPlaying" />

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
import AppIcon from '@/components/common/AppIcon.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import BottomNav  from './BottomNav.vue'
import SideRail   from './SideRail.vue'
import NavDrawer  from './NavDrawer.vue'
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

function _isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
}

function onKeyDown(e: KeyboardEvent) {
  if (!player.currentItem) return
  if (_isInputFocused()) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === ' ') { e.preventDefault(); player.togglePlay() }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); player.skipBack(10) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); player.skipForward(10) }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
})

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
    return {
      paddingTop: 'calc(40px + env(safe-area-inset-top))',
      paddingBottom: `calc(56px + env(safe-area-inset-bottom))`,
    }
  }
  if (isTablet.value)  return { paddingLeft: '72px' }
  return { paddingLeft: '200px' }
})
</script>

<style scoped>
.app-shell { min-height: 100dvh; background: #0e0e0e; }
.shell-content { min-height: 100dvh; }

.mobile-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: calc(40px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; gap: 7px;
  padding-left: 14px; padding-right: 14px;
  background: rgba(14,14,14,0.85); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.mobile-brand-name {
  font-size: 9px; font-weight: 300; letter-spacing: 5px;
  color: rgba(255,255,255,0.25); text-transform: uppercase;
  flex: 1;
}

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

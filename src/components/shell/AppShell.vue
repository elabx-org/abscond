<template>
  <div class="app-shell" :class="shellClass">
    <!-- Offline / reconnecting banner -->
    <Transition name="banner">
      <div v-if="showOfflineBanner" class="offline-banner">
        <AppIcon icon="mdi-wifi-off" :size="14" color="rgba(255,255,255,0.6)" />
        <span>Reconnecting to server…</span>
      </div>
    </Transition>

    <!-- Mobile bottom nav -->
    <BottomNav v-if="isMobile" :is-playing="player.isPlaying" />

    <!-- Tablet side rail -->
    <SideRail v-else-if="isTablet" />

    <!-- Desktop drawer -->
    <NavDrawer v-else />

    <!-- Page content -->
    <main class="shell-content" :style="contentStyle">
      <router-view v-slot="{ Component }">
        <Transition name="tab-fade" mode="out-in">
          <component :is="Component" :key="$route.name" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav  from './BottomNav.vue'
import SideRail   from './SideRail.vue'
import NavDrawer  from './NavDrawer.vue'
import { usePlayerStore } from '@/stores/player'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'

const player = usePlayerStore()
const socket = useSocketStore()
const auth   = useAuthStore()
const route  = useRoute()

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
    const isPlayer = route.name === 'player'
    return {
      paddingTop: isPlayer ? '0px' : 'env(safe-area-inset-top)',
      paddingBottom: `calc(80px + env(safe-area-inset-bottom))`,
    }
  }
  if (isTablet.value)  return { paddingLeft: '72px' }
  return { paddingLeft: '200px' }
})
</script>

<style scoped>
.app-shell { min-height: 100dvh; background: linear-gradient(180deg, #2e1055 0%, #180830 15%, #0e0e0e 28%); }
.shell-content { min-height: 100dvh; }
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity 0.18s ease; }
.tab-fade-enter-from, .tab-fade-leave-to { opacity: 0; }

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

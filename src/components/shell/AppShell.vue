<template>
  <div class="app-shell" :class="shellClass">
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import BottomNav  from './BottomNav.vue'
import SideRail   from './SideRail.vue'
import NavDrawer  from './NavDrawer.vue'
import MiniPlayer from './MiniPlayer.vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()

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
    const pb = player.currentItem ? '116px' : '56px'
    return { paddingBottom: pb }
  }
  if (isTablet.value)  return { paddingLeft: '72px' }
  return { paddingLeft: '200px' }
})
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #0e0e0e; }
.shell-content { min-height: 100vh; }
</style>

<template>
  <div class="page-header">
    <div class="page-header-brand-row">
      <AppLogo :size="14" color="rgba(134,59,255,0.6)" />
      <p class="page-header-brand">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</p>
      <AppIcon
        :icon="socket.connected ? 'mdi-cloud-check-outline' : 'mdi-cloud-off-outline'"
        :size="13"
        :color="socket.connected ? 'rgba(74,222,128,0.75)' : 'rgba(255,255,255,0.18)'"
      />
    </div>
    <div class="page-header-row">
      <h1 class="page-header-title">{{ title }}</h1>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { useSocketStore } from '@/stores/socket'
defineProps<{ title: string }>()
const socket = useSocketStore()
</script>

<style scoped>
.page-header {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 50;
  padding: 8px 16px 10px;
  background: rgba(32, 32, 24, 0.96);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.page-header-brand-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
}
@media (min-width: 768px) {
  .page-header-brand-row { display: none; }
}
.page-header-brand {
  font-size: 8px; font-weight: 300; letter-spacing: 5px;
  color: rgba(255,255,255,0.25); text-transform: uppercase; margin: 0;
}
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-header-title {
  font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.95);
  letter-spacing: -0.5px; margin: 0; line-height: 1.1;
}
</style>

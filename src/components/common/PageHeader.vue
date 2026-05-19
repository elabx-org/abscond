<template>
  <div class="page-header">
    <div class="page-header-brand-row">
      <AppLogo :size="18" color="rgba(134,59,255,0.6)" />
      <p class="page-header-brand">ABSCOND</p>
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
  padding: 12px 20px 0;
}
.page-header-brand-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
}
@media (min-width: 768px) {
  .page-header-brand-row { display: none; }
}
.page-header-brand {
  font-size: 11px; font-weight: 300; letter-spacing: 4px;
  color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 0;
}
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-header-title {
  font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.95);
  letter-spacing: -0.5px; margin: 0; line-height: 1.1;
}
</style>

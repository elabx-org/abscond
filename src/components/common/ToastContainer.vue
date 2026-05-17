<template>
  <teleport to="body">
    <div class="toast-stack">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="`toast-${t.type}`"
        >
          <AppIcon :icon="t.type === 'error' ? 'mdi-alert-circle' : t.type === 'info' ? 'mdi-information' : 'mdi-check-circle'" :size="14" class="toast-icon" />
          {{ t.message }}
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { toasts } from '@/composables/useToast'
</script>

<style scoped>
.toast-stack { position:fixed; bottom:72px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:8px; align-items:center; }
.toast-item {
  display:flex; align-items:center; gap:8px; padding:9px 16px;
  background:#1e1e1e; border:1px solid rgba(255,255,255,0.1);
  border-radius:20px; font-size:0.82rem; color:rgba(255,255,255,0.85);
  box-shadow:0 4px 20px rgba(0,0,0,0.5); white-space:nowrap;
}
.toast-success { border-left:3px solid #34d399; }
.toast-error   { border-left:3px solid #ef4444; }
.toast-info    { border-left:3px solid #5ba4f5; }
.toast-icon    { flex-shrink:0; }
.toast-enter-active, .toast-leave-active { transition:all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity:0; transform:translateY(12px); }
</style>

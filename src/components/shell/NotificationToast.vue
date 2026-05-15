<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="n in notifications.items"
          :key="n.id"
          class="toast"
          :class="`toast--${n.type}`"
          @click="notifications.dismiss(n.id)"
        >
          <v-icon size="16" class="toast-icon">{{ iconFor(n.type) }}</v-icon>
          <span class="toast-msg">{{ n.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'

const notifications = useNotificationStore()

function iconFor(type: string) {
  if (type === 'success') return 'mdi-check-circle'
  if (type === 'error')   return 'mdi-alert-circle'
  return 'mdi-information'
}
</script>

<style scoped>
.toast-container {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;
  max-width: calc(100vw - 32px);
}
.toast {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 12px; pointer-events: all; cursor: pointer;
  backdrop-filter: blur(12px); font-size: 13px; font-weight: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  min-width: 200px; max-width: 320px;
}
.toast--info    { background: rgba(30,30,30,0.95); color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.1); }
.toast--success { background: rgba(34,120,34,0.9);  color: #fff; }
.toast--error   { background: rgba(180,40,40,0.9);  color: #fff; }
.toast-icon { flex-shrink: 0; }
.toast-msg { flex: 1; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s; }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to   { opacity: 0; transform: translateY(-12px); }
</style>

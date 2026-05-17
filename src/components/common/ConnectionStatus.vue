<template>
  <button
    class="conn-btn"
    @click="handleTap"
    :title="connected ? 'Connected' : 'Offline — tap to reconnect'"
  >
    <!-- Spinner while reconnecting -->
    <svg v-if="reconnecting" class="conn-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <!-- Connected: green cloud with checkmark -->
    <svg v-else-if="connected" width="16" height="14" viewBox="0 -1 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 9H3.5A3 3 0 0 1 3.5 3a3 3 0 0 1 5.6-1.5A2.5 2.5 0 0 1 12.5 6a2.5 2.5 0 0 1 0 3z" fill="#22c55e" opacity="0.9"/>
      <path d="M5.5 6.5 L7 8 L10.5 5" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <!-- Disconnected: orange cloud with X -->
    <svg v-else width="16" height="14" viewBox="0 -1 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 9H3.5A3 3 0 0 1 3.5 3a3 3 0 0 1 5.6-1.5A2.5 2.5 0 0 1 12.5 6a2.5 2.5 0 0 1 0 3z" fill="#f97316" opacity="0.9"/>
      <path d="M6.5 5.5 L9.5 8.5 M9.5 5.5 L6.5 8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'

const sock = useSocketStore()
const auth = useAuthStore()
const reconnecting = ref(false)
const connected = computed(() => sock.connected)

async function handleTap() {
  if (connected.value) return
  reconnecting.value = true
  if ('vibrate' in navigator) navigator.vibrate(30)
  sock.disconnect()
  const token = auth.token
  if (token) await sock.connect(token as string)
  reconnecting.value = false
}
</script>

<style scoped>
.conn-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  line-height: 0;
}
@keyframes conn-spin {
  to { transform: rotate(360deg); }
}
.conn-spin {
  animation: conn-spin 0.8s linear infinite;
}
</style>

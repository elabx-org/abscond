<template>
  <button class="conn-btn" @click="handleTap" :title="connected ? 'Connected' : 'Offline — tap to reconnect'">
    <AppIcon v-if="reconnecting" icon="mdi-loading" :size="16" color="rgba(245,158,11,0.9)" class="conn-spin" />
    <AppIcon v-else-if="connected"    icon="mdi-cloud-check" :size="18" color="rgba(34,197,94,0.9)" />
    <AppIcon v-else                   icon="mdi-cloud-off"   :size="18" color="rgba(249,115,22,0.9)" />
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
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
  background: none; border: none; padding: 0; cursor: pointer;
  display: flex; align-items: center; line-height: 0;
}
@keyframes conn-spin { to { transform: rotate(360deg); } }
.conn-spin { animation: conn-spin 0.8s linear infinite; }
</style>

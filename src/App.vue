<template>
  <v-app>
    <router-view />
    <ToastContainer />
    <NotificationToast />
  </v-app>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import NotificationToast from '@/components/shell/NotificationToast.vue'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { usePlayerStore } from '@/stores/player'

const auth   = useAuthStore()
const socket = useSocketStore()
const player = usePlayerStore()

function syncSocket() {
  if (auth.isLoggedIn && auth.token) socket.connect(auth.token)
  else socket.disconnect()
}

function syncPlayer() {
  if (auth.isLoggedIn) player.hydrateRecentItems()
}

onMounted(() => { syncSocket(); syncPlayer() })
watch(() => auth.isLoggedIn, () => { syncSocket(); syncPlayer() })
</script>

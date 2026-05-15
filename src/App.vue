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
import { api } from '@/api/client'

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

async function refreshUser() {
  if (!auth.isLoggedIn || !auth.token) return
  try {
    const res = await api.get('/me')
    const u = res.data
    if (u?.id && auth.token) {
      auth.setSession(auth.token, {
        id:          u.id,
        username:    u.username,
        isAdminOrUp: u.isAdminOrUp ?? false,
        token:       auth.token,
      })
    }
  } catch { /* ignore — stale session will be fixed on next login */ }
}

onMounted(() => { syncSocket(); syncPlayer(); refreshUser() })
watch(() => auth.isLoggedIn, () => { syncSocket(); syncPlayer() })
</script>

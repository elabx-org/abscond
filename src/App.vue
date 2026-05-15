<template>
  <v-app>
    <router-view />
    <ToastContainer />
  </v-app>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'

const auth   = useAuthStore()
const socket = useSocketStore()

function syncSocket() {
  if (auth.isLoggedIn && auth.token) socket.connect(auth.token)
  else socket.disconnect()
}

onMounted(syncSocket)
watch(() => auth.isLoggedIn, syncSocket)
</script>

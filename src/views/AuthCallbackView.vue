<template>
  <div class="callback-root">
    <v-progress-circular v-if="!error" indeterminate color="primary" size="48" />
    <div v-else class="callback-error">
      <p>{{ error }}</p>
      <v-btn color="primary" @click="router.push({ name: 'login' })">Back to login</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { connectSocket } from '@/api/socket'
import { getBaseUrl } from '@/api/client'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const error  = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    error.value = 'No token received from SSO provider.'
    return
  }

  try {
    // Decode ABS JWT payload — ABS signs it server-side, we just need the claims.
    const payload = JSON.parse(atob(token.split('.')[1]))
    const user = {
      id:           payload.userId ?? payload.sub ?? '',
      username:     payload.username ?? payload.name ?? '',
      isAdminOrUp:  !!payload.isAdminOrUp,
      token,
    }
    auth.setSession(token, user)

    const base = await getBaseUrl()
    const host = base === '/api' ? '' : base.replace(/\/api$/, '')
    connectSocket(host, token)

    router.push({ name: 'home' })
  } catch {
    error.value = 'SSO login failed. Please try again.'
  }
})
</script>

<style scoped>
.callback-root {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; background: #060606;
}
.callback-error {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  color: rgba(255,255,255,0.7); font-size: 0.9rem;
}
</style>

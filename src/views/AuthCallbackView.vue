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
import { useAuthStore, type AbsUser } from '@/stores/auth'
import { connectSocket } from '@/api/socket'
import { getBaseUrl } from '@/api/client'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const error  = ref('')

function userFromJwt(token: string): AbsUser {
  const payload = JSON.parse(atob(token.split('.')[1]))
  return {
    id:          payload.userId ?? payload.sub ?? '',
    username:    payload.username ?? payload.name ?? '',
    isAdminOrUp: !!payload.isAdminOrUp,
    token,
  }
}

onMounted(async () => {
  const code  = route.query.code  as string | undefined
  const state = route.query.state as string | undefined
  const token = route.query.token as string | undefined

  try {
    if (code && state) {
      // PKCE mobile flow — exchange code for token via ABS /auth/openid/callback
      const verifier   = sessionStorage.getItem('oidc_verifier') ?? ''
      const savedState = sessionStorage.getItem('oidc_state')    ?? ''
      sessionStorage.removeItem('oidc_verifier')
      sessionStorage.removeItem('oidc_state')

      if (state !== savedState) throw new Error('State mismatch — possible CSRF.')

      const params = new URLSearchParams({ state, code, code_verifier: verifier })
      const res = await fetch(`/auth/openid/callback?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Token exchange failed (${res.status})`)
      const data = await res.json()

      const accessToken: string = data?.user?.token ?? data?.user?.accessToken
      if (!accessToken) throw new Error('No token in server response.')

      const user: AbsUser = {
        id:          data.user.id          ?? '',
        username:    data.user.username    ?? '',
        isAdminOrUp: data.user.isAdminOrUp ?? false,
        token:       accessToken,
      }
      auth.setSession(accessToken, user)
    } else if (token) {
      // Legacy web flow — ABS returned token directly
      auth.setSession(token, userFromJwt(token))
    } else {
      throw new Error('No token received from SSO provider.')
    }

    const base = await getBaseUrl()
    const host = base === '/api' ? '' : base.replace(/\/api$/, '')
    connectSocket(host, auth.token ?? '')

    router.push({ name: 'home' })
  } catch (e: any) {
    error.value = e?.message ?? 'SSO login failed. Please try again.'
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

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface AbsUser {
  id: string
  username: string
  isAdminOrUp: boolean
  token?: string
}

const STORAGE_KEY = 'abscond_auth'

function loadFromStorage(): { token: string | null; user: AbsUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = loadFromStorage()
  const token = ref<string | null>(stored.token)
  const user = ref<AbsUser | null>(stored.user)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdminOrUp ?? false)

  function setSession(newToken: string, newUser: AbsUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, user, isLoggedIn, isAdmin, setSession, logout }
})

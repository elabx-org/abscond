import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const isLoggedIn = computed(() => !!token.value)
  return { token, isLoggedIn }
})

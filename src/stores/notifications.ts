import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
  duration?: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])

  function show(message: string, type: Notification['type'] = 'info', duration = 3000) {
    const id = `${Date.now()}-${Math.random()}`
    items.value.push({ id, message, type, duration })
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }

  function dismiss(id: string) {
    items.value = items.value.filter(n => n.id !== id)
  }

  return { items, show, dismiss }
})

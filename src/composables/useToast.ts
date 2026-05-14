import { ref } from 'vue'

export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

export const toasts = ref<Toast[]>([])
let nextId = 0

export function clearToasts() { toasts.value = [] }

export function useToast() {
  function toast(message: string, opts: { duration?: number; type?: Toast['type'] } = {}) {
    const id = ++nextId
    const type = opts.type ?? 'success'
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, opts.duration ?? 3000)
  }

  return {
    toast,
    toastError: (msg: string) => toast(msg, { type: 'error' }),
    toastInfo:  (msg: string) => toast(msg, { type: 'info' }),
  }
}

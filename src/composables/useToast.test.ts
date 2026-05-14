import { describe, it, expect, vi } from 'vitest'
import { useToast, clearToasts, toasts } from './useToast'

describe('useToast', () => {
  it('adds a toast to the global list', () => {
    clearToasts()
    const { toast } = useToast()
    toast('File uploaded')
    expect(toasts.value.length).toBe(1)
    expect(toasts.value[0].message).toBe('File uploaded')
  })

  it('auto-removes toast after duration', async () => {
    clearToasts()
    vi.useFakeTimers()
    try {
      const { toast } = useToast()
      toast('msg', { duration: 1000 })
      expect(toasts.value.length).toBe(1)
      vi.advanceTimersByTime(1200)
      expect(toasts.value.length).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('toastError sets type to error', () => {
    clearToasts()
    const { toastError } = useToast()
    toastError('Something went wrong')
    expect(toasts.value[0].type).toBe('error')
  })
})

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useScrollHide } from './useScrollHide'

describe('useScrollHide', () => {
  it('starts visible', () => {
    const el = ref<HTMLElement | null>(null)
    const { visible } = useScrollHide(el)
    expect(visible.value).toBe(true)
  })
})

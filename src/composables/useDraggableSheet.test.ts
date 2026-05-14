import { describe, it, expect } from 'vitest'
import { useDraggableSheet } from './useDraggableSheet'

describe('useDraggableSheet', () => {
  it('initialises at the given snap point', () => {
    const { heightPct } = useDraggableSheet({ initial: 85, min: 40, max: 95 })
    expect(heightPct.value).toBe(85)
  })
})

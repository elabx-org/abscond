import { describe, it, expect } from 'vitest'
import * as icons from './icons'

describe('icons', () => {
  it('exports mdiClose as a non-empty string', () => {
    expect(typeof icons.mdiClose).toBe('string')
    expect(icons.mdiClose.length).toBeGreaterThan(0)
  })

  it('exports mdiLoading as a non-empty string', () => {
    expect(typeof icons.mdiLoading).toBe('string')
    expect(icons.mdiLoading.length).toBeGreaterThan(0)
  })

  it('exports exactly 202 icons', () => {
    const keys = Object.keys(icons).filter(k => k.startsWith('mdi'))
    expect(keys.length).toBe(202)
  })
})

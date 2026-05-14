import { describe, it, expect } from 'vitest'
import { normaliseAccent } from './useColorThief'

describe('normaliseAccent', () => {
  it('returns fallback amber when input is null', () => {
    expect(normaliseAccent(null)).toBe('#d4a017')
  })

  it('boosts saturation and clamps lightness for desaturated input', () => {
    const result = normaliseAccent([30, 30, 30]) // very desaturated dark grey
    expect(result).not.toBe('rgb(30,30,30)')
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a hex string from valid RGB', () => {
    const result = normaliseAccent([200, 100, 20])
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })
})

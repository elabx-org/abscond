import { describe, it, expect } from 'vitest'
import { abscondTheme } from './vuetify'

describe('abscondTheme', () => {
  it('has dark mode enabled', () => {
    expect(abscondTheme.dark).toBe(true)
  })

  it('uses #0e0e0e as background', () => {
    expect(abscondTheme.colors.background).toBe('#0e0e0e')
  })

  it('uses amber #d4a017 as primary accent', () => {
    expect(abscondTheme.colors.primary).toBe('#d4a017')
  })
})

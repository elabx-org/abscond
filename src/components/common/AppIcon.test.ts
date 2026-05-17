import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from './AppIcon.vue'

describe('AppIcon', () => {
  it('renders an svg element', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    expect(w.find('svg').exists()).toBe(true)
  })

  it('uses default size 24', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
  })

  it('respects numeric size prop', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', size: 16 } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('16')
    expect(svg.attributes('height')).toBe('16')
  })

  it('respects string size prop', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', size: '20' } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('height')).toBe('20')
  })

  it('renders a path with non-empty d attribute for known icon', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    const path = w.find('path')
    expect(path.exists()).toBe(true)
    expect(path.attributes('d')?.length).toBeGreaterThan(0)
  })

  it('renders empty path for unknown icon without crashing', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-does-not-exist' } })
    const path = w.find('path')
    expect(path.exists()).toBe(true)
    expect(path.attributes('d')).toBe('')
  })

  it('applies color style when color is not currentColor', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', color: '#ff0000' } })
    expect(w.find('svg').attributes('style')).toContain('color:')
  })

  it('does not add style when color is currentColor', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', color: 'currentColor' } })
    const style = w.find('svg').attributes('style')
    expect(style ?? '').not.toContain('color:')
  })

  it('always has app-icon class on svg', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-loading' } })
    expect(w.find('svg').classes()).toContain('app-icon')
  })
})

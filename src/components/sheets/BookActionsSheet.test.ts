import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookActionsSheet from './BookActionsSheet.vue'

const baseProps = {
  modelValue: true,
  progress: 0,
  isAdmin: false,
  goodreadsEnabled: false,
}

const stubs = { global: { stubs: { Teleport: true } } }

describe('BookActionsSheet — visibility', () => {
  it('renders when open', () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    expect(w.find('.book-actions-sheet').exists()).toBe(true)
  })

  it('does not render when closed', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, modelValue: false }, ...stubs })
    expect(w.find('.book-actions-sheet').exists()).toBe(false)
  })
})

describe('BookActionsSheet — standard items', () => {
  it('renders all 6 always-visible items', () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    const ids = w.findAll('[data-action]').map(el => el.attributes('data-action'))
    expect(ids).toContain('notes')
    expect(ids).toContain('playlist')
    expect(ids).toContain('collection')
    expect(ids).toContain('share')
    expect(ids).toContain('play-next')
    expect(ids).toContain('queue')
  })

  it('does not show reset when progress is 0', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, progress: 0 }, ...stubs })
    expect(w.find('[data-action="reset"]').exists()).toBe(false)
  })

  it('shows reset when progress > 0', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, progress: 0.5 }, ...stubs })
    expect(w.find('[data-action="reset"]').exists()).toBe(true)
  })

  it('does not show goodreads when goodreadsEnabled is false', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, goodreadsEnabled: false }, ...stubs })
    expect(w.find('[data-action="goodreads"]').exists()).toBe(false)
  })

  it('shows goodreads when goodreadsEnabled is true', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, goodreadsEnabled: true }, ...stubs })
    expect(w.find('[data-action="goodreads"]').exists()).toBe(true)
  })
})

describe('BookActionsSheet — admin items', () => {
  it('does not show admin items when isAdmin is false', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: false }, ...stubs })
    expect(w.find('[data-action="match"]').exists()).toBe(false)
    expect(w.find('[data-action="edit"]').exists()).toBe(false)
    expect(w.find('[data-action="scan"]').exists()).toBe(false)
    expect(w.find('[data-action="delete"]').exists()).toBe(false)
  })

  it('shows all 4 admin items when isAdmin is true', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: true }, ...stubs })
    expect(w.find('[data-action="match"]').exists()).toBe(true)
    expect(w.find('[data-action="edit"]').exists()).toBe(true)
    expect(w.find('[data-action="scan"]').exists()).toBe(true)
    expect(w.find('[data-action="delete"]').exists()).toBe(true)
  })
})

describe('BookActionsSheet — actions', () => {
  it('emits action and closes when an item is clicked', async () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    await w.find('[data-action="notes"]').trigger('click')
    expect(w.emitted('action')).toBeTruthy()
    expect(w.emitted('action')![0]).toEqual(['notes'])
    expect(w.emitted('update:modelValue')).toBeTruthy()
    expect(w.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('emits delete action', async () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: true }, ...stubs })
    await w.find('[data-action="delete"]').trigger('click')
    expect(w.emitted('action')![0]).toEqual(['delete'])
  })

  it('emits update:modelValue false when backdrop clicked', async () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    await w.find('.book-actions-overlay').trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
    expect(w.emitted('update:modelValue')![0]).toEqual([false])
  })
})

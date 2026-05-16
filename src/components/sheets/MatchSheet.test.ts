import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MatchSheet from './MatchSheet.vue'
import type { LibraryItem } from '@/api/types'

vi.mock('@/api/match', () => ({
  searchCandidates: vi.fn(),
  applyMatch: vi.fn(),
}))
vi.mock('@/api/items', () => ({
  getItem: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  coverUrl: vi.fn((id: string) => `/api/items/${id}/cover?token=tok`),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ token: 'tok' }),
}))

import { searchCandidates, applyMatch } from '@/api/match'
import { getItem } from '@/api/items'

const mockItem: LibraryItem = {
  id: 'li1',
  libraryId: 'lib1',
  mediaType: 'book',
  media: {
    metadata: {
      title: 'Dune',
      subtitle: null,
      authorName: 'Frank Herbert',
      narratorName: null,
      publisher: null,
      publishedYear: null,
      description: null,
      genres: [],
    },
  },
  addedAt: 0,
  updatedAt: 0,
}

describe('MatchSheet — search step', () => {
  it('renders when open', () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.match-sheet').exists()).toBe(true)
  })

  it('does not render when closed', () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: false, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.match-sheet').exists()).toBe(false)
  })

  it('pre-fills title and author from item', () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('Dune')
    expect(inputs[1].element.value).toBe('Frank Herbert')
  })

  it('shows provider chips including Audible', () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.text()).toContain('Audible')
  })

  it('calls searchCandidates with title, author, provider on search', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce([])
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.match-search-btn').trigger('click')
    expect(searchCandidates).toHaveBeenCalledWith('Dune', 'Frank Herbert', 'audible')
  })
})

describe('MatchSheet — providers', () => {
  it('renders all 6 provider chips', () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    const chips = wrapper.findAll('.provider-chip')
    expect(chips).toHaveLength(6)
    const labels = chips.map(c => c.text())
    expect(labels).toContain('Audible')
    expect(labels).toContain('Audible CA')
    expect(labels).toContain('Audible UK')
    expect(labels).toContain('Audible DE')
    expect(labels).toContain('Open Library')
    expect(labels).toContain('iTunes')
  })
})

describe('MatchSheet — close and reset', () => {
  it('emits update:modelValue false when close button clicked', async () => {
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.sheet-close-btn').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('resets step and candidates when modelValue becomes false', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce([])
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    // advance to candidates step
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    // close then re-open
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    // should be back on search step, no results-count
    expect(wrapper.find('.match-search-btn').exists()).toBe(true)
    expect(wrapper.find('.results-count').exists()).toBe(false)
  })

  it('clears error state when closed and reopened', async () => {
    vi.mocked(searchCandidates).mockRejectedValueOnce(new Error('fail'))
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    // trigger search error
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.match-error').exists()).toBe(true)
    // close and reopen — error should be gone
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('.match-error').exists()).toBe(false)
  })
})

describe('MatchSheet — candidates step', () => {
  const candidates = [
    { title: 'Dune', author: 'Frank Herbert', provider: 'audible', id: 'c1' },
    { title: 'Dune Messiah', author: 'Frank Herbert', provider: 'audible', id: 'c2' },
  ]

  it('shows result count and candidate rows after search', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce(candidates)
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.results-count').exists()).toBe(true)
    expect(wrapper.findAll('.candidate-row')).toHaveLength(2)
  })

  it('selects a candidate on click', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce(candidates)
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    await wrapper.findAll('.candidate-row')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.candidate-row')[0].classes()).toContain('selected')
  })

  it('Preview Match button is disabled until candidate selected', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce(candidates)
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    // find the Preview Match button (last .match-search-btn on candidates step)
    const previewBtn = wrapper.find('.match-search-btn')
    expect(previewBtn.attributes('disabled')).toBeDefined()
  })

  it('shows empty state when no candidates returned', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce([])
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.no-results').exists()).toBe(true)
  })
})

describe('MatchSheet — apply step', () => {
  const candidate = {
    title: 'Dune',
    subtitle: 'A Saga',
    author: 'Frank Herbert',
    provider: 'audible',
    id: 'c1',
    narrator: 'Simon Vance',
    publishedYear: '1965',
  }

  async function mountAtDiff() {
    vi.mocked(searchCandidates).mockResolvedValueOnce([candidate])
    const wrapper = mount(MatchSheet, {
      props: { modelValue: true, item: mockItem },
      global: { stubs: { Teleport: true } },
    })
    // search
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    // select candidate
    await wrapper.find('.candidate-row').trigger('click')
    // preview
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    return wrapper
  }

  it('shows Review Changes header on diff step', async () => {
    const wrapper = await mountAtDiff()
    expect(wrapper.text()).toContain('Review Changes')
  })

  it('calls applyMatch and emits matched with updated item on Apply Changes click', async () => {
    const updatedItem = { ...mockItem, id: 'li1' }
    vi.mocked(applyMatch).mockResolvedValueOnce({ updated: true })
    vi.mocked(getItem).mockResolvedValueOnce(updatedItem)
    const wrapper = await mountAtDiff()
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    expect(applyMatch).toHaveBeenCalledWith('li1', 'audible', 'Dune', 'Frank Herbert', 'c1')
    expect(getItem).toHaveBeenCalledWith('li1')
    expect(wrapper.emitted('matched')).toBeTruthy()
    expect(wrapper.emitted('matched')![0]).toEqual([updatedItem])
  })

  it('shows error on apply failure', async () => {
    vi.mocked(applyMatch).mockRejectedValueOnce(new Error('network'))
    const wrapper = await mountAtDiff()
    await wrapper.find('.match-search-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.match-error').exists()).toBe(true)
  })
})

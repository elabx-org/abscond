import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchSheet from './MatchSheet.vue'
import type { LibraryItem } from '@/api/types'

vi.mock('@/api/match', () => ({
  searchCandidates: vi.fn(),
  applyMatch: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  coverUrl: vi.fn((id: string) => `/api/items/${id}/cover?token=tok`),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ token: 'tok' }),
}))

import { searchCandidates, applyMatch } from '@/api/match'

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

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import BookDetailSheet from './BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const mockItem: LibraryItem = {
  id: 'li1',
  libraryId: 'lib1',
  mediaType: 'book',
  media: {
    metadata: {
      title: 'The Name of the Wind',
      authors: [{ id: 'a1', name: 'Patrick Rothfuss' }],
      narrators: ['Nick Podehl'],
      series: [{ id: 's1', name: 'Kingkiller Chronicle', sequence: '1' }],
      genres: ['Fantasy'],
      publishedYear: '2007',
      publisher: 'DAW Books',
      description: 'A great book about a wizard.',
    },
    duration: 36000,
  },
  addedAt: 0,
  updatedAt: 0,
}

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })

const mountOpts = (props: object) => {
  setActivePinia(createPinia())
  return {
    props,
    global: {
      stubs: { Teleport: true },
      plugins: [createPinia(), router],
    },
  }
}

describe('BookDetailSheet', () => {
  it('renders title and author', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('The Name of the Wind')
    expect(wrapper.text()).toContain('Patrick Rothfuss')
  })

  it('renders narrator', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Nick Podehl')
  })

  it('emits close when back button clicked', async () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    await wrapper.find('[data-testid="sheet-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not render when show is false', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: false }))
    expect(wrapper.find('.book-sheet').exists()).toBe(false)
  })
})

describe('BookDetailSheet — redesigned layout', () => {
  it('renders cover-bleed section', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.cover-bleed').exists()).toBe(true)
  })

  it('action row has download, finished, and more buttons', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.action-download').exists()).toBe(true)
    expect(wrapper.find('.action-finished').exists()).toBe(true)
    expect(wrapper.find('.action-more').exists()).toBe(true)
  })

  it('action row does not have the old sprawl of buttons', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    const actionRow = wrapper.find('.action-row-primary')
    expect(actionRow.text()).not.toContain('Notes')
    expect(actionRow.text()).not.toContain('Playlist')
  })
})

const multiAuthorItem: LibraryItem = {
  ...mockItem,
  media: {
    ...mockItem.media,
    metadata: {
      ...mockItem.media.metadata,
      authors: [
        { id: 'a1', name: 'Author One' },
        { id: 'a2', name: 'Author Two' },
        { id: 'a3', name: 'Author Three' },
      ],
    },
  },
}

describe('BookDetailSheet — author collapse', () => {
  it('shows all authors when there are 2 or fewer', () => {
    const item = { ...mockItem, media: { ...mockItem.media, metadata: { ...mockItem.media.metadata, authors: [{ id: 'a1', name: 'Alpha' }, { id: 'a2', name: 'Beta' }] } } }
    const wrapper = mount(BookDetailSheet, mountOpts({ item, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
    expect(wrapper.find('.author-more-chip').exists()).toBe(false)
  })

  it('shows "and 1 more" chip when there are 3 authors', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiAuthorItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.author-more-chip').exists()).toBe(true)
    expect(wrapper.find('.author-more-chip').text()).toContain('and 1 more')
  })

  it('expands all authors when "and N more" is clicked', async () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiAuthorItem, coverSrc: '/cover.jpg', show: true }))
    await wrapper.find('.author-more-chip').trigger('click')
    expect(wrapper.text()).toContain('Author Three')
    expect(wrapper.find('.author-more-chip').exists()).toBe(false)
  })
})

const multiNarratorItem: LibraryItem = {
  ...mockItem,
  media: {
    ...mockItem.media,
    metadata: {
      ...mockItem.media.metadata,
      narrators: ['Narrator One', 'Narrator Two'],
    },
  },
}

describe('BookDetailSheet — narrator collapse', () => {
  it('shows all narrators when there is only 1', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Nick Podehl')
    const chips = wrapper.findAll('.author-more-chip')
    const narratorMore = chips.filter(c => c.text().includes('more'))
    expect(narratorMore.length).toBe(0)
  })

  it('shows "and 1 more" chip when there are 2 narrators', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiNarratorItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Narrator One')
    expect(wrapper.find('.narrator-chips .author-more-chip').exists()).toBe(true)
    expect(wrapper.find('.narrator-chips .author-more-chip').text()).toContain('and 1 more')
  })

  it('expands all narrators when chip is clicked', async () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiNarratorItem, coverSrc: '/cover.jpg', show: true }))
    await wrapper.find('.narrator-chips .author-more-chip').trigger('click')
    expect(wrapper.text()).toContain('Narrator Two')
    expect(wrapper.find('.narrator-chips .author-more-chip').exists()).toBe(false)
  })
})

describe('BookDetailSheet — remaining time', () => {
  it('shows remaining time when progress is between 0 and 1', () => {
    const item = { ...mockItem, userMediaProgress: { libraryItemId: 'li1', progress: 0.5, currentTime: 18000, duration: 36000, isFinished: false, lastUpdate: 0 } }
    const wrapper = mount(BookDetailSheet, mountOpts({ item, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.progress-remaining').exists()).toBe(true)
    expect(wrapper.find('.progress-remaining').text()).toContain('left')
  })

  it('shows "< 1m left" when fewer than 60 seconds remain', () => {
    const duration = 3600
    const item = { ...mockItem, media: { ...mockItem.media, duration }, userMediaProgress: { libraryItemId: 'li1', progress: 0.9998, currentTime: 3599, duration, isFinished: false, lastUpdate: 0 } }
    const wrapper = mount(BookDetailSheet, mountOpts({ item, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.progress-remaining').text()).toContain('< 1m left')
  })

  it('does not show remaining time when no progress', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.progress-remaining').exists()).toBe(false)
  })
})

describe('BookDetailSheet — chip grouping', () => {
  it('genre chips have chip--genre class', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    const genreChips = wrapper.findAll('.chip--genre')
    expect(genreChips.length).toBeGreaterThan(0)
    expect(genreChips[0].text()).toBe('Fantasy')
  })
})

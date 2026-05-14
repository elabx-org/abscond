import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
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

const mountOpts = (props: object) => ({
  props,
  global: { stubs: { Teleport: true } },
})

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

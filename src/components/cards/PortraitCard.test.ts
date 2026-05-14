import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PortraitCard from './PortraitCard.vue'

const baseProps = {
  itemId: 'li1',
  title: 'Dune',
  author: 'Frank Herbert',
  coverSrc: '/api/items/li1/cover?token=tok',
  progress: 0,
}

describe('PortraitCard', () => {
  it('renders title and author', () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('Frank Herbert')
  })

  it('hides progress bar when progress is 0', () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    expect(wrapper.find('.progress-bar').exists()).toBe(false)
  })

  it('shows progress bar when progress > 0', () => {
    const wrapper = mount(PortraitCard, { props: { ...baseProps, progress: 0.4 } })
    expect(wrapper.find('.progress-bar').exists()).toBe(true)
  })

  it('emits click with itemId when tapped', async () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    await wrapper.find('.portrait-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0]).toEqual(['li1'])
  })
})

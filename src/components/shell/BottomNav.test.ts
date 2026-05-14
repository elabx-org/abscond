import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import BottomNav from './BottomNav.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/home', name: 'home', component: { template: '<div/>' } },
    { path: '/library', name: 'library', component: { template: '<div/>' } },
  ],
})

describe('BottomNav', () => {
  it('renders 5 nav items', () => {
    const w = mount(BottomNav, {
      global: { plugins: [createPinia(), router] },
      props: { isPlaying: false },
    })
    expect(w.findAll('[data-testid="nav-item"]').length).toBe(5)
  })

  it('emits navigate on item click', async () => {
    const w = mount(BottomNav, {
      global: { plugins: [createPinia(), router] },
      props: { isPlaying: false },
    })
    await w.find('[data-testid="nav-item"]').trigger('click')
    expect(w.emitted('navigate')).toBeTruthy()
  })
})

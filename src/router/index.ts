import { createRouter, createWebHistory } from 'vue-router'
import { createAuthGuard } from './guards'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      redirect: '/home',
      component: () => import('@/components/shell/AppShell.vue'),
      children: [
        { path: 'home',     name: 'home',     component: () => import('@/views/HomeView.vue') },
        { path: 'library',  name: 'library',  component: () => import('@/views/LibraryView.vue') },
        { path: 'player',   name: 'player',   component: () => import('@/views/PlayerView.vue') },
        { path: 'search',   name: 'search',   component: () => import('@/views/SearchView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      ],
    },
  ],
})

router.beforeEach(createAuthGuard(() => useAuthStore()))

export default router

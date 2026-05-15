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
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue'),
    },
    {
      path: '/share/:slug',
      name: 'share',
      component: () => import('@/views/ShareView.vue'),
      meta: { public: true },
    },
    {
      path: '/reader',
      name: 'reader',
      component: () => import('@/views/ReaderView.vue'),
    },
    {
      path: '/',
      redirect: '/home',
      component: () => import('@/components/shell/AppShell.vue'),
      children: [
        { path: 'home',        name: 'home',        component: () => import('@/views/HomeView.vue') },
        { path: 'library',     name: 'library',     component: () => import('@/views/LibraryView.vue') },
        { path: 'player',      name: 'player',      component: () => import('@/views/PlayerView.vue') },
        { path: 'search',      name: 'search',      component: () => import('@/views/SearchView.vue') },
        { path: 'settings',    name: 'settings',    component: () => import('@/views/SettingsView.vue') },
        { path: 'stats',       name: 'stats',       component: () => import('@/views/StatsView.vue') },
        { path: 'collections', name: 'collections', component: () => import('@/views/CollectionsView.vue') },
        { path: 'playlists',   name: 'playlists',   component: () => import('@/views/PlaylistsView.vue') },
        { path: 'browse',      name: 'browse',      component: () => import('@/views/BrowseView.vue') },
        { path: 'bookmarks',   name: 'bookmarks',   component: () => import('@/views/BookmarksView.vue') },
        { path: 'podcast',     name: 'podcast',     component: () => import('@/views/PodcastEpisodesView.vue') },
        {
          path: 'admin',
          component: () => import('@/views/admin/AdminLayout.vue'),
          meta: { requiresAdmin: true },
          children: [
            { path: '',          redirect: 'libraries' },
            { path: 'libraries', name: 'admin-libraries', component: () => import('@/views/admin/LibrariesView.vue') },
            { path: 'users',     name: 'admin-users',     component: () => import('@/views/admin/UsersView.vue') },
            { path: 'settings',  name: 'admin-settings',  component: () => import('@/views/admin/ServerSettingsView.vue') },
            { path: 'backups',   name: 'admin-backups',   component: () => import('@/views/admin/BackupsView.vue') },
            { path: 'logs',      name: 'admin-logs',      component: () => import('@/views/admin/LogsView.vue') },
          ],
        },
      ],
    },
  ],
})

router.beforeEach(createAuthGuard(() => useAuthStore()))

router.beforeEach((to) => {
  if (to.meta.requiresAdmin) {
    const auth = useAuthStore()
    if (!auth.user?.isAdminOrUp) return { name: 'settings' }
  }
})

export default router

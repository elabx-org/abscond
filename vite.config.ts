import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Don't intercept /auth/* navigations — these must reach nginx/ABS
        // for the OIDC flow to work (service worker would return index.html).
        navigateFallbackDenylist: [/^\/auth\//],
        runtimeCaching: [
          {
            // Cover images — CacheFirst for instant repeat views, invalidated explicitly on write
            urlPattern: /\/api\/items\/[^/]+\/cover/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Key API reads — stale-while-revalidate for instant render with background refresh
            urlPattern: /\/api\/(me\/items-in-progress|me$|libraries\/[^/]+\/items|me\/progress)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Abscond',
        short_name: 'Abscond',
        description: 'Escape into your library',
        theme_color: '#0e0e0e',
        background_color: '#0e0e0e',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    server: { deps: { inline: ['vuetify'] } },
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
  },
})

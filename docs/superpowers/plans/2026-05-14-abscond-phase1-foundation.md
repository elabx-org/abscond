# Abscond Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap Abscond with a working Vue 3 + Vuetify 3 SPA, auth flow (local + OIDC), responsive app shell, core composables, and Docker + nginx proxy deployment.

**Architecture:** Static SPA (Vite 5 + Vue 3 + Vuetify 3) served by nginx. nginx also proxies `/api/*` and `/socket.io/*` to the ABS server — keeping ABS off the public internet. The app reads a runtime `public/config.json` to determine the ABS host, supporting both direct-connection and nginx-proxy deployments. Auth state lives in a Pinia store persisted to `localStorage`.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), Vite 5, Vuetify 3 (M3 dark), Pinia, Vue Router 4, Axios, Socket.io-client 4, color-thief, vite-plugin-pwa, Vitest + @vue/test-utils, Docker multi-stage + nginx:alpine

---

## File Map

```
/                          # project root (already exists at /config/workspace/gh/abs-ui)
├── public/
│   ├── config.json        # runtime: { "absHost": "https://abs.example.com" }
│   └── icons/             # PWA icons (placeholder PNGs)
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── plugins/
│   │   └── vuetify.ts     # Vuetify 3 dark theme + M3 tokens
│   ├── router/
│   │   ├── index.ts       # route definitions
│   │   └── guards.ts      # auth guard
│   ├── stores/
│   │   ├── auth.ts        # JWT, user object, absHost, login/logout
│   │   └── app.ts         # global UI state (drawer open, active library)
│   ├── api/
│   │   ├── client.ts      # Axios instance, config.json loading, interceptors
│   │   ├── auth.ts        # status(), login(), refresh()
│   │   └── socket.ts      # Socket.io singleton
│   ├── composables/
│   │   ├── useColorThief.ts   # extract accent from cover <img>
│   │   ├── useScrollHide.ts   # hide/show nav on scroll direction
│   │   └── useDraggableSheet.ts # touch/mouse drag for bottom sheets
│   ├── components/
│   │   ├── shell/
│   │   │   ├── AppShell.vue    # layout switcher (mobile/tablet/desktop)
│   │   │   ├── BottomNav.vue   # mobile fixed nav bar
│   │   │   ├── SideRail.vue    # tablet nav rail
│   │   │   └── NavDrawer.vue   # desktop nav drawer
│   │   └── common/
│   │       ├── Toast.vue       # single toast item
│   │       └── ToastContainer.vue
│   ├── composables/
│   │   └── useToast.ts
│   └── views/
│       ├── LoginView.vue    # split desktop / stacked mobile
│       ├── HomeView.vue     # stub
│       ├── LibraryView.vue  # stub
│       ├── PlayerView.vue   # stub
│       ├── SearchView.vue   # stub
│       └── SettingsView.vue # stub
├── nginx/
│   └── nginx.conf          # SPA fallback + /api proxy + /socket.io proxy
├── Dockerfile              # multi-stage: node build → nginx serve
├── docker-compose.yml      # abscond service + optional ABS service
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

---

## Task 1: Project Scaffold + Testing Setup

**Files:**
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `src/main.ts`, `src/App.vue`
- Create: `index.html`, `package.json`

- [ ] **Step 1: Scaffold Vite + Vue 3 + TypeScript in the existing directory**

```bash
cd /config/workspace/gh/abs-ui
npm create vite@latest . -- --template vue-ts --yes 2>/dev/null || \
  npm create vite@latest . -- --template vue-ts
```

When prompted about overwriting files, choose to ignore/keep existing files (README, docs will not be overwritten). Accept defaults for everything else.

Expected output: `Done. Now run: npm install`

- [ ] **Step 2: Install all Phase 1 dependencies**

```bash
cd /config/workspace/gh/abs-ui
npm install
npm install vuetify@^3 @mdi/font@^7 vite-plugin-vuetify@^2
npm install pinia@^2 vue-router@^4
npm install axios@^1 socket.io-client@^4
npm install color-thief-ts@^0.1
npm install vite-plugin-pwa@^0.21 workbox-window@^7
npm install --save-dev vitest@^2 @vue/test-utils@^2 @vitest/coverage-v8@^2 jsdom@^24 @vue/test-utils
```

Expected: no peer-dep errors.

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the generated `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
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
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.ts`:

```typescript
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({ components, directives })
config.global.plugins = [vuetify]
```

- [ ] **Step 5: Write a smoke test to verify the setup works**

Create `src/App.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

describe('App', () => {
  it('mounts without errors', () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
```

- [ ] **Step 6: Simplify generated `src/App.vue` to a bare router outlet**

Replace contents of `src/App.vue` with:

```vue
<template>
  <v-app>
    <router-view />
  </v-app>
</template>
```

- [ ] **Step 7: Run the smoke test — expect it to fail because router/pinia aren't wired yet**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/App.test.ts
```

Expected: FAIL — `createRouter is not a function` or similar (dependencies not yet configured in main.ts). That's fine — we'll make it pass after Task 3.

- [ ] **Step 8: Commit scaffold**

```bash
git add -A && git commit -m "feat: scaffold Vite + Vue 3 + TS + Vuetify 3 + Vitest"
```

---

## Task 2: Vuetify 3 Dark Theme + Design Tokens

**Files:**
- Create: `src/plugins/vuetify.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write test for theme token values**

Create `src/plugins/vuetify.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { abscondTheme } from './vuetify'

describe('abscondTheme', () => {
  it('has dark mode enabled', () => {
    expect(abscondTheme.dark).toBe(true)
  })

  it('uses #0e0e0e as background', () => {
    expect(abscondTheme.colors.background).toBe('#0e0e0e')
  })

  it('uses amber #d4a017 as primary accent', () => {
    expect(abscondTheme.colors.primary).toBe('#d4a017')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/plugins/vuetify.test.ts
```

Expected: FAIL — `abscondTheme is not exported`

- [ ] **Step 3: Create `src/plugins/vuetify.ts`**

```typescript
import { createVuetify, type ThemeDefinition } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export const abscondTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background:     '#0e0e0e',
    surface:        '#111111',
    'surface-variant': '#141414',
    primary:        '#d4a017',
    'primary-darken-1': '#a87c12',
    secondary:      '#ffffff',
    error:          '#ef4444',
    info:           '#5ba4f5',
    success:        '#34d399',
    warning:        '#fbbf24',
    'on-background': '#f5f5f7',
    'on-surface':   '#f5f5f7',
    'on-primary':   '#000000',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'abscond',
    themes: { abscond: abscondTheme },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCard: { rounded: 'lg' },
  },
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/plugins/vuetify.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Wire Vuetify into `src/main.ts`**

Replace generated `src/main.ts`:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .mount('#app')
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: configure Vuetify 3 dark theme with Abscond design tokens"
```

---

## Task 3: Router + Auth Guard + Stub Views

**Files:**
- Create: `src/router/index.ts`, `src/router/guards.ts`
- Create: `src/views/LoginView.vue`, `src/views/HomeView.vue`, `src/views/LibraryView.vue`, `src/views/PlayerView.vue`, `src/views/SearchView.vue`, `src/views/SettingsView.vue`

- [ ] **Step 1: Write router guard tests**

Create `src/router/guards.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthGuard } from './guards'

const mockAuthStore = (isLoggedIn: boolean) => ({ token: isLoggedIn ? 'tok' : null })

describe('createAuthGuard', () => {
  it('redirects to /login when not authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(false) as any)
    const next = vi.fn()
    await guard({ name: 'home' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith({ name: 'login' })
  })

  it('allows navigation when authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(true) as any)
    const next = vi.fn()
    await guard({ name: 'home' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('allows navigation to login when not authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(false) as any)
    const next = vi.fn()
    await guard({ name: 'login' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/router/guards.test.ts
```

Expected: FAIL — `createAuthGuard is not exported`

- [ ] **Step 3: Create `src/router/guards.ts`**

```typescript
import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import type { useAuthStore } from '@/stores/auth'

const PUBLIC_ROUTES = ['login']

export function createAuthGuard(
  getStore: () => ReturnType<typeof useAuthStore>
): NavigationGuardWithThis<undefined> {
  return async (to: RouteLocationNormalized, _from, next) => {
    if (PUBLIC_ROUTES.includes(to.name as string)) return next()
    const auth = getStore()
    if (!auth.token) return next({ name: 'login' })
    next()
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/router/guards.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create all stub views**

Create `src/views/LoginView.vue` (placeholder — replaced fully in Task 7):

```vue
<template>
  <div class="login-placeholder">Login</div>
</template>
```

Create `src/views/HomeView.vue`:

```vue
<template>
  <v-container>
    <h1 class="text-h5">Home</h1>
  </v-container>
</template>
```

Create `src/views/LibraryView.vue`:

```vue
<template>
  <v-container>
    <h1 class="text-h5">Library</h1>
  </v-container>
</template>
```

Create `src/views/PlayerView.vue`:

```vue
<template>
  <v-container>
    <h1 class="text-h5">Player</h1>
  </v-container>
</template>
```

Create `src/views/SearchView.vue`:

```vue
<template>
  <v-container>
    <h1 class="text-h5">Search</h1>
  </v-container>
</template>
```

Create `src/views/SettingsView.vue`:

```vue
<template>
  <v-container>
    <h1 class="text-h5">Settings</h1>
  </v-container>
</template>
```

- [ ] **Step 6: Create `src/router/index.ts`**

```typescript
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
```

- [ ] **Step 7: Run all tests — expect PASS**

```bash
npx vitest run
```

Expected: PASS (all tests including App.test.ts smoke test now that router exists)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add router with auth guard and stub views"
```

---

## Task 4: Pinia Auth Store

**Files:**
- Create: `src/stores/auth.ts`, `src/stores/auth.test.ts`
- Create: `src/stores/app.ts`

- [ ] **Step 1: Write auth store tests**

Create `src/stores/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts unauthenticated', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('setSession stores token and user', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('tok123')
    expect(auth.user?.username).toBe('elmer')
  })

  it('logout clears session', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    auth.logout()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('isAdmin returns true for admin users', () => {
    const auth = useAuthStore()
    auth.setSession('tok', { id: '1', username: 'admin', isAdminOrUp: true })
    expect(auth.isAdmin).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/stores/auth.test.ts
```

Expected: FAIL — `useAuthStore is not exported`

- [ ] **Step 3: Create `src/stores/auth.ts`**

```typescript
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface AbsUser {
  id: string
  username: string
  isAdminOrUp: boolean
  token?: string
}

const STORAGE_KEY = 'abscond_auth'

function loadFromStorage(): { token: string | null; user: AbsUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = loadFromStorage()
  const token = ref<string | null>(stored.token)
  const user = ref<AbsUser | null>(stored.user)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdminOrUp ?? false)

  function setSession(newToken: string, newUser: AbsUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, user, isLoggedIn, isAdmin, setSession, logout }
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/stores/auth.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Create `src/stores/app.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const drawerOpen = ref(false)
  const activeLibraryId = ref<string | null>(null)

  function toggleDrawer() { drawerOpen.value = !drawerOpen.value }
  function setLibrary(id: string) { activeLibraryId.value = id }

  return { drawerOpen, activeLibraryId, toggleDrawer, setLibrary }
})
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Pinia auth store with localStorage persistence"
```

---

## Task 5: API Client + Runtime Config

**Files:**
- Create: `src/api/client.ts`, `src/api/client.test.ts`
- Create: `public/config.json`

- [ ] **Step 1: Write API client tests**

Create `src/api/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveBaseUrl, createApiClient } from './client'

describe('resolveBaseUrl', () => {
  it('returns /api when absHost is empty (proxy mode)', () => {
    expect(resolveBaseUrl('')).toBe('/api')
  })

  it('returns /api when absHost is not provided', () => {
    expect(resolveBaseUrl(undefined)).toBe('/api')
  })

  it('appends /api to absHost in direct mode', () => {
    expect(resolveBaseUrl('https://abs.example.com')).toBe('https://abs.example.com/api')
  })

  it('strips trailing slash before appending /api', () => {
    expect(resolveBaseUrl('https://abs.example.com/')).toBe('https://abs.example.com/api')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/api/client.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/api/client.ts`**

```typescript
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export function resolveBaseUrl(absHost: string | undefined): string {
  if (!absHost) return '/api'
  return `${absHost.replace(/\/$/, '')}/api`
}

declare global {
  interface Window { __absconfig?: { absHost?: string } }
}

async function loadConfig(): Promise<string> {
  try {
    const res = await fetch('/config.json')
    const cfg = await res.json()
    window.__absconfig = cfg
    return resolveBaseUrl(cfg.absHost)
  } catch {
    return '/api'
  }
}

let baseUrlPromise: Promise<string> | null = null

export function getBaseUrl(): Promise<string> {
  if (!baseUrlPromise) baseUrlPromise = loadConfig()
  return baseUrlPromise
}

export async function createApiClient() {
  const baseURL = await getBaseUrl()
  const client = axios.create({ baseURL, timeout: 15000 })

  client.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        useAuthStore().logout()
        router.push({ name: 'login' })
      }
      return Promise.reject(err)
    }
  )

  return client
}

const apiPromise = createApiClient()
export const api = { get: (...a: any[]) => apiPromise.then(c => (c.get as any)(...a)),
                     post: (...a: any[]) => apiPromise.then(c => (c.post as any)(...a)),
                     patch: (...a: any[]) => apiPromise.then(c => (c.patch as any)(...a)),
                     delete: (...a: any[]) => apiPromise.then(c => (c.delete as any)(...a)) }
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/api/client.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Create `public/config.json`**

```json
{
  "absHost": ""
}
```

When `absHost` is empty the app uses proxy mode (`/api/*`). Set it to a full URL for direct-connection mode.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Axios API client with runtime config.json and proxy-mode support"
```

---

## Task 6: Auth API Functions

**Files:**
- Create: `src/api/auth.ts`, `src/api/auth.test.ts`

- [ ] **Step 1: Write auth API tests**

Create `src/api/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('./client', () => ({
  api: {
    get:  vi.fn(),
    post: vi.fn(),
  }
}))

import { api } from './client'
import { fetchStatus, login } from './auth'

const mockGet  = api.get  as ReturnType<typeof vi.fn>
const mockPost = api.post as ReturnType<typeof vi.fn>

beforeEach(() => { mockGet.mockReset(); mockPost.mockReset() })

describe('fetchStatus', () => {
  it('returns auth methods from /status', async () => {
    mockGet.mockResolvedValueOnce({
      data: { authMethods: ['local', 'openid'], isInit: true }
    })
    const result = await fetchStatus('https://abs.example.com')
    expect(result.authMethods).toEqual(['local', 'openid'])
    expect(result.isInit).toBe(true)
  })
})

describe('login', () => {
  it('posts credentials and returns token + user', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        user: { id: '1', username: 'elmer', isAdminOrUp: false },
        userDefaultLibraryId: 'lib1',
      },
      headers: { 'set-cookie': '' }
    })
    const result = await login('elmer', 'pass')
    expect(mockPost).toHaveBeenCalledWith('/login', { username: 'elmer', password: 'pass' })
    expect(result.user.username).toBe('elmer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/api/auth.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/api/auth.ts`**

```typescript
import axios from 'axios'
import { api, resolveBaseUrl } from './client'

export interface ServerStatus {
  isInit: boolean
  authMethods: string[]         // e.g. ['local', 'openid']
  authFormData?: {
    title?: string
    username?: string
    password?: string
  }
}

export interface LoginResult {
  user: {
    id: string
    username: string
    isAdminOrUp: boolean
    token: string
  }
  userDefaultLibraryId: string | null
}

/** Probe an ABS server — no auth required */
export async function fetchStatus(absHost: string): Promise<ServerStatus> {
  const base = resolveBaseUrl(absHost)
  const res = await axios.get(`${absHost.replace(/\/$/, '')}/status`, { timeout: 8000 })
  return res.data
}

/** Local username/password login */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await api.post('/login', { username, password })
  return res.data
}

/** Token refresh */
export async function refreshToken(): Promise<string> {
  const res = await api.post('/auth/refresh')
  return res.data.token
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/api/auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add auth API (status probe, login, token refresh)"
```

---

## Task 7: Login View

**Files:**
- Modify: `src/views/LoginView.vue`

- [ ] **Step 1: Write login view component test**

Create `src/views/LoginView.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from './LoginView.vue'

vi.mock('@/api/auth', () => ({
  fetchStatus: vi.fn().mockResolvedValue({ isInit: true, authMethods: ['local'] }),
  login: vi.fn().mockResolvedValue({
    user: { id: '1', username: 'elmer', isAdminOrUp: false, token: 'tok' },
    userDefaultLibraryId: 'lib1',
  }),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('LoginView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders server URL input', () => {
    const w = mount(LoginView)
    expect(w.find('[data-testid="server-url"]').exists()).toBe(true)
  })

  it('shows password form after server probe', async () => {
    const w = mount(LoginView)
    await w.find('[data-testid="server-url"]').setValue('https://abs.example.com')
    await w.find('[data-testid="probe-btn"]').trigger('click')
    await new Promise(r => setTimeout(r, 10))
    await w.vm.$nextTick()
    expect(w.find('[data-testid="username"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/views/LoginView.test.ts
```

Expected: FAIL

- [ ] **Step 3: Replace `src/views/LoginView.vue` with the full implementation**

```vue
<template>
  <div class="login-root">
    <!-- ── LEFT HERO (desktop only) ── -->
    <div class="hero d-none d-md-flex">
      <div class="hero-ambient" />
      <div class="hero-books">
        <div v-for="b in heroBgBooks" :key="b.id"
          class="hero-book" :style="b.style" />
      </div>

      <div class="hero-logo">
        <div class="logo-icon">◉</div>
        <span class="logo-name">abs<span class="accent">cond</span></span>
      </div>

      <div class="hero-center">
        <!-- Carousel of UI previews -->
        <div class="carousel-frame">
          <transition :name="slideDir" mode="out-in">
            <div :key="currentSlide" class="carousel-phone">
              <div class="phone-screen">
                <component :is="slideComponents[currentSlide]" />
              </div>
            </div>
          </transition>
        </div>
        <div class="carousel-dots">
          <button v-for="(_, i) in slideComponents" :key="i"
            class="dot" :class="{ active: i === currentSlide }"
            @click="goToSlide(i)" />
        </div>
        <p class="carousel-caption">{{ slideCaptions[currentSlide] }}</p>
      </div>

      <p class="hero-foot">Escape into your library</p>
    </div>

    <!-- ── RIGHT FORM ── -->
    <div class="form-panel" :class="{ 'mobile-sheet': isMobile }">
      <!-- Mobile logo (shown only on mobile) -->
      <div class="mobile-logo d-md-none">
        <div class="logo-icon logo-icon--lg">◉</div>
        <span class="logo-name logo-name--lg">abs<span class="accent">cond</span></span>
        <p class="mobile-tagline">Escape into your library</p>
      </div>

      <div class="form-card">
        <template v-if="!serverProbed">
          <p class="form-heading">Connect</p>
          <p class="form-sub">Enter your Audiobookshelf server address</p>

          <v-text-field
            v-model="serverUrl"
            data-testid="server-url"
            label="Server URL"
            placeholder="https://your-abs-server.com"
            type="url"
            :append-inner-icon="probeSuccess ? 'mdi-check-circle' : undefined"
            :color="probeSuccess ? 'success' : 'primary'"
            @keydown.enter="probeServer"
          />

          <v-alert v-if="probeError" type="error" variant="tonal" class="mb-4" density="compact">
            {{ probeError }}
          </v-alert>

          <v-btn
            data-testid="probe-btn"
            color="primary"
            block
            size="large"
            :loading="probing"
            @click="probeServer"
          >
            Continue
          </v-btn>
        </template>

        <template v-else>
          <p class="form-heading">Sign in</p>
          <p class="form-sub server-url-hint" @click="resetProbe">
            {{ serverUrl }} <span class="change-link">change</span>
          </p>

          <!-- OIDC provider buttons -->
          <template v-if="oidcProviders.length">
            <v-btn
              v-for="p in oidcProviders"
              :key="p.id"
              variant="outlined"
              block
              class="mb-2 oidc-btn"
              @click="startOidc(p)"
            >
              <v-icon start>mdi-login</v-icon>
              Continue with {{ p.name }}
            </v-btn>

            <div class="divider-row">
              <v-divider /><span class="divider-text">or</span><v-divider />
            </div>
          </template>

          <!-- Local auth -->
          <v-text-field
            v-model="username"
            data-testid="username"
            label="Username"
            autocomplete="username"
            @keydown.enter="$refs.pwdField.$el.querySelector('input').focus()"
          />
          <v-text-field
            ref="pwdField"
            v-model="password"
            label="Password"
            type="password"
            autocomplete="current-password"
            @keydown.enter="submit"
          />

          <v-alert v-if="loginError" type="error" variant="tonal" class="mb-4" density="compact">
            {{ loginError }}
          </v-alert>

          <v-btn color="primary" block size="large" :loading="loggingIn" @click="submit">
            Sign in
          </v-btn>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchStatus, login } from '@/api/auth'

const router = useRouter()
const auth   = useAuthStore()

/* ─── Responsive ─── */
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 960)

/* ─── Server probe ─── */
const serverUrl    = ref('')
const probing      = ref(false)
const probeSuccess = ref(false)
const probeError   = ref('')
const serverProbed = ref(false)
const oidcProviders = ref<{ id: string; name: string }[]>([])

async function probeServer() {
  if (!serverUrl.value) return
  probing.value = true
  probeError.value = ''
  try {
    const status = await fetchStatus(serverUrl.value)
    if (!status.isInit) { probeError.value = 'Server not initialised.'; return }
    probeSuccess.value = true
    serverProbed.value = true
    if (status.authMethods.includes('openid')) {
      oidcProviders.value = [{ id: 'openid', name: 'SSO' }]
    }
  } catch {
    probeError.value = 'Could not reach server. Check the URL and try again.'
  } finally {
    probing.value = false
  }
}

function resetProbe() {
  serverProbed.value = false
  probeSuccess.value = false
  oidcProviders.value = []
}

function startOidc(provider: { id: string }) {
  window.location.href = `${serverUrl.value}/auth/${provider.id}`
}

/* ─── Login ─── */
const username   = ref('')
const password   = ref('')
const loggingIn  = ref(false)
const loginError = ref('')

async function submit() {
  loggingIn.value = true
  loginError.value = ''
  try {
    const result = await login(username.value, password.value)
    auth.setSession(result.user.token!, result.user)
    router.push({ name: 'home' })
  } catch (e: any) {
    loginError.value = e?.response?.data?.error || 'Invalid username or password.'
  } finally {
    loggingIn.value = false
  }
}

/* ─── Hero carousel ─── */
const heroBgBooks = [
  { id: 1, style: 'top:18%;left:10%;background:linear-gradient(135deg,#001433,#0055bb);transform:rotate(-8deg)' },
  { id: 2, style: 'top:55%;left:7%;background:linear-gradient(135deg,#1a0033,#7700cc);transform:rotate(6deg)' },
  { id: 3, style: 'top:20%;right:9%;background:linear-gradient(135deg,#0d1a00,#3a7d00);transform:rotate(7deg)' },
  { id: 4, style: 'top:62%;right:8%;background:linear-gradient(135deg,#1a0000,#990000);transform:rotate(-5deg)' },
]

const currentSlide = ref(0)
const slideDir = ref<'slide-left' | 'slide-right'>('slide-left')
const slideCaptions = ['Player', 'Library', 'Book detail', 'Home', 'Search']
const slideComponents = slideCaptions.map((_, i) => ({ template: `<div class="slide-${i}"><!-- screen ${i} --></div>` }))

let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => goToSlide((currentSlide.value + 1) % slideCaptions.length), 4000) })
onBeforeUnmount(() => clearInterval(timer))

function goToSlide(n: number) {
  slideDir.value = n > currentSlide.value ? 'slide-left' : 'slide-right'
  currentSlide.value = n
}
</script>

<style scoped>
.login-root { display:flex; height:100vh; min-height:560px; background:#060606; }

/* Hero */
.hero {
  flex:0 0 52%; position:relative; overflow:hidden;
  background:#060606; flex-direction:column;
  align-items:center; justify-content:center;
  border-right:1px solid #111;
}
.hero-ambient {
  position:absolute; inset:0;
  background:
    radial-gradient(ellipse 65% 50% at 45% 55%, rgba(180,100,8,0.14) 0%, transparent 70%),
    radial-gradient(ellipse 40% 35% at 70% 25%, rgba(90,50,0,0.09) 0%, transparent 60%);
}
.hero-books { position:absolute; inset:0; }
.hero-book  { position:absolute; width:46px; height:46px; border-radius:6px; opacity:0.22;
              box-shadow:0 4px 14px rgba(0,0,0,0.7); }
.hero-logo  { position:absolute; top:22px; left:22px; z-index:3; display:flex; align-items:center; gap:8px; }
.hero-center { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; }
.hero-foot  { position:absolute; bottom:14px; font-size:0.68rem; color:rgba(255,255,255,0.2); z-index:2; }

.carousel-frame { width:190px; height:340px; position:relative; }
.carousel-phone {
  width:100%; height:100%; background:#0e0e0e; border-radius:24px;
  border:1.5px solid rgba(255,255,255,0.08);
  box-shadow:0 24px 64px rgba(0,0,0,0.85);
  overflow:hidden;
}
.phone-screen { width:100%; height:100%; }
.carousel-dots { display:flex; gap:5px; justify-content:center; margin-top:14px; }
.dot {
  width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.15);
  border:none; cursor:pointer; transition:all 0.3s;
}
.dot.active { width:16px; border-radius:3px; background:#d4a017; }
.carousel-caption { margin-top:8px; font-size:0.68rem; color:rgba(255,255,255,0.25); }

/* Slide transitions */
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active { transition:all 0.45s ease; }
.slide-left-enter-from  { opacity:0; transform:translateX(16px) scale(0.97); }
.slide-left-leave-to    { opacity:0; transform:translateX(-16px) scale(0.97); }
.slide-right-enter-from { opacity:0; transform:translateX(-16px) scale(0.97); }
.slide-right-leave-to   { opacity:0; transform:translateX(16px) scale(0.97); }

/* Logo */
.logo-icon { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#2a1500,#d4a017); display:flex; align-items:center; justify-content:center; font-size:13px; box-shadow:0 4px 12px rgba(212,160,23,0.3); }
.logo-icon--lg { width:52px; height:52px; border-radius:14px; font-size:24px; }
.logo-name { font-size:0.95rem; font-weight:800; letter-spacing:-0.3px; }
.logo-name--lg { font-size:1.5rem; }
.accent { color:#d4a017; }

/* Form panel */
.form-panel {
  flex:1; background:#0e0e0e;
  display:flex; align-items:center; justify-content:center;
  padding:2.5rem; overflow-y:auto;
}
.mobile-sheet {
  flex-direction:column; align-items:center; justify-content:flex-start;
  background:#0e0e0e; padding-top:0;
}
.mobile-logo {
  width:100%; display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:3.5rem 1.5rem 2rem;
  background:radial-gradient(ellipse 80% 50% at 50% 20%, rgba(180,100,8,0.18) 0%, transparent 65%);
}
.mobile-tagline { font-size:0.72rem; color:rgba(255,255,255,0.3); }
.form-card { width:100%; max-width:320px; }
.form-heading { font-size:1.4rem; font-weight:800; letter-spacing:-0.4px; margin-bottom:0.25rem; }
.form-sub { font-size:0.8rem; color:rgba(255,255,255,0.35); margin-bottom:1.5rem; }
.server-url-hint { cursor:pointer; }
.change-link { color:#d4a017; font-weight:600; margin-left:6px; }
.oidc-btn { border-color:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.7) !important; }
.divider-row { display:flex; align-items:center; gap:10px; margin:0.75rem 0; }
.divider-text { font-size:0.68rem; color:rgba(255,255,255,0.2); white-space:nowrap; }
</style>
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/views/LoginView.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement Login view with server probe, OIDC buttons, and responsive layout"
```

---

## Task 8: App Shell + Responsive Navigation

**Files:**
- Create: `src/components/shell/AppShell.vue`
- Create: `src/components/shell/BottomNav.vue`
- Create: `src/components/shell/SideRail.vue`
- Create: `src/components/shell/NavDrawer.vue`

- [ ] **Step 1: Write BottomNav test**

Create `src/components/shell/BottomNav.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/shell/BottomNav.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/components/shell/BottomNav.vue`**

```vue
<template>
  <nav class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.name"
      data-testid="nav-item"
      class="nav-item"
      :class="{ active: isActive(item.route) }"
      @click="navigate(item.route)"
    >
      <span class="nav-icon">
        <template v-if="item.route === 'player' && isPlaying">
          <span class="wave-wrap">
            <span v-for="n in 5" :key="n" class="wave-bar" :style="`animation-delay:${(n-1)*0.1}s`" />
          </span>
        </template>
        <v-icon v-else size="20">{{ isActive(item.route) ? item.iconActive : item.icon }}</v-icon>
      </span>
      <span class="nav-label">{{ item.label }}</span>
      <span class="nav-dot" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{ isPlaying: boolean }>()
const emit  = defineEmits<{ navigate: [route: string] }>()

const route  = useRoute()
const router = useRouter()

const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',          iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',             iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',            iconActive: 'mdi-headphones' },
  { route: 'search',   label: 'Search',   icon: 'mdi-magnify',               iconActive: 'mdi-magnify' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',           iconActive: 'mdi-cog' },
]

const isActive = (name: string) => route.name === name

function navigate(name: string) {
  emit('navigate', name)
  router.push({ name })
}
</script>

<style scoped>
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  height: 56px; padding-bottom: env(safe-area-inset-bottom);
  background: rgba(14,14,14,0.82); backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: space-around;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: transparent; border: none; cursor: pointer;
  padding: 4px 8px; flex: 1; color: rgba(255,255,255,0.4);
  transition: color 0.15s;
}
.nav-item.active { color: #d4a017; }
.nav-icon { display: flex; align-items: center; justify-content: center; height: 22px; }
.nav-label { font-size: 9px; font-weight: 500; line-height: 1; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: transparent; margin-top: 1px; }
.nav-item.active .nav-dot { background: #d4a017; }
.wave-wrap { display: flex; align-items: flex-end; gap: 1.5px; height: 16px; }
.wave-bar {
  width: 2px; background: #d4a017; border-radius: 1px;
  animation: wave 0.8s ease-in-out infinite alternate;
}
.wave-bar:nth-child(1) { height: 6px; }
.wave-bar:nth-child(2) { height: 12px; }
.wave-bar:nth-child(3) { height: 16px; }
.wave-bar:nth-child(4) { height: 10px; }
.wave-bar:nth-child(5) { height: 7px; }
@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
</style>
```

- [ ] **Step 4: Create `src/components/shell/SideRail.vue`**

```vue
<template>
  <nav class="side-rail">
    <div class="rail-logo">
      <div class="logo-icon">◉</div>
    </div>
    <button
      v-for="item in navItems"
      :key="item.route"
      class="rail-item"
      :class="{ active: isActive(item.route) }"
      @click="router.push({ name: item.route })"
    >
      <v-icon size="22">{{ isActive(item.route) ? item.iconActive : item.icon }}</v-icon>
      <span class="rail-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
const isActive = (name: string) => route.name === name
const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',  iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',     iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',    iconActive: 'mdi-headphones' },
  { route: 'search',   label: 'Search',   icon: 'mdi-magnify',       iconActive: 'mdi-magnify' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',   iconActive: 'mdi-cog' },
]
</script>

<style scoped>
.side-rail {
  width: 72px; height: 100vh; position: fixed; left: 0; top: 0; z-index: 100;
  background: rgba(14,14,14,0.9); border-right: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; align-items: center; padding: 8px 0; gap: 4px;
}
.rail-logo { padding: 12px 0 16px; }
.logo-icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg,#2a1500,#d4a017);
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.rail-item {
  width: 56px; padding: 8px 4px; border-radius: 12px; border: none; background: transparent;
  cursor: pointer; color: rgba(255,255,255,0.4); display: flex; flex-direction: column;
  align-items: center; gap: 3px; transition: all 0.15s;
}
.rail-item.active { background: rgba(212,160,23,0.12); color: #d4a017; }
.rail-label { font-size: 9px; font-weight: 500; }
</style>
```

- [ ] **Step 5: Create `src/components/shell/NavDrawer.vue`**

```vue
<template>
  <nav class="nav-drawer">
    <div class="drawer-logo">
      <div class="logo-icon">◉</div>
      <span class="logo-name">abs<span class="accent">cond</span></span>
    </div>

    <div class="drawer-items">
      <button
        v-for="item in navItems" :key="item.route"
        class="drawer-item"
        :class="{ active: isActive(item.route) }"
        @click="router.push({ name: item.route })"
      >
        <v-icon size="20" class="drawer-icon">{{ isActive(item.route) ? item.iconActive : item.icon }}</v-icon>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <!-- Mini player stub — replaced in Phase 2 -->
    <div class="drawer-mini-player" v-if="false" />
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
const isActive = (name: string) => route.name === name
const navItems = [
  { route: 'home',     label: 'Home',     icon: 'mdi-home-outline',  iconActive: 'mdi-home' },
  { route: 'library',  label: 'Library',  icon: 'mdi-bookshelf',     iconActive: 'mdi-bookshelf' },
  { route: 'player',   label: 'Player',   icon: 'mdi-headphones',    iconActive: 'mdi-headphones' },
  { route: 'search',   label: 'Search',   icon: 'mdi-magnify',       iconActive: 'mdi-magnify' },
  { route: 'settings', label: 'Settings', icon: 'mdi-cog-outline',   iconActive: 'mdi-cog' },
]
</script>

<style scoped>
.nav-drawer {
  width: 200px; height: 100vh; position: fixed; left: 0; top: 0; z-index: 100;
  background: rgba(11,11,11,0.95); border-right: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; padding: 0 8px;
}
.drawer-logo { display: flex; align-items: center; gap: 10px; padding: 20px 8px 16px; }
.logo-icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(135deg,#2a1500,#d4a017);
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.logo-name { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.3px; }
.accent { color: #d4a017; }
.drawer-items { display: flex; flex-direction: column; gap: 2px; }
.drawer-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
  border: none; background: transparent; cursor: pointer;
  font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.5);
  transition: all 0.15s; text-align: left;
}
.drawer-item.active { background: rgba(212,160,23,0.1); color: #d4a017; }
.drawer-icon { flex-shrink: 0; }
</style>
```

- [ ] **Step 6: Create `src/components/shell/AppShell.vue`**

```vue
<template>
  <div class="app-shell" :class="shellClass">
    <!-- Mobile bottom nav -->
    <BottomNav v-if="isMobile" :is-playing="false" />

    <!-- Tablet side rail -->
    <SideRail v-else-if="isTablet" />

    <!-- Desktop drawer -->
    <NavDrawer v-else />

    <!-- Page content -->
    <main class="shell-content" :style="contentStyle">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import BottomNav from './BottomNav.vue'
import SideRail  from './SideRail.vue'
import NavDrawer from './NavDrawer.vue'

const width = ref(window.innerWidth)
const onResize = () => { width.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const isMobile  = computed(() => width.value < 768)
const isTablet  = computed(() => width.value >= 768 && width.value < 1280)
const isDesktop = computed(() => width.value >= 1280)

const shellClass = computed(() => ({
  'shell--mobile':  isMobile.value,
  'shell--tablet':  isTablet.value,
  'shell--desktop': isDesktop.value,
}))

const contentStyle = computed(() => {
  if (isMobile.value)  return { paddingBottom: '56px' }
  if (isTablet.value)  return { paddingLeft: '72px' }
  return { paddingLeft: '200px' }
})
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #0e0e0e; }
.shell-content { min-height: 100vh; }
</style>
```

- [ ] **Step 7: Run BottomNav test — expect PASS**

```bash
npx vitest run src/components/shell/BottomNav.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add responsive app shell (bottom nav / side rail / drawer)"
```

---

## Task 9: Socket.io Client

**Files:**
- Create: `src/api/socket.ts`, `src/api/socket.test.ts`

- [ ] **Step 1: Write socket tests**

Create `src/api/socket.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

import { io } from 'socket.io-client'
import { connectSocket, disconnectSocket, onSocketEvent } from './socket'

const mockIo = io as ReturnType<typeof vi.fn>

describe('socket', () => {
  beforeEach(() => mockIo.mockClear())

  it('connectSocket creates a socket with the token', () => {
    connectSocket('https://abs.example.com', 'tok123')
    expect(mockIo).toHaveBeenCalledWith('https://abs.example.com', expect.objectContaining({
      auth: { token: 'tok123' },
    }))
  })

  it('disconnectSocket calls disconnect', () => {
    const sock = connectSocket('https://abs.example.com', 'tok')
    disconnectSocket()
    expect(sock.disconnect).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/api/socket.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/api/socket.ts`**

```typescript
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(absHost: string, token: string): Socket {
  if (socket?.connected) socket.disconnect()
  socket = io(absHost, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  socket?.on(event, handler)
  return () => socket?.off(event, handler)
}

export function getSocket(): Socket | null {
  return socket
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/api/socket.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Connect socket on login — update `src/views/LoginView.vue` `submit()` function**

In `LoginView.vue`, add the socket import and call after `auth.setSession`:

```typescript
// add at top of <script setup>:
import { connectSocket } from '@/api/auth' // will be @/api/socket
// actually import:
import { connectSocket } from '@/api/socket'
import { getBaseUrl } from '@/api/client'

// inside submit(), after auth.setSession():
const baseHost = serverUrl.value || (await getBaseUrl()).replace('/api', '')
connectSocket(baseHost, result.user.token!)
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Socket.io client with connect/disconnect/event helpers"
```

---

## Task 10: Core Composables

**Files:**
- Create: `src/composables/useColorThief.ts` + test
- Create: `src/composables/useScrollHide.ts` + test
- Create: `src/composables/useDraggableSheet.ts` + test

- [ ] **Step 1: Write useColorThief test**

Create `src/composables/useColorThief.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { normaliseAccent } from './useColorThief'

describe('normaliseAccent', () => {
  it('returns fallback amber when input is null', () => {
    expect(normaliseAccent(null)).toBe('#d4a017')
  })

  it('boosts saturation and clamps lightness', () => {
    const result = normaliseAccent([30, 30, 30]) // very desaturated dark grey
    expect(result).not.toBe('rgb(30,30,30)')
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a hex string from valid RGB', () => {
    const result = normaliseAccent([200, 100, 20])
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/composables/useColorThief.test.ts
```

- [ ] **Step 3: Create `src/composables/useColorThief.ts`**

```typescript
import { ref, type Ref } from 'vue'
import ColorThief from 'color-thief-ts'

const thief = new ColorThief()

export function normaliseAccent(rgb: [number, number, number] | null): string {
  if (!rgb) return '#d4a017'
  const [r, g, b] = rgb
  // Convert to HSL
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  // Clamp: saturation min 40%, lightness 45–65%
  const sFinal = Math.max(s, 0.40)
  const lFinal = Math.min(Math.max(l, 0.45), 0.65)
  return hslToHex(h * 360, sFinal * 100, lFinal * 100)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function useColorThief(imgRef: Ref<HTMLImageElement | null>) {
  const accent = ref<string>('#d4a017')

  function extract() {
    if (!imgRef.value?.complete || !imgRef.value.naturalWidth) return
    try {
      const color = thief.getColor(imgRef.value) as [number, number, number]
      accent.value = normaliseAccent(color)
    } catch {
      accent.value = '#d4a017'
    }
  }

  return { accent, extract }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/composables/useColorThief.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Write and implement useScrollHide**

Create `src/composables/useScrollHide.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { useScrollHide } from './useScrollHide'
import { ref, nextTick } from 'vue'

describe('useScrollHide', () => {
  it('starts visible', () => {
    const el = ref<HTMLElement | null>(null)
    const { visible } = useScrollHide(el)
    expect(visible.value).toBe(true)
  })
})
```

Create `src/composables/useScrollHide.ts`:

```typescript
import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

const THRESHOLD = 40

export function useScrollHide(scrollEl: Ref<HTMLElement | null>) {
  const visible = ref(true)
  let lastY = 0

  function onScroll() {
    const el = scrollEl.value ?? document.documentElement
    const currentY = el.scrollTop
    const delta = currentY - lastY
    if (Math.abs(delta) < THRESHOLD) return
    visible.value = delta < 0 // scrolling up → show
    lastY = currentY
  }

  onMounted(() => {
    const el = scrollEl.value ?? window
    el.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    const el = scrollEl.value ?? window
    el.removeEventListener('scroll', onScroll)
  })

  return { visible }
}
```

- [ ] **Step 6: Write and implement useDraggableSheet**

Create `src/composables/useDraggableSheet.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { useDraggableSheet } from './useDraggableSheet'

describe('useDraggableSheet', () => {
  it('initialises at the given snap point', () => {
    const { heightPct } = useDraggableSheet({ initial: 85, min: 40, max: 95 })
    expect(heightPct.value).toBe(85)
  })
})
```

Create `src/composables/useDraggableSheet.ts`:

```typescript
import { ref } from 'vue'

interface SheetOptions { initial: number; min: number; max: number }

export function useDraggableSheet({ initial, min, max }: SheetOptions) {
  const heightPct = ref(initial)
  const isDragging = ref(false)
  let startY = 0
  let startH = initial

  function onPointerDown(e: PointerEvent) {
    isDragging.value = true
    startY = e.clientY
    startH = heightPct.value
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return
    const dy = startY - e.clientY
    const vh = window.innerHeight
    const delta = (dy / vh) * 100
    heightPct.value = Math.min(max, Math.max(min, startH + delta))
  }

  function onPointerUp() {
    isDragging.value = false
    // Snap: if below mid-point between min and initial, close (set to min)
    const mid = (min + initial) / 2
    if (heightPct.value < mid) heightPct.value = min
    else if (heightPct.value < (initial + max) / 2) heightPct.value = initial
    else heightPct.value = max
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  return { heightPct, isDragging, onPointerDown }
}
```

- [ ] **Step 7: Run all composable tests**

```bash
npx vitest run src/composables/
```

Expected: PASS (5 tests across 3 files)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add useColorThief, useScrollHide, and useDraggableSheet composables"
```

---

## Task 11: Toast Notification System

**Files:**
- Create: `src/components/common/ToastContainer.vue`
- Create: `src/composables/useToast.ts` + test

- [ ] **Step 1: Write useToast test**

Create `src/composables/useToast.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { useToast, clearToasts, toasts } from './useToast'

describe('useToast', () => {
  it('adds a toast to the global list', () => {
    clearToasts()
    const { toast } = useToast()
    toast('File uploaded')
    expect(toasts.value.length).toBe(1)
    expect(toasts.value[0].message).toBe('File uploaded')
  })

  it('auto-removes toast after duration', async () => {
    clearToasts()
    vi.useFakeTimers()
    const { toast } = useToast()
    toast('msg', { duration: 1000 })
    expect(toasts.value.length).toBe(1)
    vi.advanceTimersByTime(1200)
    expect(toasts.value.length).toBe(0)
    vi.useRealTimers()
  })

  it('toastError sets type to error', () => {
    clearToasts()
    const { toastError } = useToast()
    toastError('Something went wrong')
    expect(toasts.value[0].type).toBe('error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/composables/useToast.test.ts
```

- [ ] **Step 3: Create `src/composables/useToast.ts`**

```typescript
import { ref } from 'vue'

export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

export const toasts = ref<Toast[]>([])
let nextId = 0

export function clearToasts() { toasts.value = [] }

export function useToast() {
  function toast(message: string, opts: { duration?: number; type?: Toast['type'] } = {}) {
    const id = ++nextId
    const type = opts.type ?? 'success'
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, opts.duration ?? 3000)
  }

  return {
    toast,
    toastError: (msg: string) => toast(msg, { type: 'error' }),
    toastInfo:  (msg: string) => toast(msg, { type: 'info' }),
  }
}
```

- [ ] **Step 4: Create `src/components/common/ToastContainer.vue`**

```vue
<template>
  <teleport to="body">
    <div class="toast-stack">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="`toast-${t.type}`"
        >
          <v-icon size="14" class="toast-icon">
            {{ t.type === 'error' ? 'mdi-alert-circle' : t.type === 'info' ? 'mdi-information' : 'mdi-check-circle' }}
          </v-icon>
          {{ t.message }}
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { toasts } from '@/composables/useToast'
</script>

<style scoped>
.toast-stack { position:fixed; bottom:72px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:8px; align-items:center; }
.toast-item {
  display:flex; align-items:center; gap:8px; padding:9px 16px;
  background:#1e1e1e; border:1px solid rgba(255,255,255,0.1);
  border-radius:20px; font-size:0.82rem; color:rgba(255,255,255,0.85);
  box-shadow:0 4px 20px rgba(0,0,0,0.5); white-space:nowrap;
}
.toast-success { border-left:3px solid #34d399; }
.toast-error   { border-left:3px solid #ef4444; }
.toast-info    { border-left:3px solid #5ba4f5; }
.toast-icon    { flex-shrink:0; }
.toast-enter-active, .toast-leave-active { transition:all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity:0; transform:translateY(12px); }
</style>
```

- [ ] **Step 5: Register ToastContainer in `src/App.vue`**

```vue
<template>
  <v-app>
    <router-view />
    <ToastContainer />
  </v-app>
</template>

<script setup lang="ts">
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npx vitest run src/composables/useToast.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add toast notification system"
```

---

## Task 12: Docker + nginx Proxy Setup

**Files:**
- Create: `nginx/nginx.conf`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.env.example`

- [ ] **Step 1: Create `nginx/nginx.conf`**

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;
  gzip          on;
  gzip_types    text/plain text/css application/json application/javascript text/xml application/xml;

  server {
    listen 80;
    root  /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
      try_files $uri $uri/ /index.html;
    }

    # ── ABS API proxy ──
    # Set ABS_HOST at container start via envsubst, e.g. http://abs:13378
    location /api/ {
      proxy_pass         ${ABS_HOST}/api/;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
      proxy_read_timeout 120s;
    }

    # ── ABS Socket.io proxy ──
    location /socket.io/ {
      proxy_pass         ${ABS_HOST}/socket.io/;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade    $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_set_header   Host       $host;
    }

    # ── ABS HLS stream proxy ──
    location /hls/ {
      proxy_pass       ${ABS_HOST}/hls/;
      proxy_set_header Host $host;
    }
  }
}
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
# ── Stage 1: build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: serve ──
FROM nginx:alpine
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf.template

# envsubst replaces ${ABS_HOST} at container start
CMD ["/bin/sh", "-c", \
  "envsubst '${ABS_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  abscond:
    build: .
    ports:
      - "${ABSCOND_PORT:-3080}:80"
    environment:
      # Point this at your ABS server's internal hostname:port
      # e.g. http://audiobookshelf:13378  OR  http://192.168.1.10:13378
      ABS_HOST: "${ABS_HOST:-http://audiobookshelf:13378}"
    volumes:
      # Mount your own config.json to override absHost at runtime
      # Leave absHost empty ("") to use the nginx proxy (recommended)
      - ./config.json:/usr/share/nginx/html/config.json:ro
    restart: unless-stopped
```

- [ ] **Step 4: Create `.env.example`**

```env
# Port to expose Abscond on (default 3080)
ABSCOND_PORT=3080

# Internal ABS server address — NOT publicly exposed
# Docker network: http://audiobookshelf:13378
# Local host:     http://host.docker.internal:13378
ABS_HOST=http://audiobookshelf:13378
```

- [ ] **Step 5: Create `.dockerignore`**

```
node_modules
dist
.git
docs
*.md
.env
.env.*
```

- [ ] **Step 6: Verify the build works**

```bash
cd /config/workspace/gh/abs-ui
npm run build
```

Expected: `dist/` directory created, no TypeScript errors.

If there are TS errors, fix them before continuing.

- [ ] **Step 7: Verify Docker build (if Docker is available)**

```bash
docker build -t abscond:dev . 2>&1 | tail -5
```

Expected: `Successfully built <hash>` or similar.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add Docker multi-stage build and nginx proxy config"
```

---

## Task 13: PWA Configuration

**Files:**
- Modify: `vite.config.ts` (already has VitePWA stub from Task 1)
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Generate placeholder PWA icons**

```bash
cd /config/workspace/gh/abs-ui/public
mkdir -p icons
# Create 192px placeholder (amber square with ◉)
node -e "
const { createCanvas } = require('canvas');
" 2>/dev/null || true

# Fallback: copy a simple placeholder if canvas not available
# Just create empty placeholder files so the build doesn't fail
touch public/icons/icon-192.png public/icons/icon-512.png
```

Note: Replace these with real icons before shipping. A proper icon set can be generated from an SVG using tools like `pwa-asset-generator` or `sharp`.

- [ ] **Step 2: Verify PWA plugin generates manifest**

```bash
npm run build && ls dist/
```

Expected: `manifest.webmanifest` present in `dist/`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: configure PWA manifest and service worker via vite-plugin-pwa"
```

---

## Task 14: Final Integration Check

- [ ] **Step 1: Run the full test suite**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run
```

Expected: All tests PASS. Note any failures and fix before continuing.

- [ ] **Step 2: Run the dev server and manually verify the login screen**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Verify:
- Login screen renders (server URL input visible)
- On desktop (window > 960px): split layout with left hero panel + carousel
- On mobile width (resize window < 960px): stacked layout with logo at top
- Entering a URL and clicking Continue shows "Could not reach server" error (expected — no real ABS server in dev)
- OIDC buttons do NOT appear (expected — server probe failed)

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Confirm Phase 1 complete**

Phase 1 delivers a deployable foundation:
- ✅ Vite + Vue 3 + Vuetify 3 + TypeScript project
- ✅ Dark M3 theme with Abscond design tokens
- ✅ Auth flow: server probe → OIDC or local login → JWT stored
- ✅ Responsive app shell: bottom nav (mobile) / side rail (tablet) / drawer (desktop)
- ✅ Socket.io client wired to auth
- ✅ useColorThief, useScrollHide, useDraggableSheet composables
- ✅ Toast notification system
- ✅ Docker + nginx proxy (ABS stays private)
- ✅ PWA manifest + service worker
- ✅ 20+ unit tests passing

**Phase 2** will build the core listening experience: Home screen, Library grid, Player, and Book Detail sheet.

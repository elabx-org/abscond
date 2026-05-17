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
        <AppLogo :size="22" color="rgba(134,59,255,0.7)" />
        <span class="logo-name">ABSCOND</span>
      </div>

      <div class="hero-center">
        <div class="carousel-frame">
          <transition :name="slideDir" mode="out-in">
            <div :key="currentSlide" class="carousel-phone">
              <div class="phone-screen" :class="`slide-${currentSlide}`" />
            </div>
          </transition>
        </div>
        <div class="carousel-dots">
          <button v-for="(_, i) in slideCaptions" :key="i"
            class="dot" :class="{ active: i === currentSlide }"
            @click="goToSlide(i)" />
        </div>
        <p class="carousel-caption">{{ slideCaptions[currentSlide] }}</p>
      </div>

      <p class="hero-foot">Escape into your library</p>
    </div>

    <!-- ── RIGHT FORM ── -->
    <div class="form-panel">
      <!-- Mobile logo -->
      <div class="mobile-logo d-md-none">
        <AppLogo :size="44" color="rgba(134,59,255,0.7)" animated="breathe" />
        <span class="logo-name logo-name--lg">ABSCOND</span>
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
          <p class="form-sub server-url-hint" :class="{ 'no-click': isProxyMode }" @click="!isProxyMode && resetProbe()">
            {{ isProxyMode ? 'Connected via proxy' : serverUrl }}
            <span v-if="!isProxyMode" class="change-link">change</span>
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
              <AppIcon icon="mdi-login" start />
              Continue with {{ p.name }}
            </v-btn>

            <p class="local-toggle" @click="showLocalAuth = !showLocalAuth">
              {{ showLocalAuth ? 'Hide password login' : 'Use password instead' }}
            </p>
          </template>

          <!-- Local auth (always visible when no OIDC, collapsible otherwise) -->
          <template v-if="!oidcProviders.length || showLocalAuth">
            <div v-if="oidcProviders.length" class="divider-row">
              <v-divider /><span class="divider-text">or</span><v-divider />
            </div>

            <v-text-field
              v-model="username"
              data-testid="username"
              label="Username"
              autocomplete="username"
            />
            <v-text-field
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

          <v-alert v-if="loginError && oidcProviders.length && !showLocalAuth" type="error" variant="tonal" class="mb-4" density="compact">
            {{ loginError }}
          </v-alert>
        </template>
      </div>

      <!-- Debug log: shown on next launch when prior auth attempt left entries -->
      <div v-if="debugLogText" class="debug-log">
        <div class="debug-log-header">
          <span>Auth Debug Log</span>
          <button class="debug-clear-btn" @click="clearLog">Clear</button>
        </div>
        <pre class="debug-log-body">{{ debugLogText }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, type AbsUser } from '@/stores/auth'
import { fetchStatus, login } from '@/api/auth'
import { isNativeApp, resetBaseUrl } from '@/api/client'
import { openNativeAuth, getDebugLog, clearDebugLog } from '@/plugins/haptics-bridge'
import { connectSocket } from '@/api/socket'
import { getBaseUrl } from '@/api/client'

const router = useRouter()
const auth   = useAuthStore()

/* ─── Server probe ─── */
const serverUrl     = ref('')
const probing       = ref(false)
const probeSuccess  = ref(false)
const probeError    = ref('')
const serverProbed  = ref(false)
const isProxyMode   = ref(false)
const oidcProviders = ref<{ id: string; name: string }[]>([])
const showLocalAuth = ref(false)

async function probeServer() {
  if (!serverUrl.value) return
  probing.value = true
  probeError.value = ''
  try {
    const status = await fetchStatus(serverUrl.value)
    if (!status.isInit) throw new Error('Server not initialised.')
    probeSuccess.value = true
    serverProbed.value = true
    if (status.authMethods.includes('openid')) {
      oidcProviders.value = [{ id: 'openid', name: 'SSO' }]
    }
    if (isNativeApp()) resetBaseUrl(serverUrl.value)
  } catch (e: any) {
    probeError.value = e?.message || 'Could not reach server. Check the URL and try again.'
  } finally {
    probing.value = false
  }
}

function resetProbe() {
  serverProbed.value = false
  probeSuccess.value = false
  oidcProviders.value = []
  showLocalAuth.value = false
}

function base64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function startOidc(provider: { id: string }) {
  // In proxy mode route through nginx: session cookie stays on this origin so
  // the code exchange works without cross-origin cookie restrictions (iOS ITP).
  // In standalone mode talk to the ABS server directly.
  const absBase = isProxyMode.value ? '' : serverUrl.value

  const verifier  = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const hashBuf   = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64url(new Uint8Array(hashBuf))
  const state     = base64url(crypto.getRandomValues(new Uint8Array(16)))

  // audiobookshelf://oauth is ABS's default-whitelisted mobile redirect URI —
  // no ABS admin config needed. ASWebAuthenticationSession intercepts this
  // callback natively before iOS can route it to any other installed app.
  const redirect_uri = isNativeApp()
    ? 'audiobookshelf://oauth'
    : `${window.location.origin}/auth/callback`

  const params = new URLSearchParams({
    response_type:         'code',
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    redirect_uri,
    client_id:             'Abscond',
    state,
  })
  const authUrl = `${absBase}/auth/${provider.id}?${params}`

  if (isNativeApp()) {
    // Native: Swift owns the whole flow (pre-flight cookie capture, popup,
    // code exchange) and resolves with the ABS token JSON. No localStorage
    // PKCE round-trip is needed because Swift never leaves the same flow.
    try {
      const tokenJson: string = await openNativeAuth(authUrl, verifier, state)
      const data = JSON.parse(tokenJson)
      const accessToken: string = data?.user?.token ?? data?.user?.accessToken
      if (!accessToken) throw new Error('No token in server response.')
      const u = data.user
      const user: AbsUser = {
        id:          u.id ?? '',
        username:    u.username ?? '',
        isAdminOrUp: !!(u.isAdminOrUp || u.type === 'root' || u.type === 'admin'),
        token:       accessToken,
      }
      auth.setSession(accessToken, user)
      const raw = await getBaseUrl()
      const baseHost = raw === '/api' ? '' : raw.replace(/\/api$/, '')
      connectSocket(baseHost, accessToken)
      router.push({ name: 'home' })
    } catch (e: any) {
      const msg: string = e?.message ?? e?.errorMessage ?? (typeof e === 'string' ? e : 'Unknown error')
      if (msg !== 'cancelled') loginError.value = `SSO failed: ${msg}`
    }
  } else {
    // Web flow needs the PKCE verifier/state to survive the redirect dance,
    // so stash them and let AuthCallbackView pick them up after the callback.
    sessionStorage.setItem('oidc_verifier', verifier)
    sessionStorage.setItem('oidc_state',    state)
    sessionStorage.setItem('oidc_abs_base', absBase)
    window.location.href = authUrl
  }
}

/* ─── Login ─── */
const username   = ref('')
const password   = ref('')
const loggingIn  = ref(false)
const loginError = ref('')
const debugLogText = ref('')

async function submit() {
  loggingIn.value = true
  loginError.value = ''
  try {
    const result = await login(username.value, password.value)
    auth.setSession(result.user.token, result.user)
    const raw = await getBaseUrl()
    const baseHost = serverUrl.value || (raw.endsWith('/api') ? raw.slice(0, -4) : raw)
    connectSocket(baseHost, result.user.token)
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

let timer: ReturnType<typeof setInterval>
onMounted(async () => {
  if (isNativeApp()) {
    // In Capacitor, /config.json has no absHost so getBaseUrl() always returns
    // '/api'. Skip proxy-mode entirely and show the server URL input instead.
    // If the user previously connected, restore the host and re-probe (picks up SSO).
    const savedHost = localStorage.getItem('abs_host')
    if (savedHost) {
      serverUrl.value = savedHost
      await probeServer()
    }
    try {
      const log = await getDebugLog()
      if (log) debugLogText.value = log
    } catch { /* non-critical */ }
    timer = setInterval(() => goToSlide((currentSlide.value + 1) % slideCaptions.length), 4000)
    return
  }

  // resolveBaseUrl returns '/api' only when absHost is empty (proxy mode).
  // nginx proxies /status → ABS, so we can detect OIDC without knowing the host.
  const base = await getBaseUrl()
  if (base === '/api') {
    isProxyMode.value = true
    serverProbed.value = true
    probeSuccess.value = true
    try {
      const res = await fetch('/status')
      if (res.ok) {
        const status = await res.json()
        if (status.authMethods?.includes('openid')) {
          oidcProviders.value = [{ id: 'openid', name: 'SSO' }]
        }
      }
    } catch { /* non-critical — login form still works */ }
  }
  timer = setInterval(() => goToSlide((currentSlide.value + 1) % slideCaptions.length), 4000)
})
onBeforeUnmount(() => clearInterval(timer))

function clearLog() {
  clearDebugLog()
  debugLogText.value = ''
}

function goToSlide(n: number) {
  slideDir.value = n > currentSlide.value ? 'slide-left' : 'slide-right'
  currentSlide.value = n
}
</script>

<style scoped>
.login-root { display:flex; height:100dvh; min-height:560px; background:#060606; }

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

.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active { transition:all 0.45s ease; }
.slide-left-enter-from  { opacity:0; transform:translateX(16px) scale(0.97); }
.slide-left-leave-to    { opacity:0; transform:translateX(-16px) scale(0.97); }
.slide-right-enter-from { opacity:0; transform:translateX(-16px) scale(0.97); }
.slide-right-leave-to   { opacity:0; transform:translateX(16px) scale(0.97); }

/* Logo */
.logo-name { font-size:9px; font-weight:300; letter-spacing:4px; color:rgba(255,255,255,0.3); text-transform:uppercase; }
.logo-name--lg { font-size:11px; letter-spacing:5px; color:rgba(255,255,255,0.4); }

/* Form panel */
.form-panel {
  flex:1; background:#0e0e0e;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:2.5rem; overflow-y:auto;
  position:relative; z-index:1;
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
.server-url-hint.no-click { cursor:default; }
.change-link { color:#d4a017; font-weight:600; margin-left:6px; }
.oidc-btn { border-color:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.7) !important; }
.local-toggle { font-size:0.75rem; color:rgba(255,255,255,0.3); text-align:center; margin:0.75rem 0 0; cursor:pointer; }
.local-toggle:hover { color:rgba(255,255,255,0.55); }
.divider-row { display:flex; align-items:center; gap:10px; margin:0.75rem 0; }
.divider-text { font-size:0.68rem; color:rgba(255,255,255,0.2); white-space:nowrap; }

.debug-log {
  width:100%; max-width:480px; margin-top:1.5rem;
  border:1px solid rgba(255,180,0,0.2); border-radius:8px; overflow:hidden;
}
.debug-log-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:0.4rem 0.75rem;
  background:rgba(255,180,0,0.08);
  font-size:0.7rem; color:rgba(255,180,0,0.6); font-weight:600; letter-spacing:0.5px;
}
.debug-clear-btn {
  font-size:0.65rem; color:rgba(255,180,0,0.5); background:none; border:none;
  cursor:pointer; padding:0 0.25rem;
}
.debug-clear-btn:hover { color:rgba(255,180,0,0.9); }
.debug-log-body {
  margin:0; padding:0.6rem 0.75rem;
  font-size:0.58rem; line-height:1.5;
  color:rgba(255,255,255,0.45);
  white-space:pre-wrap; word-break:break-all;
  max-height:200px; overflow-y:auto;
  background:rgba(0,0,0,0.3);
}
</style>

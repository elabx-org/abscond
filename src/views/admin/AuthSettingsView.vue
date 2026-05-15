<template>
  <div class="admin-auth">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 5" :key="n" class="skel-row" />
    </div>

    <div v-else-if="loadError" class="error-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-alert-circle-outline</v-icon>
      <p>Failed to load auth settings</p>
      <button class="retry-btn" @click="loadSettings">Retry</button>
    </div>

    <div v-else-if="settings" class="settings-content">
      <div class="settings-group">
        <p class="group-label">Login</p>

        <div class="setting-row stacked">
          <div class="setting-info">
            <p class="setting-name">Custom login message</p>
            <p class="setting-desc">Shown on the login page below the form</p>
          </div>
          <textarea
            v-model="settings.authLoginCustomMessage"
            rows="4"
            class="form-textarea"
            placeholder="Welcome! Please log in."
            @input="dirty = true"
          />
        </div>
      </div>

      <div class="settings-group">
        <p class="group-label">Auth Methods</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Local (username/password)</p>
            <p class="setting-desc">Always enabled</p>
          </div>
          <button class="toggle on" disabled>
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">OpenID Connect</p>
          </div>
          <button
            class="toggle"
            :class="{ on: openidEnabled }"
            @click="toggleOpenID"
          >
            <div class="toggle-thumb" />
          </button>
        </div>
      </div>

      <div v-if="openidEnabled" class="settings-group">
        <p class="group-label">OpenID Connect</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Issuer URL</p>
          </div>
          <input
            v-model="settings.authOpenIDIssuerURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Authorization URL</p>
          </div>
          <input
            v-model="settings.authOpenIDAuthorizationURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com/oauth/authorize"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Token URL</p>
          </div>
          <input
            v-model="settings.authOpenIDTokenURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com/oauth/token"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">User Info URL</p>
          </div>
          <input
            v-model="settings.authOpenIDUserInfoURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com/userinfo"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">JWKS URL</p>
          </div>
          <input
            v-model="settings.authOpenIDJwksURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com/.well-known/jwks.json"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Logout URL</p>
          </div>
          <input
            v-model="settings.authOpenIDLogoutURL"
            type="text"
            class="form-input oidc-input"
            placeholder="https://accounts.example.com/logout"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Client ID</p>
          </div>
          <input
            v-model="settings.authOpenIDClientID"
            type="text"
            class="form-input oidc-input"
            placeholder="my-client-id"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Client Secret</p>
          </div>
          <input
            v-model="settings.authOpenIDClientSecret"
            type="password"
            class="form-input oidc-input"
            placeholder="••••••••"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Button Text</p>
          </div>
          <input
            v-model="settings.authOpenIDButtonText"
            type="text"
            class="form-input oidc-input"
            placeholder="Login with SSO"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Auto launch</p>
          </div>
          <button
            class="toggle"
            :class="{ on: settings.authOpenIDAutoLaunch }"
            @click="toggleBool('authOpenIDAutoLaunch')"
          >
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Auto register</p>
          </div>
          <button
            class="toggle"
            :class="{ on: settings.authOpenIDAutoRegister }"
            @click="toggleBool('authOpenIDAutoRegister')"
          >
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Match existing by</p>
          </div>
          <select
            v-model="settings.authOpenIDMatchExistingBy"
            class="setting-select"
            @change="dirty = true"
          >
            <option :value="null">Disabled</option>
            <option value="email">Email</option>
            <option value="username">Username</option>
          </select>
        </div>
      </div>

      <button
        class="save-btn"
        :disabled="saving || !dirty"
        @click="doSave"
      >
        {{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAuthSettings, updateAuthSettings } from '@/api/admin'
import type { AuthSettings } from '@/api/admin'

const loading   = ref(true)
const loadError = ref(false)
const saving    = ref(false)
const dirty     = ref(false)

const settings = ref<{
  authLoginCustomMessage: string
  authActiveAuthMethods: string[]
  authOpenIDIssuerURL: string
  authOpenIDAuthorizationURL: string
  authOpenIDTokenURL: string
  authOpenIDUserInfoURL: string
  authOpenIDJwksURL: string
  authOpenIDLogoutURL: string
  authOpenIDClientID: string
  authOpenIDClientSecret: string
  authOpenIDButtonText: string
  authOpenIDAutoLaunch: boolean
  authOpenIDAutoRegister: boolean
  authOpenIDMatchExistingBy: string | null
} | null>(null)

const openidEnabled = computed(
  () => settings.value?.authActiveAuthMethods.includes('openid') ?? false
)

function toggleOpenID() {
  if (!settings.value) return
  const methods = settings.value.authActiveAuthMethods
  const idx = methods.indexOf('openid')
  if (idx >= 0) {
    settings.value.authActiveAuthMethods = methods.filter((m) => m !== 'openid')
  } else {
    settings.value.authActiveAuthMethods = [...methods, 'openid']
  }
  dirty.value = true
}

function toggleBool(key: 'authOpenIDAutoLaunch' | 'authOpenIDAutoRegister') {
  if (!settings.value) return
  settings.value[key] = !settings.value[key]
  dirty.value = true
}

function mapSettings(raw: AuthSettings) {
  settings.value = {
    authLoginCustomMessage:      raw.authLoginCustomMessage      ?? '',
    authActiveAuthMethods:       raw.authActiveAuthMethods       ?? [],
    authOpenIDIssuerURL:         raw.authOpenIDIssuerURL         ?? '',
    authOpenIDAuthorizationURL:  raw.authOpenIDAuthorizationURL  ?? '',
    authOpenIDTokenURL:          raw.authOpenIDTokenURL          ?? '',
    authOpenIDUserInfoURL:       raw.authOpenIDUserInfoURL       ?? '',
    authOpenIDJwksURL:           raw.authOpenIDJwksURL           ?? '',
    authOpenIDLogoutURL:         raw.authOpenIDLogoutURL         ?? '',
    authOpenIDClientID:          raw.authOpenIDClientID          ?? '',
    authOpenIDClientSecret:      raw.authOpenIDClientSecret      ?? '',
    authOpenIDButtonText:        raw.authOpenIDButtonText        ?? '',
    authOpenIDAutoLaunch:        raw.authOpenIDAutoLaunch,
    authOpenIDAutoRegister:      raw.authOpenIDAutoRegister,
    authOpenIDMatchExistingBy:   raw.authOpenIDMatchExistingBy,
  }
}

async function loadSettings() {
  loading.value   = true
  loadError.value = false
  try {
    const raw = await getAuthSettings()
    mapSettings(raw)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function doSave() {
  if (!settings.value) return
  saving.value = true
  try {
    await updateAuthSettings({
      authLoginCustomMessage:     settings.value.authLoginCustomMessage     || null,
      authActiveAuthMethods:      settings.value.authActiveAuthMethods,
      authOpenIDIssuerURL:        settings.value.authOpenIDIssuerURL        || null,
      authOpenIDAuthorizationURL: settings.value.authOpenIDAuthorizationURL || null,
      authOpenIDTokenURL:         settings.value.authOpenIDTokenURL         || null,
      authOpenIDUserInfoURL:      settings.value.authOpenIDUserInfoURL      || null,
      authOpenIDJwksURL:          settings.value.authOpenIDJwksURL          || null,
      authOpenIDLogoutURL:        settings.value.authOpenIDLogoutURL        || null,
      authOpenIDClientID:         settings.value.authOpenIDClientID         || null,
      authOpenIDClientSecret:     settings.value.authOpenIDClientSecret     || null,
      authOpenIDButtonText:       settings.value.authOpenIDButtonText       || null,
      authOpenIDAutoLaunch:       settings.value.authOpenIDAutoLaunch,
      authOpenIDAutoRegister:     settings.value.authOpenIDAutoRegister,
      authOpenIDMatchExistingBy:  settings.value.authOpenIDMatchExistingBy,
    })
    dirty.value = false
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.admin-auth { padding: 4px 0; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 56px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.error-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.retry-btn {
  padding: 8px 24px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(212,160,23,0.12); color: #d4a017; font-size: 13px; font-weight: 600;
}

.settings-content { display: flex; flex-direction: column; gap: 24px; }
.settings-group { display: flex; flex-direction: column; }
.group-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 8px;
}

.setting-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.setting-row.stacked { flex-direction: column; align-items: stretch; }
.setting-row:last-child { border-bottom: none; }
.setting-info { flex: 1; min-width: 0; }
.setting-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.setting-desc { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.form-input {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; width: 100%; box-sizing: border-box;
}

.form-textarea {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; width: 100%; box-sizing: border-box;
  min-height: 80px; resize: vertical; font-family: inherit;
}

.oidc-input { max-width: 220px; flex-shrink: 0; width: 220px; }

.toggle {
  width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0; transition: background 0.2s;
}
.toggle.on { background: #d4a017; }
.toggle:disabled { cursor: not-allowed; opacity: 0.7; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 22px; }

.setting-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 10px; font-size: 12px;
  color: rgba(255,255,255,0.8); outline: none; cursor: pointer; flex-shrink: 0;
  appearance: none;
}

.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (min-width: 768px) {
  .settings-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .save-btn { grid-column: 1 / -1; max-width: 320px; }
}
</style>

<template>
  <div class="admin-email">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 6" :key="n" class="skel-row" />
    </div>

    <div v-else-if="loadError" class="error-state">
      <AppIcon icon="mdi-alert-circle-outline" :size="36" color="rgba(255,255,255,0.15)" />
      <p>Failed to load email settings</p>
      <button class="retry-btn" @click="loadSettings">Retry</button>
    </div>

    <div v-else-if="settings" class="settings-content">
      <div class="settings-group">
        <p class="group-label">SMTP Server</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Host</p>
          </div>
          <input
            v-model="settings.host"
            type="text"
            class="form-input inline-input"
            placeholder="smtp.example.com"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Port</p>
          </div>
          <input
            v-model.number="settings.port"
            type="number"
            min="1"
            max="65535"
            class="form-input inline-input port-input"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Secure (TLS)</p>
          </div>
          <button class="toggle" :class="{ on: settings.secure }" @click="toggleBool('secure')">
            <div class="toggle-thumb" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Reject unauthorized</p>
          </div>
          <button class="toggle" :class="{ on: settings.rejectUnauthorized }" @click="toggleBool('rejectUnauthorized')">
            <div class="toggle-thumb" />
          </button>
        </div>
      </div>

      <div class="settings-group">
        <p class="group-label">Authentication</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Username</p>
          </div>
          <input
            v-model="settings.user"
            type="text"
            class="form-input inline-input"
            placeholder="user@example.com"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Password</p>
          </div>
          <div class="pass-wrap">
            <input
              v-model="settings.pass"
              :type="showPass ? 'text' : 'password'"
              class="form-input inline-input"
              placeholder="••••••••"
              @input="dirty = true"
            />
            <button class="eye-btn" @click="showPass = !showPass" type="button">
              <AppIcon :icon="showPass ? 'mdi-eye-off' : 'mdi-eye'" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <p class="group-label">Addresses</p>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">From address</p>
          </div>
          <input
            v-model="settings.fromAddress"
            type="email"
            class="form-input inline-input"
            placeholder="noreply@example.com"
            @input="dirty = true"
          />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Test recipient</p>
          </div>
          <input
            v-model="settings.testAddress"
            type="email"
            class="form-input inline-input"
            placeholder="you@example.com"
            @input="dirty = true"
          />
        </div>
      </div>

      <div class="actions">
        <button
          class="test-btn"
          :disabled="testing || !settings.testAddress"
          @click="doTest"
        >
          {{ testing ? 'Sending…' : 'Test Email' }}
        </button>

        <span v-if="testStatus === 'success'" class="feedback-chip success">Test sent</span>
        <span v-else-if="testStatus === 'error'" class="feedback-chip fail">Test failed</span>

        <button
          class="save-btn"
          :disabled="saving || !dirty"
          @click="doSave"
        >
          {{ saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, ref } from 'vue'
import { getEmailSettings, updateEmailSettings, sendTestEmail } from '@/api/admin'
import type { EmailSettings } from '@/api/admin'

type TestStatus = 'idle' | 'success' | 'error'

const loading   = ref(true)
const loadError = ref(false)
const saving    = ref(false)
const testing   = ref(false)
const dirty     = ref(false)
const showPass  = ref(false)
const testStatus = ref<TestStatus>('idle')

const settings = ref<{
  host: string
  port: number
  secure: boolean
  rejectUnauthorized: boolean
  user: string
  pass: string
  fromAddress: string
  testAddress: string
} | null>(null)

function toggleBool(key: 'secure' | 'rejectUnauthorized') {
  if (!settings.value) return
  settings.value[key] = !settings.value[key]
  dirty.value = true
}

function mapSettings(raw: EmailSettings) {
  settings.value = {
    host:               raw.host               ?? '',
    port:               raw.port               ?? 465,
    secure:             raw.secure,
    rejectUnauthorized: raw.rejectUnauthorized,
    user:               raw.user               ?? '',
    pass:               raw.pass               ?? '',
    fromAddress:        raw.fromAddress        ?? '',
    testAddress:        raw.testAddress        ?? '',
  }
}

async function loadSettings() {
  loading.value   = true
  loadError.value = false
  try {
    const raw = await getEmailSettings()
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
    await updateEmailSettings({
      host:               settings.value.host               || null,
      port:               settings.value.port,
      secure:             settings.value.secure,
      rejectUnauthorized: settings.value.rejectUnauthorized,
      user:               settings.value.user               || null,
      pass:               settings.value.pass               || null,
      fromAddress:        settings.value.fromAddress        || null,
      testAddress:        settings.value.testAddress        || null,
    })
    dirty.value = false
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}

async function doTest() {
  testing.value    = true
  testStatus.value = 'idle'
  try {
    await sendTestEmail()
    testStatus.value = 'success'
  } catch {
    testStatus.value = 'error'
  } finally {
    testing.value = false
    setTimeout(() => { testStatus.value = 'idle' }, 3000)
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.admin-email { padding: 4px 0; }

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
.setting-row:last-child { border-bottom: none; }
.setting-info { flex: 1; min-width: 0; }
.setting-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0; }

.form-input {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; width: 100%; box-sizing: border-box;
}

.inline-input { width: 220px; flex-shrink: 0; }
.port-input   { width: 96px; }

.pass-wrap { position: relative; flex-shrink: 0; width: 220px; }
.pass-wrap .form-input { width: 100%; padding-right: 38px; }
.eye-btn {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); padding: 0; display: flex; align-items: center;
}

.toggle {
  width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0; transition: background 0.2s;
}
.toggle.on { background: #d4a017; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 22px; }

.actions {
  display: flex; flex-direction: column; gap: 10px; padding-top: 4px;
}

.test-btn {
  width: 100%; padding: 12px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600;
  background: transparent; border: 1px solid rgba(212,160,23,0.4); color: #d4a017; transition: opacity 0.15s;
}
.test-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.feedback-chip {
  display: inline-block; align-self: center; padding: 4px 12px;
  border-radius: 20px; font-size: 12px; font-weight: 600;
}
.feedback-chip.success { background: rgba(34,197,94,0.15); color: #22c55e; }
.feedback-chip.fail    { background: rgba(239,68,68,0.15);  color: #ef4444; }

.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (min-width: 768px) {
  .settings-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .actions { grid-column: 1 / -1; max-width: 480px; }
  .save-btn { max-width: 320px; align-self: flex-start; }
}
</style>

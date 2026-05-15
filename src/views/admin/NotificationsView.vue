<template>
  <div class="notifications-view">
    <div v-if="loading" class="loading-state">
      <div v-for="n in 4" :key="n" class="skel-row" />
    </div>

    <template v-else>
      <!-- Apprise URL card -->
      <div class="settings-group">
        <p class="group-label">Apprise Server</p>
        <div class="apprise-card">
          <p class="apprise-desc">Enter an Apprise API URL to send notifications via email, Slack, Telegram, and 80+ other services.</p>
          <input
            v-model="appriseUrl"
            class="form-input"
            placeholder="http://apprise-api:8000/notify/abs"
            type="url"
          />
          <button class="save-btn" :disabled="savingUrl || appriseUrl === savedAppriseUrl" @click="doSaveUrl">
            {{ savingUrl ? 'Saving…' : 'Save URL' }}
          </button>
          <p v-if="urlSuccess" class="success-msg">
            <v-icon size="14" color="#22c55e">mdi-check</v-icon> Saved
          </p>
        </div>
      </div>

      <!-- Notification events -->
      <div class="settings-group">
        <p class="group-label">Events</p>

        <div v-if="!events.length" class="empty-state">
          <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-bell-off-outline</v-icon>
          <p>No notification events configured on this server.</p>
          <p class="empty-sub">Apprise URL must be set first.</p>
        </div>

        <div v-else class="event-list">
          <div v-for="ev in events" :key="ev.id" class="event-row">
            <div class="event-info">
              <p class="event-name">{{ formatEventName(ev.eventName) }}</p>
              <p v-if="ev.lastFiredAt" class="event-sub">Last fired {{ formatDate(ev.lastFiredAt) }}</p>
              <p v-else class="event-sub">Never fired</p>
            </div>
            <div class="event-controls">
              <button
                class="test-chip"
                :disabled="testingId === ev.id || !appriseUrl"
                @click="doTest(ev.id)"
                title="Send a test notification"
              >
                <v-icon size="12">{{ testingId === ev.id ? 'mdi-loading' : 'mdi-send-outline' }}</v-icon>
                Test
              </button>
              <div
                class="toggle"
                :class="{ on: ev.enabled }"
                @click="doToggle(ev)"
              >
                <div class="toggle-thumb" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  patchNotification,
  testNotification,
} from '@/api/admin/index'
import type { NotificationEvent } from '@/api/admin/index'

const loading         = ref(true)
const appriseUrl      = ref('')
const savedAppriseUrl = ref('')
const savingUrl       = ref(false)
const urlSuccess      = ref(false)
const events          = ref<NotificationEvent[]>([])
const testingId       = ref<string | null>(null)

function formatEventName(name: string): string {
  return name
    .replace(/^on/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function doSaveUrl() {
  savingUrl.value = true
  urlSuccess.value = false
  try {
    await updateNotificationSettings({ appriseApiUrl: appriseUrl.value.trim() || null })
    savedAppriseUrl.value = appriseUrl.value
    urlSuccess.value = true
    setTimeout(() => { urlSuccess.value = false }, 3000)
  } catch { /* ignore */ }
  finally { savingUrl.value = false }
}

async function doToggle(ev: NotificationEvent) {
  const newVal = !ev.enabled
  ev.enabled = newVal
  try {
    await patchNotification(ev.id, { enabled: newVal })
  } catch {
    ev.enabled = !newVal
  }
}

async function doTest(id: string) {
  testingId.value = id
  try {
    await testNotification(id)
  } catch { /* ignore — test fires even if it throws */ }
  finally { testingId.value = null }
}

onMounted(async () => {
  loading.value = true
  try {
    const [nSettings, evs] = await Promise.all([
      getNotificationSettings().catch(() => ({})),
      getNotifications().catch(() => []),
    ])
    appriseUrl.value      = nSettings.appriseApiUrl ?? ''
    savedAppriseUrl.value = appriseUrl.value
    events.value          = evs
  } finally { loading.value = false }
})
</script>

<style scoped>
.notifications-view { padding: 4px 0; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 64px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.settings-group { margin-bottom: 24px; }
.group-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px;
}

.apprise-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.apprise-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.5; }
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; box-sizing: border-box;
}
.save-btn {
  align-self: flex-start; padding: 8px 20px; border-radius: 10px; border: none; cursor: pointer;
  background: #d4a017; color: #111; font-size: 13px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.success-msg { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #22c55e; margin: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 32px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.empty-sub { font-size: 11px; color: rgba(255,255,255,0.25); margin: 0; }

.event-list { display: flex; flex-direction: column; }
.event-row {
  display: flex; align-items: center; gap: 12px; padding: 13px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.event-row:last-child { border-bottom: none; }
.event-info { flex: 1; }
.event-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.event-sub  { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
.event-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.test-chip {
  display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600;
  padding: 5px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer; white-space: nowrap;
}
.test-chip:disabled { opacity: 0.4; cursor: not-allowed; }

.toggle {
  width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.12); position: relative; flex-shrink: 0;
  transition: background 0.2s;
}
.toggle.on { background: #d4a017; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 22px; }

@media (min-width: 768px) {
  .apprise-card { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
  .apprise-desc { flex-basis: 100%; }
  .form-input { flex: 1; }
}
</style>

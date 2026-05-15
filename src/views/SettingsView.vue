<template>
  <div class="settings-view">
    <h2 class="screen-title">Settings</h2>

    <!-- Account -->
    <section class="settings-section">
      <p class="section-label">Account</p>

      <div class="settings-card">
        <div class="account-row">
          <div class="avatar">
            <v-icon size="28" color="rgba(255,255,255,0.6)">mdi-account</v-icon>
          </div>
          <div class="account-meta">
            <p class="account-name">{{ auth.user?.username ?? '—' }}</p>
            <p class="account-role">{{ auth.isAdmin ? 'Admin' : 'User' }}</p>
          </div>
        </div>
      </div>

      <div class="settings-item" @click="confirmLogout = true">
        <v-icon size="18" color="#ef4444">mdi-logout</v-icon>
        <span class="item-label" style="color:#ef4444">Sign out</span>
      </div>
    </section>

    <!-- Playback -->
    <section class="settings-section">
      <p class="section-label">Playback</p>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-speedometer</v-icon>
        <span class="item-label">Default speed</span>
        <span class="item-value">{{ playbackRate }}×</span>
      </div>
      <div class="speed-slider-wrap">
        <input
          v-model.number="playbackRate"
          type="range" min="0.5" max="3" step="0.25"
          class="speed-slider"
          @change="savePlaybackRate"
        />
        <div class="slider-ticks">
          <span>0.5×</span><span>1×</span><span>1.5×</span><span>2×</span><span>3×</span>
        </div>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-skip-backward</v-icon>
        <span class="item-label">Skip back interval</span>
        <span class="item-value">{{ skipBackSecs }}s</span>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-skip-forward</v-icon>
        <span class="item-label">Skip forward interval</span>
        <span class="item-value">{{ skipFwdSecs }}s</span>
      </div>
    </section>

    <!-- Server -->
    <section class="settings-section">
      <p class="section-label">Server</p>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-server</v-icon>
        <span class="item-label">ABS Server</span>
        <span class="item-value server-url">{{ serverUrl }}</span>
      </div>

      <div class="settings-item">
        <v-icon size="18" :color="socketConnected ? '#22c55e' : '#ef4444'">
          {{ socketConnected ? 'mdi-circle' : 'mdi-circle-outline' }}
        </v-icon>
        <span class="item-label">Connection</span>
        <span class="item-value" :style="{ color: socketConnected ? '#22c55e' : '#ef4444' }">
          {{ socketConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </section>

    <!-- Library -->
    <section class="settings-section" v-if="lib.libraries.length > 1">
      <p class="section-label">Library</p>
      <div
        v-for="l in lib.libraries"
        :key="l.id"
        class="settings-item"
        @click="lib.setActiveLibrary(l.id)"
      >
        <v-icon size="18" color="rgba(255,255,255,0.5)">
          {{ l.mediaType === 'podcast' ? 'mdi-podcast' : 'mdi-bookshelf' }}
        </v-icon>
        <span class="item-label">{{ l.name }}</span>
        <v-icon v-if="lib.activeLibraryId === l.id" size="16" color="#d4a017">mdi-check</v-icon>
      </div>
    </section>

    <!-- About -->
    <section class="settings-section">
      <p class="section-label">About</p>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-information-outline</v-icon>
        <span class="item-label">Version</span>
        <span class="item-value">1.0.0</span>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-github</v-icon>
        <span class="item-label">Source code</span>
        <v-icon size="14" color="rgba(255,255,255,0.25)">mdi-open-in-new</v-icon>
      </div>
    </section>

    <!-- Navigate -->
    <section class="settings-section">
      <p class="section-label">More</p>
      <div class="settings-item" @click="router.push({ name: 'stats' })">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-chart-bar</v-icon>
        <span class="item-label">Listening Stats</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
      <div class="settings-item" @click="router.push({ name: 'collections' })">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-bookmark-multiple-outline</v-icon>
        <span class="item-label">Collections</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
      <div class="settings-item" @click="router.push({ name: 'playlists' })">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-playlist-music</v-icon>
        <span class="item-label">Playlists</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
      <div class="settings-item" @click="router.push({ name: 'browse' })">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-compass-outline</v-icon>
        <span class="item-label">Browse</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
    </section>

    <!-- Admin link -->
    <div v-if="auth.isAdmin" class="admin-link-wrap">
      <button class="admin-link" @click="router.push({ name: 'admin-libraries' })">
        <v-icon size="18">mdi-shield-crown-outline</v-icon>
        Admin Panel
        <v-icon size="16" color="rgba(255,255,255,0.3)">mdi-chevron-right</v-icon>
      </button>
    </div>

    <!-- Logout confirmation -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmLogout" class="confirm-backdrop" @click.self="confirmLogout = false">
          <div class="confirm-sheet">
            <p class="confirm-title">Sign out?</p>
            <p class="confirm-sub">You'll need to sign in again to access your library.</p>
            <div class="confirm-btns">
              <button class="confirm-cancel" @click="confirmLogout = false">Cancel</button>
              <button class="confirm-logout" @click="doLogout">Sign out</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'

const router  = useRouter()
const auth    = useAuthStore()
const lib     = useLibraryStore()
const player  = usePlayerStore()

const confirmLogout  = ref(false)
const socketConnected = ref(false)
const serverUrl = localStorage.getItem('abs_base_url') ?? '/api'

const playbackRate = ref<number>(
  parseFloat(localStorage.getItem('abs_playback_rate') ?? '1')
)
const skipBackSecs = ref<number>(
  parseInt(localStorage.getItem('abs_skip_back') ?? '30')
)
const skipFwdSecs = ref<number>(
  parseInt(localStorage.getItem('abs_skip_fwd') ?? '30')
)

function savePlaybackRate() {
  localStorage.setItem('abs_playback_rate', String(playbackRate.value))
  player.setRate(playbackRate.value)
}

async function doLogout() {
  await player.stop()
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.settings-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 60px; }

.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 20px; }

.settings-section { margin-bottom: 24px; }
.section-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin: 0 0 8px; padding: 0 4px;
}

.settings-card {
  background: #111; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 1px;
}
.account-row {
  display: flex; align-items: center; gap: 12px; padding: 14px;
}
.avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.account-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
.account-role { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }

.settings-item {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 4px; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.settings-item:last-child { border-bottom: none; }
.item-label { flex: 1; font-size: 13px; color: rgba(255,255,255,0.75); }
.item-value { font-size: 12px; color: rgba(255,255,255,0.35); }
.server-url { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.speed-slider-wrap { padding: 4px 0 12px; }
.speed-slider {
  width: 100%; -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 2px;
  background: linear-gradient(to right, #d4a017 0%, #d4a017 calc(var(--pct, 50%)), rgba(255,255,255,0.1) calc(var(--pct, 50%)));
  outline: none; cursor: pointer;
}
.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px;
  border-radius: 50%; background: #d4a017;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.slider-ticks {
  display: flex; justify-content: space-between;
  font-size: 9px; color: rgba(255,255,255,0.25); margin-top: 4px;
}

.admin-link-wrap { margin-top: 8px; }
.admin-link {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 13px 4px; background: transparent; border: none;
  cursor: pointer; color: rgba(255,255,255,0.6); font-size: 13px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.admin-link .v-icon:first-child { color: #d4a017; }

/* Logout confirm */
.confirm-backdrop {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: flex-end;
}
.confirm-sheet {
  width: 100%; background: #111;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 20px 20px 40px;
}
.confirm-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 8px; }
.confirm-sub   { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 20px; }
.confirm-btns  { display: flex; gap: 10px; }
.confirm-cancel {
  flex: 1; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); font-size: 14px;
}
.confirm-logout {
  flex: 1; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(239,68,68,0.12); color: #ef4444; font-size: 14px; font-weight: 600;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

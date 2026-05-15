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

      <div class="settings-item" @click="openChangeUsername">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-account-edit-outline</v-icon>
        <span class="item-label">Change Username</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
      <div class="settings-item" @click="showChangePassword = true">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-lock-outline</v-icon>
        <span class="item-label">Change Password</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
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
        <div class="item-label-stack">
          <span class="item-label">Default speed</span>
          <span class="item-sublabel">Applied when starting a new book</span>
        </div>
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
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-speedometer-medium</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Speed presets</span>
          <span class="item-sublabel">Long-press a chip in the player to remove; + to add</span>
        </div>
        <button class="reset-presets-btn" @click="resetSpeedPresets">Reset</button>
      </div>
      <div class="presets-row">
        <span v-for="s in speedPresets" :key="s" class="preset-chip">{{ s }}×</span>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-skip-backward</v-icon>
        <span class="item-label">Skip back</span>
        <div class="interval-chips">
          <button
            v-for="s in skipIntervalOptions"
            :key="s"
            class="interval-chip"
            :class="{ active: skipBackSecs === s }"
            @click="setSkipBack(s)"
          >{{ s }}s</button>
        </div>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-skip-forward</v-icon>
        <span class="item-label">Skip forward</span>
        <div class="interval-chips">
          <button
            v-for="s in skipIntervalOptions"
            :key="s"
            class="interval-chip"
            :class="{ active: skipFwdSecs === s }"
            @click="setSkipFwd(s)"
          >{{ s }}s</button>
        </div>
      </div>

      <div class="settings-item" @click="settingsStore.setSpeedAdjustedTime(!settingsStore.speedAdjustedTime)">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-clock-fast</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Speed-adjusted time</span>
          <span class="item-sublabel">Show remaining time at current playback rate</span>
        </div>
        <div class="toggle-pill" :class="{ on: settingsStore.speedAdjustedTime }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item" @click="settingsStore.setBookAutoAdvance(!settingsStore.bookAutoAdvance)">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-book-arrow-right-outline</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Auto-advance books</span>
          <span class="item-sublabel">Automatically play next book in series</span>
        </div>
        <div class="toggle-pill" :class="{ on: settingsStore.bookAutoAdvance }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item" @click="settingsStore.setPodcastAutoAdvance(!settingsStore.podcastAutoAdvance)">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-skip-next-circle-outline</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Auto-advance episodes</span>
          <span class="item-sublabel">Automatically play next podcast episode</span>
        </div>
        <div class="toggle-pill" :class="{ on: settingsStore.podcastAutoAdvance }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item" @click="settingsStore.setAutoRewindEnabled(!settingsStore.autoRewindEnabled)">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-rewind</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Auto-rewind on resume</span>
          <span class="item-sublabel">Rewind up to {{ settingsStore.autoRewindMax }}s after a pause</span>
        </div>
        <div class="toggle-pill" :class="{ on: settingsStore.autoRewindEnabled }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div v-if="settingsStore.autoRewindEnabled" class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-rewind-outline</v-icon>
        <span class="item-label">Max rewind</span>
        <div class="interval-chips">
          <button
            v-for="s in rewindOptions"
            :key="s"
            class="interval-chip"
            :class="{ active: settingsStore.autoRewindMax === s }"
            @click.stop="settingsStore.setAutoRewindMax(s)"
          >{{ s }}s</button>
        </div>
      </div>

      <div class="settings-item" @click="toggleSleepFade">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-volume-minus</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Fade volume before sleep</span>
          <span class="item-sublabel">Gradually lower volume before sleep timer fires</span>
        </div>
        <div class="toggle-pill" :class="{ on: sleepFadeEnabled }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div v-if="sleepFadeEnabled" class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-timer-outline</v-icon>
        <span class="item-label">Fade duration</span>
        <div class="interval-chips">
          <button
            v-for="s in sleepFadeDurationOptions"
            :key="s"
            class="interval-chip"
            :class="{ active: sleepFadeSecs === s }"
            @click.stop="setSleepFadeSecs(s)"
          >{{ s }}s</button>
        </div>
      </div>

      <div class="settings-item" @click="toggleSleepChime">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-bell-outline</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Chime before sleep</span>
          <span class="item-sublabel">Play a soft chime 30 seconds before sleep fires</span>
        </div>
        <div class="toggle-pill" :class="{ on: sleepChimeEnabled }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item" @click="toggleSleepResetOnPause">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-pause-circle-outline</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Pause sleep timer when paused</span>
          <span class="item-sublabel">Stop sleep countdown while audio is paused</span>
        </div>
        <div class="toggle-pill" :class="{ on: sleepResetOnPause }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-rewind</v-icon>
        <span class="item-label">Sleep rewind</span>
        <div class="interval-chips">
          <button
            v-for="s in sleepRewindOptions"
            :key="s"
            class="interval-chip"
            :class="{ active: sleepRewindSecs === s }"
            @click.stop="setSleepRewind(s)"
          >{{ s === 0 ? 'Off' : `${s}s` }}</button>
        </div>
      </div>

      <!-- Auto sleep timer -->
      <div class="settings-item" @click="toggleAutoSleep">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-weather-night</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Auto sleep timer</span>
          <span class="item-sublabel">Start sleep timer automatically within a time window</span>
        </div>
        <div class="toggle-pill" :class="{ on: autoSleepEnabled }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <template v-if="autoSleepEnabled">
        <div class="settings-item">
          <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-clock-start</v-icon>
          <span class="item-label">Window start</span>
          <div class="interval-chips">
            <button
              v-for="h in autoSleepHourOptions"
              :key="h"
              class="interval-chip"
              :class="{ active: autoSleepStart === h }"
              @click.stop="setAutoSleepStart(h)"
            >{{ fmtHour(h) }}</button>
          </div>
        </div>
        <div class="settings-item">
          <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-clock-end</v-icon>
          <span class="item-label">Window end</span>
          <div class="interval-chips">
            <button
              v-for="h in autoSleepHourOptions"
              :key="h"
              class="interval-chip"
              :class="{ active: autoSleepEnd === h }"
              @click.stop="setAutoSleepEnd(h)"
            >{{ fmtHour(h) }}</button>
          </div>
        </div>
        <div class="settings-item">
          <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-timer-sand</v-icon>
          <span class="item-label">Auto sleep duration</span>
          <div class="interval-chips">
            <button
              v-for="m in autoSleepDurationOptions"
              :key="m"
              class="interval-chip"
              :class="{ active: autoSleepMins === m }"
              @click.stop="setAutoSleepMins(m)"
            >{{ m }}m</button>
          </div>
        </div>
      </template>

      <div class="settings-item" @click="togglePerItemSpeed">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-speedometer</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Remember speed per book</span>
          <span class="item-sublabel">Restore the last speed used for each title</span>
        </div>
        <div class="toggle-pill" :class="{ on: perItemSpeed }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <div class="settings-item" @click="toggleGoodreads">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-bookshelf</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Show Goodreads button</span>
          <span class="item-sublabel">Search Goodreads from book detail sheet</span>
        </div>
        <div class="toggle-pill" :class="{ on: showGoodreads }">
          <div class="toggle-thumb" />
        </div>
      </div>
    </section>

    <!-- Equalizer -->
    <section class="settings-section">
      <p class="section-label">Equalizer</p>

      <div class="settings-item" @click="eq.setEnabled(!eq.enabled)">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-equalizer</v-icon>
        <div class="item-label-stack">
          <span class="item-label">Equalizer</span>
          <span class="item-sublabel">{{ eq.enabled ? (eq.isCustom ? 'Custom' : eq.activePreset) : 'Off' }}</span>
        </div>
        <div class="toggle-pill" :class="{ on: eq.enabled }">
          <div class="toggle-thumb" />
        </div>
      </div>

      <Transition name="expand">
        <div v-if="eq.enabled" class="eq-panel">
          <!-- Preset chips -->
          <div class="eq-presets-wrap">
            <button
              v-for="name in Object.keys(PRESETS)"
              :key="name"
              class="eq-preset-chip"
              :class="{ active: eq.activePreset === name }"
              @click="eq.applyPreset(name)"
            >{{ name }}</button>
          </div>

          <!-- Band sliders -->
          <div class="eq-bands-wrap">
            <div v-for="(band, i) in EQ_BANDS" :key="band.freq" class="eq-band">
              <input
                type="range"
                :min="eq.MIN_DB" :max="eq.MAX_DB" step="0.5"
                :value="eq.bands[i]"
                class="eq-band-slider"
                orient="vertical"
                @input="eq.setBand(i, parseFloat(($event.target as HTMLInputElement).value))"
              />
              <span class="eq-band-db" :class="{ pos: eq.bands[i] > 0, neg: eq.bands[i] < 0 }">
                {{ eq.bands[i] > 0 ? '+' : '' }}{{ eq.bands[i].toFixed(0) }}
              </span>
              <span class="eq-band-label">{{ band.label }}</span>
            </div>
          </div>

          <!-- Bass boost + Mono row -->
          <div class="eq-extras">
            <div class="eq-extra-item">
              <span class="eq-extra-label">Bass boost</span>
              <div class="eq-bass-row">
                <input
                  type="range" min="0" max="1" step="0.05"
                  :value="eq.bassBoost"
                  class="eq-bass-slider"
                  @input="eq.setBassBoost(parseFloat(($event.target as HTMLInputElement).value))"
                />
                <span class="eq-bass-val">{{ Math.round(eq.bassBoost * 100) }}%</span>
              </div>
            </div>
            <div class="eq-extra-item eq-mono-item" @click="eq.setMono(!eq.mono)">
              <span class="eq-extra-label">Mono</span>
              <div class="toggle-pill sm" :class="{ on: eq.mono }">
                <div class="toggle-thumb" />
              </div>
            </div>
          </div>

          <button class="eq-reset-btn" @click="eq.resetAll()">Reset to flat</button>
        </div>
      </Transition>
    </section>

    <!-- Server -->
    <section class="settings-section">
      <p class="section-label">Server</p>

      <div class="settings-item" @click="openEditServer">
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
        <span class="item-value">{{ appVersion }}</span>
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
      <div class="settings-item" @click="router.push({ name: 'bookmarks' })">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-bookmark-outline</v-icon>
        <span class="item-label">Bookmarks</span>
        <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
    </section>

    <!-- Data & Backup -->
    <section class="settings-section">
      <p class="section-label">Data &amp; Backup</p>
      <div class="settings-item" @click="exportSettings">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-export-variant</v-icon>
        <span class="item-label">Export Settings</span>
        <span class="item-value" style="font-size:11px">JSON</span>
      </div>
      <div class="settings-item" @click="triggerImport">
        <v-icon size="18" color="rgba(255,255,255,0.5)">mdi-import</v-icon>
        <span class="item-label">Import Settings</span>
        <input ref="importFileRef" type="file" accept=".json" style="display:none" @change="importSettings" />
      </div>
      <div class="settings-item" style="cursor:default">
        <v-icon size="18" color="rgba(255,255,255,0.3)">mdi-note-outline</v-icon>
        <span class="item-label" style="color:rgba(255,255,255,0.35)">Notes (per-book, stored locally)</span>
        <span class="item-value" style="font-size:11px">{{ noteCount }} books</span>
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

    <!-- Change password sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showChangePassword" class="confirm-backdrop" @click.self="showChangePassword = false">
          <div class="confirm-sheet">
            <p class="confirm-title">Change Password</p>
            <input v-model="currentPw" type="password" class="form-input" placeholder="Current password" autocomplete="current-password" />
            <input v-model="newPw" type="password" class="form-input" placeholder="New password" autocomplete="new-password" />
            <input v-model="newPw2" type="password" class="form-input" placeholder="Confirm new password" autocomplete="new-password" />
            <p v-if="pwError" class="form-error">{{ pwError }}</p>
            <p v-if="pwSuccess" class="form-success">Password changed successfully</p>
            <div class="confirm-btns">
              <button class="confirm-cancel" @click="showChangePassword = false">Cancel</button>
              <button class="confirm-logout" style="background:rgba(212,160,23,0.12);color:#d4a017" :disabled="changingPw || !canChangePw" @click="doChangePassword">
                {{ changingPw ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Change username sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showChangeUsername" class="confirm-backdrop" @click.self="showChangeUsername = false">
          <div class="confirm-sheet">
            <p class="confirm-title">Change Username</p>
            <input v-model="newUsername" class="form-input" placeholder="New username" autocomplete="off" />
            <p v-if="usernameError" class="form-error">{{ usernameError }}</p>
            <p v-if="usernameSuccess" class="form-success">Username updated</p>
            <div class="confirm-btns">
              <button class="confirm-cancel" @click="showChangeUsername = false">Cancel</button>
              <button
                class="confirm-logout"
                style="background:rgba(212,160,23,0.12);color:#d4a017"
                :disabled="changingUsername || !newUsername.trim()"
                @click="doChangeUsername"
              >
                {{ changingUsername ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit server URL sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showEditServer" class="confirm-backdrop" @click.self="showEditServer = false">
          <div class="confirm-sheet">
            <p class="confirm-title">Server URL</p>
            <p class="confirm-sub" style="margin:0 0 12px;font-size:11px">Change requires re-login</p>
            <input v-model="editServerUrl" class="form-input" placeholder="https://abs.example.com" autocomplete="off" />
            <div class="confirm-btns">
              <button class="confirm-cancel" @click="showEditServer = false">Cancel</button>
              <button
                class="confirm-logout"
                style="background:rgba(212,160,23,0.12);color:#d4a017"
                :disabled="!editServerUrl.trim()"
                @click="doSaveServer"
              >Save &amp; Re-login</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useEqualizerStore, EQ_BANDS, PRESETS } from '@/stores/equalizer'
import { useSocketStore } from '@/stores/socket'
import { useSettingsStore } from '@/stores/settings'
import { updatePassword, updateUsername } from '@/api/auth'

const router    = useRouter()
const auth      = useAuthStore()
const lib       = useLibraryStore()
const player    = usePlayerStore()
const socketStore    = useSocketStore()
const settingsStore  = useSettingsStore()
const eq = useEqualizerStore()

declare const __APP_VERSION__: string
const appVersion = __APP_VERSION__

const confirmLogout      = ref(false)
const socketConnected    = computed(() => socketStore.connected)
const importFileRef      = ref<HTMLInputElement | null>(null)

const noteCount = computed(() => {
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('abs_notes_')) count++
  }
  return count
})

function exportSettings() {
  const data: Record<string, string> = {}
  const skipKeys = new Set(['abs_token', 'abs_base_url'])
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('abs_') && !skipKeys.has(k)) {
      data[k] = localStorage.getItem(k) ?? ''
    }
  }
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `abscond_backup_${date}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function triggerImport() { importFileRef.value?.click() }

function importSettings(evt: Event) {
  const file = (evt.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as Record<string, string>
      const skipKeys = new Set(['abs_token', 'abs_base_url'])
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith('abs_') && !skipKeys.has(k)) localStorage.setItem(k, v)
      }
      window.location.reload()
    } catch {
      alert('Invalid backup file')
    }
  }
  reader.readAsText(file)
}
const showChangePassword = ref(false)
const currentPw          = ref('')
const newPw              = ref('')
const newPw2             = ref('')
const pwError            = ref('')
const pwSuccess          = ref(false)
const changingPw         = ref(false)
const canChangePw        = computed(() => currentPw.value && newPw.value && newPw.value === newPw2.value)

async function doChangePassword() {
  pwError.value   = ''
  pwSuccess.value = false
  if (!auth.user?.id) return
  if (newPw.value !== newPw2.value) { pwError.value = 'Passwords do not match'; return }
  changingPw.value = true
  try {
    await updatePassword(auth.user.id, currentPw.value, newPw.value)
    pwSuccess.value = true
    currentPw.value = ''
    newPw.value     = ''
    newPw2.value    = ''
  } catch { pwError.value = 'Failed to change password. Check your current password.' }
  finally { changingPw.value = false }
}
const serverUrl = ref(localStorage.getItem('abs_base_url') ?? '/api')

const showChangeUsername = ref(false)
const newUsername        = ref('')
const usernameError      = ref('')
const usernameSuccess    = ref(false)
const changingUsername   = ref(false)

function openChangeUsername() {
  newUsername.value     = auth.user?.username ?? ''
  usernameError.value   = ''
  usernameSuccess.value = false
  showChangeUsername.value = true
}

async function doChangeUsername() {
  if (!auth.user?.id || !newUsername.value.trim()) return
  changingUsername.value = true
  usernameError.value    = ''
  usernameSuccess.value  = false
  try {
    await updateUsername(auth.user.id, newUsername.value.trim())
    if (auth.user) auth.user.username = newUsername.value.trim()
    usernameSuccess.value = true
    setTimeout(() => { showChangeUsername.value = false }, 1000)
  } catch { usernameError.value = 'Failed to update username' }
  finally { changingUsername.value = false }
}

const showEditServer = ref(false)
const editServerUrl  = ref('')

function openEditServer() {
  editServerUrl.value = serverUrl.value
  showEditServer.value = true
}

function doSaveServer() {
  const url = editServerUrl.value.trim().replace(/\/$/, '')
  localStorage.setItem('abs_base_url', url)
  serverUrl.value = url
  showEditServer.value = false
  // Force re-login with new server
  auth.logout()
  router.push({ name: 'login' })
}

const playbackRate = ref<number>(settingsStore.defaultSpeed)
const skipBackSecs = computed({
  get: () => settingsStore.skipBackSecs,
  set: (v: number) => settingsStore.setSkipBack(v),
})
const skipFwdSecs = computed({
  get: () => settingsStore.skipFwdSecs,
  set: (v: number) => settingsStore.setSkipFwd(v),
})

const skipIntervalOptions = [10, 15, 30, 45, 60]
const rewindOptions = [5, 10, 20, 30, 60]

const sleepFadeEnabled = ref(localStorage.getItem('abs_sleep_fade') !== 'false')
function toggleSleepFade() {
  sleepFadeEnabled.value = !sleepFadeEnabled.value
  localStorage.setItem('abs_sleep_fade', String(sleepFadeEnabled.value))
}

const sleepFadeDurationOptions = [15, 30, 45, 60, 120]
const sleepFadeSecs = ref(parseInt(localStorage.getItem('abs_sleep_fade_secs') ?? '30'))
function setSleepFadeSecs(s: number) {
  sleepFadeSecs.value = s
  localStorage.setItem('abs_sleep_fade_secs', String(s))
}

const sleepChimeEnabled = ref(localStorage.getItem('abs_sleep_chime') !== 'false')
function toggleSleepChime() {
  sleepChimeEnabled.value = !sleepChimeEnabled.value
  localStorage.setItem('abs_sleep_chime', String(sleepChimeEnabled.value))
}

const sleepResetOnPause = ref(localStorage.getItem('abs_sleep_reset_on_pause') === 'true')
function toggleSleepResetOnPause() {
  sleepResetOnPause.value = !sleepResetOnPause.value
  localStorage.setItem('abs_sleep_reset_on_pause', String(sleepResetOnPause.value))
}

const sleepRewindOptions = [0, 15, 30, 45, 60]
const sleepRewindSecs = ref(parseInt(localStorage.getItem('abs_sleep_rewind') ?? '0'))
function setSleepRewind(s: number) {
  sleepRewindSecs.value = s
  localStorage.setItem('abs_sleep_rewind', String(s))
}

const autoSleepEnabled = ref(localStorage.getItem('abs_auto_sleep') === 'true')
const autoSleepHourOptions = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
const autoSleepStart = ref(parseInt(localStorage.getItem('abs_auto_sleep_start') ?? '22'))
const autoSleepEnd   = ref(parseInt(localStorage.getItem('abs_auto_sleep_end')   ?? '6'))
const autoSleepDurationOptions = [15, 20, 30, 45, 60, 90]
const autoSleepMins  = ref(parseInt(localStorage.getItem('abs_auto_sleep_mins')  ?? '30'))
function toggleAutoSleep() {
  autoSleepEnabled.value = !autoSleepEnabled.value
  localStorage.setItem('abs_auto_sleep', String(autoSleepEnabled.value))
}
function setAutoSleepStart(h: number) { autoSleepStart.value = h; localStorage.setItem('abs_auto_sleep_start', String(h)) }
function setAutoSleepEnd(h: number)   { autoSleepEnd.value   = h; localStorage.setItem('abs_auto_sleep_end',   String(h)) }
function setAutoSleepMins(m: number)  { autoSleepMins.value  = m; localStorage.setItem('abs_auto_sleep_mins',  String(m)) }
function fmtHour(h: number): string {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

const perItemSpeed = ref(localStorage.getItem('abs_per_item_speed') !== 'false')
function togglePerItemSpeed() {
  perItemSpeed.value = !perItemSpeed.value
  localStorage.setItem('abs_per_item_speed', String(perItemSpeed.value))
}

const showGoodreads = ref(localStorage.getItem('abs_show_goodreads') === 'true')
function toggleGoodreads() {
  showGoodreads.value = !showGoodreads.value
  localStorage.setItem('abs_show_goodreads', String(showGoodreads.value))
}

const DEFAULT_SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
function _loadPresets(): number[] {
  try {
    const raw = localStorage.getItem('abs_speed_presets')
    if (raw) { const p = JSON.parse(raw) as number[]; if (Array.isArray(p) && p.length) return p }
  } catch {}
  return [...DEFAULT_SPEED_PRESETS]
}
const speedPresets = ref<number[]>(_loadPresets())
function resetSpeedPresets() {
  speedPresets.value = [...DEFAULT_SPEED_PRESETS]
  localStorage.removeItem('abs_speed_presets')
}

function savePlaybackRate() {
  settingsStore.setDefaultSpeed(playbackRate.value)
  player.setRate(playbackRate.value)
}

function setSkipBack(s: number) { settingsStore.setSkipBack(s) }
function setSkipFwd(s: number)  { settingsStore.setSkipFwd(s) }

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

.interval-chips { display: flex; gap: 4px; }
.interval-chip {
  font-size: 10px; padding: 3px 8px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); transition: all 0.15s;
}
.interval-chip.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017; }

.reset-presets-btn {
  font-size: 11px; padding: 3px 10px; border-radius: 12px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.reset-presets-btn:active { background: rgba(255,255,255,0.1); }
.presets-row {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 2px 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.preset-chip {
  font-size: 11px; padding: 3px 10px; border-radius: 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
}

.item-label-stack { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.item-sublabel { font-size: 10px; color: rgba(255,255,255,0.3); }

.toggle-pill {
  width: 40px; height: 22px; border-radius: 11px; flex-shrink: 0;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12);
  position: relative; transition: background 0.2s;
}
.toggle-pill.on { background: rgba(212,160,23,0.5); border-color: rgba(212,160,23,0.6); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.7);
  transition: transform 0.2s, background 0.2s;
}
.toggle-pill.on .toggle-thumb { transform: translateX(18px); background: #fff; }

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
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.9);
  outline: none; margin-bottom: 10px; box-sizing: border-box;
}
.form-error { font-size: 12px; color: #ef4444; margin: 0 0 10px; }
.form-success { font-size: 12px; color: #22c55e; margin: 0 0 10px; }

/* Equalizer */
.eq-panel { padding: 0 14px 14px; }
.eq-presets-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.eq-preset-chip {
  padding: 5px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5);
  font-size: 11px; cursor: pointer; transition: all 0.15s; text-transform: capitalize;
}
.eq-preset-chip.active {
  border-color: rgba(212,160,23,0.6); background: rgba(212,160,23,0.12);
  color: #d4a017; font-weight: 600;
}
.eq-bands-wrap { display: flex; justify-content: space-around; gap: 8px; margin-bottom: 16px; height: 120px; }
.eq-band { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.eq-band-slider {
  -webkit-appearance: slider-vertical; writing-mode: vertical-lr; direction: rtl;
  width: 28px; flex: 1; cursor: pointer;
  accent-color: #d4a017;
}
.eq-band-db { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.5); min-height: 14px; }
.eq-band-db.pos { color: #d4a017; }
.eq-band-db.neg { color: rgba(212,160,23,0.5); }
.eq-band-label { font-size: 9px; color: rgba(255,255,255,0.3); }
.eq-extras { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-end; }
.eq-extra-item { flex: 1; }
.eq-extra-label { font-size: 11px; color: rgba(255,255,255,0.4); display: block; margin-bottom: 6px; }
.eq-bass-row { display: flex; align-items: center; gap: 8px; }
.eq-bass-slider { flex: 1; accent-color: #d4a017; cursor: pointer; }
.eq-bass-val { font-size: 11px; color: rgba(255,255,255,0.5); width: 28px; text-align: right; flex-shrink: 0; }
.eq-mono-item { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.toggle-pill.sm { width: 36px; height: 20px; }
.toggle-pill.sm .toggle-thumb { width: 14px; height: 14px; }
.toggle-pill.sm.on .toggle-thumb { transform: translateX(18px); }
.eq-reset-btn {
  width: 100%; padding: 9px; border-radius: 8px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
  font-size: 12px; transition: background 0.15s;
}
.eq-reset-btn:hover { background: rgba(255,255,255,0.08); }
</style>

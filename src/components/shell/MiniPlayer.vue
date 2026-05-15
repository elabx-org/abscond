<template>
  <Transition name="miniplayer">
    <div
      v-if="player.currentItem"
      class="mini-player"
      @click="router.push({ name: 'player' })"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Blurred bg -->
      <div class="mini-bg">
        <img v-if="coverSrc" :src="coverSrc" class="mini-bg-img" aria-hidden="true" />
        <div class="mini-bg-scrim" />
      </div>

      <!-- Content -->
      <div class="mini-content">
        <img v-if="coverSrc" :src="coverSrc" class="mini-cover" />
        <div v-else class="mini-cover mini-cover-placeholder">
          <v-icon size="16">mdi-book-open-variant</v-icon>
        </div>

        <div class="mini-meta">
          <p class="mini-title">{{ displayTitle }}</p>
          <p class="mini-author">{{ displaySubtitle }}</p>
        </div>

        <button class="mini-ctrl" @click.stop="player.togglePlay()">
          <v-icon size="22" color="white">{{ player.isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
        </button>
        <button class="mini-ctrl skip-fwd-btn" @click.stop="player.skipForward(skipFwdSecs)">
          <v-icon v-if="skipFwdSecs === 10" size="20" color="rgba(255,255,255,0.7)">mdi-fast-forward-10</v-icon>
          <v-icon v-else-if="skipFwdSecs === 15" size="20" color="rgba(255,255,255,0.7)">mdi-fast-forward-15</v-icon>
          <v-icon v-else-if="skipFwdSecs === 30" size="20" color="rgba(255,255,255,0.7)">mdi-fast-forward-30</v-icon>
          <span v-else class="mini-skip-custom">
            <v-icon size="16" color="rgba(255,255,255,0.7)">mdi-fast-forward</v-icon>
            <span class="mini-skip-secs">{{ skipFwdSecs }}s</span>
          </span>
        </button>
        <!-- Sleep timer indicator -->
        <div v-if="player.sleepMinsLeft !== null || player.sleepEndOfChapter" class="mini-sleep" @click.stop="player.setSleepTimer(null)">
          <v-icon size="12" color="rgba(212,160,23,0.8)">mdi-moon-waning-crescent</v-icon>
          <span class="mini-sleep-label">{{ player.sleepEndOfChapter ? 'ch' : `${player.sleepMinsLeft}m` }}</span>
        </div>
        <button class="mini-ctrl" @click.stop="player.stop()">
          <v-icon size="18" color="rgba(255,255,255,0.4)">mdi-close</v-icon>
        </button>
      </div>

      <!-- Progress -->
      <div class="mini-progress-track">
        <div class="mini-progress-fill" :style="{ width: `${player.progress * 100}%` }" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { coverUrl } from '@/api/client'

const player      = usePlayerStore()
const auth        = useAuthStore()
const router      = useRouter()
const settings    = useSettingsStore()
const skipFwdSecs  = computed(() => settings.skipFwdSecs)
const skipBackSecs = computed(() => settings.skipBackSecs)

const _touchStart = ref<{ x: number; y: number } | null>(null)

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  _touchStart.value = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e: TouchEvent) {
  if (!_touchStart.value) return
  const t = e.changedTouches[0]
  const dx = t.clientX - _touchStart.value.x
  const dy = t.clientY - _touchStart.value.y
  _touchStart.value = null
  if (Math.abs(dy) > Math.abs(dx) && dy < -40) {
    // swipe up → open player
    router.push({ name: 'player' })
  } else if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
    e.stopPropagation()
    if (dx < 0) player.skipForward(skipFwdSecs.value)
    else player.skipBack(skipBackSecs.value)
  }
}

const coverSrc = computed(() =>
  player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''
)

const isPodcast = computed(() => player.currentItem?.mediaType === 'podcast')

const displayTitle = computed(() => {
  if (isPodcast.value) {
    return player.session?.displayTitle || player.currentItem?.media.metadata.title || ''
  }
  return player.currentItem?.media.metadata.title || ''
})

const displaySubtitle = computed(() => {
  if (isPodcast.value) {
    return player.session?.displayAuthor || player.currentItem?.media.metadata.title || ''
  }
  if (player.currentChapter) return player.currentChapter.title
  return player.session?.displayAuthor || player.currentItem?.media.metadata.authorName || ''
})
</script>

<style scoped>
.mini-player {
  position: fixed;
  bottom: calc(56px + env(safe-area-inset-bottom));
  left: 0; right: 0; z-index: 99;
  height: 60px; cursor: pointer;
  border-top: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.mini-bg { position: absolute; inset: 0; }
.mini-bg-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(20px) brightness(0.25) saturate(1.3);
  transform: scale(1.1);
}
.mini-bg-scrim { position: absolute; inset: 0; background: rgba(14,14,14,0.7); }

.mini-content {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  padding: 0 12px; height: 57px;
}
.mini-cover {
  width: 40px; height: 40px; border-radius: 6px;
  object-fit: cover; flex-shrink: 0; background: #141414;
}
.mini-cover-placeholder {
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.3);
}
.mini-meta { flex: 1; min-width: 0; }
.mini-title {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9);
  margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mini-author {
  font-size: 10px; color: rgba(255,255,255,0.4);
  margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mini-ctrl {
  background: transparent; border: none; cursor: pointer;
  padding: 6px; flex-shrink: 0;
}
.mini-skip-custom { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.mini-skip-secs { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.6); line-height: 1; }
.mini-sleep {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 4px 6px; cursor: pointer; flex-shrink: 0;
}
.mini-sleep-label { font-size: 8px; font-weight: 700; color: rgba(212,160,23,0.8); line-height: 1; }

.mini-progress-track {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: rgba(255,255,255,0.08);
}
.mini-progress-fill {
  height: 100%; background: #d4a017; transition: width 0.5s linear;
}

.miniplayer-enter-active, .miniplayer-leave-active {
  transition: transform 0.25s ease, opacity 0.25s;
}
.miniplayer-enter-from, .miniplayer-leave-to {
  transform: translateY(100%); opacity: 0;
}
</style>

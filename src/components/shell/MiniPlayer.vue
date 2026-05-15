<template>
  <Transition name="miniplayer">
    <div v-if="player.currentItem" class="mini-player" @click="router.push({ name: 'player' })">
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
          <p class="mini-title">{{ player.currentItem.media.metadata.title }}</p>
          <p class="mini-author">
            <span v-if="player.currentChapter">{{ player.currentChapter.title }}</span>
            <span v-else>{{ authorNames }}</span>
          </p>
        </div>

        <button class="mini-ctrl" @click.stop="player.togglePlay()">
          <v-icon size="22" color="white">{{ player.isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
        </button>
        <button class="mini-ctrl" @click.stop="player.skipForward(skipFwdSecs)">
          <v-icon size="20" color="rgba(255,255,255,0.7)">{{ skipFwdSecs === 10 ? 'mdi-fast-forward-10' : skipFwdSecs === 15 ? 'mdi-fast-forward-15' : 'mdi-fast-forward-30' }}</v-icon>
        </button>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'

const player     = usePlayerStore()
const auth       = useAuthStore()
const router     = useRouter()
const skipFwdSecs = parseInt(localStorage.getItem('abs_skip_fwd') ?? '30')

const coverSrc = computed(() =>
  player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''
)

const authorNames = computed(() =>
  (player.currentItem?.media.metadata.authors ?? []).map(a => a.name).join(', ') || ''
)
</script>

<style scoped>
.mini-player {
  position: fixed; bottom: 56px; left: 0; right: 0; z-index: 99;
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

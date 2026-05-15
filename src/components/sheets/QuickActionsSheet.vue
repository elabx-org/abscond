<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="qa-sheet">
          <div class="drag-handle" />

          <!-- Book header -->
          <div class="qa-header">
            <img v-if="coverSrc" :src="coverSrc" class="qa-cover" />
            <div class="qa-meta">
              <p class="qa-title">{{ title }}</p>
              <p class="qa-author">{{ author }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="qa-actions">
            <button class="qa-action" @click="$emit('play'); $emit('close')">
              <div class="qa-icon"><v-icon size="20" color="#d4a017">mdi-play-circle-outline</v-icon></div>
              <span>{{ progress > 0 && progress < 1 ? 'Continue' : 'Play' }}</span>
            </button>

            <button v-if="progress > 0" class="qa-action" @click="$emit('mark-finished'); $emit('close')">
              <div class="qa-icon"><v-icon size="20" color="rgba(255,255,255,0.6)">mdi-check-circle-outline</v-icon></div>
              <span>{{ progress >= 1 ? 'Mark unfinished' : 'Mark finished' }}</span>
            </button>

            <button v-if="progress > 0" class="qa-action" @click="$emit('clear-progress'); $emit('close')">
              <div class="qa-icon"><v-icon size="20" color="rgba(255,255,255,0.6)">mdi-restore</v-icon></div>
              <span>Clear progress</span>
            </button>

            <button class="qa-action" @click="$emit('add-to-playlist'); $emit('close')">
              <div class="qa-icon"><v-icon size="20" color="rgba(255,255,255,0.6)">mdi-playlist-plus</v-icon></div>
              <span>Add to playlist</span>
            </button>

            <button class="qa-action" @click="$emit('view-detail'); $emit('close')">
              <div class="qa-icon"><v-icon size="20" color="rgba(255,255,255,0.6)">mdi-information-outline</v-icon></div>
              <span>Book details</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  author: string
  coverSrc: string
  progress: number
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'play'): void
  (e: 'mark-finished'): void
  (e: 'clear-progress'): void
  (e: 'add-to-playlist'): void
  (e: 'view-detail'): void
}>()
</script>

<style scoped>
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 210;
  background: rgba(0,0,0,0.6); display: flex; align-items: flex-end;
}
.qa-sheet {
  width: 100%; background: #131313;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 16px 48px;
}
.drag-handle {
  width: 36px; height: 4px; background: rgba(255,255,255,0.15);
  border-radius: 2px; margin: 12px auto 16px;
}
.qa-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
  padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.qa-cover { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.qa-meta { flex: 1; min-width: 0; }
.qa-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qa-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }

.qa-actions { display: flex; flex-direction: column; }
.qa-action {
  display: flex; align-items: center; gap: 14px; padding: 13px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: transparent; border-left: none; border-right: none; border-top: none;
  cursor: pointer; color: rgba(255,255,255,0.8); font-size: 14px; text-align: left;
}
.qa-action:last-child { border-bottom: none; }
.qa-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.sheet-enter-active, .sheet-leave-active { transition: transform 0.25s ease, opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }
</style>

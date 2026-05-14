<template>
  <div class="portrait-card" @click="emit('click', itemId)">
    <div class="cover-wrap">
      <img
        ref="imgRef"
        :src="coverSrc"
        :alt="title"
        class="cover-img"
        @load="onImgLoad"
        @error="imgError = true"
      />
      <div v-if="imgError" class="cover-placeholder">
        <v-icon size="32" color="rgba(255,255,255,0.2)">mdi-book-open-variant</v-icon>
      </div>
      <div
        v-if="progress > 0"
        class="progress-bar"
        :style="{ width: `${Math.round(progress * 100)}%`, background: accent }"
      />
    </div>
    <p class="card-title">{{ title }}</p>
    <p class="card-author">{{ author }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useColorThief } from '@/composables/useColorThief'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
}>()

const emit = defineEmits<{ click: [itemId: string] }>()

const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

function onImgLoad() {
  extract()
}
</script>

<style scoped>
.portrait-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #141414;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 2px 0 0;
  transition: width 0.3s;
}
.card-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
  margin: 0;
}
.card-author {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
</style>

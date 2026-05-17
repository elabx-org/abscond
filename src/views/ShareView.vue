<template>
  <div class="share-view">
    <div v-if="loading" class="loading-state">
      <div class="skel-cover" />
      <div class="skel-text" />
      <div class="skel-text short" />
    </div>

    <div v-else-if="error" class="error-state">
      <AppIcon icon="mdi-link-off" :size="48" color="rgba(255,255,255,0.15)" />
      <p class="error-title">Share not found</p>
      <p class="error-sub">This share link may have expired or been removed</p>
      <button class="open-app-btn" @click="$router.push({ name: 'login' })">Open App</button>
    </div>

    <div v-else-if="shareData" class="share-content">
      <!-- Blurred backdrop -->
      <div class="share-backdrop">
        <img v-if="coverSrc" :src="coverSrc" class="backdrop-img" aria-hidden="true" />
        <div class="backdrop-scrim" />
      </div>

      <div class="share-inner">
        <img v-if="coverSrc" :src="coverSrc" class="share-cover" :alt="shareData.displayTitle" />
        <div v-else class="share-cover-placeholder">
          <AppIcon icon="mdi-book-open-variant" :size="48" color="rgba(255,255,255,0.2)" />
        </div>

        <h1 class="share-title">{{ shareData.displayTitle }}</h1>
        <p class="share-author">{{ shareData.displayAuthor }}</p>

        <div v-if="shareData.description" class="share-desc-wrap">
          <p class="share-desc">{{ shareData.description }}</p>
        </div>

        <div v-if="shareData.chapters?.length" class="share-chapters">
          <p class="share-chapters-title">{{ shareData.chapters.length }} chapters</p>
        </div>

        <p class="share-powered">Powered by Audiobookshelf</p>
        <button class="open-app-btn" @click="$router.push({ name: 'login' })">Open in App</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route  = useRoute()
const slug   = computed(() => route.params.slug as string)

interface ShareData {
  displayTitle: string
  displayAuthor: string
  description?: string | null
  coverPath?: string | null
  chapters?: { title: string }[]
}

const loading   = ref(true)
const error     = ref(false)
const shareData = ref<ShareData | null>(null)
const coverSrc  = ref('')

onMounted(async () => {
  try {
    // Public share endpoint — no auth required
    const baseUrl = localStorage.getItem('abs_base_url') ?? '/api'
    const host    = baseUrl.replace('/api', '')
    const res     = await fetch(`${host}/api/share/${slug.value}`)
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    shareData.value = data.mediaItemShare ?? data
    if (shareData.value?.coverPath) {
      coverSrc.value = `${host}/api/share/${slug.value}/cover`
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.share-view { min-height: 100vh; background: #0e0e0e; position: relative; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; }
.skel-cover { width: 180px; height: 180px; border-radius: 12px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-text { width: 60%; height: 16px; border-radius: 6px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skel-text.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; text-align: center; }
.error-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; }
.error-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }

.share-backdrop { position: absolute; inset: 0; z-index: 0; }
.backdrop-img { width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.3) saturate(1.4); transform: scale(1.1); }
.backdrop-scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(14,14,14,0.97)); }

.share-content { position: relative; z-index: 1; min-height: 100vh; }
.share-inner { display: flex; flex-direction: column; align-items: center; padding: 60px 24px 40px; gap: 12px; }

.share-cover { width: 180px; height: 180px; object-fit: cover; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
.share-cover-placeholder { width: 180px; height: 180px; border-radius: 12px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; }
.share-title { font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.95); text-align: center; margin: 8px 0 0; }
.share-author { font-size: 14px; color: rgba(255,255,255,0.5); text-align: center; margin: 0; }
.share-desc-wrap { max-width: 400px; }
.share-desc { font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.55); text-align: center; margin: 0; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.share-chapters { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px 16px; }
.share-chapters-title { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0; }
.share-powered { font-size: 10px; color: rgba(255,255,255,0.2); margin: 20px 0 0; }

.open-app-btn {
  padding: 14px 32px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
</style>

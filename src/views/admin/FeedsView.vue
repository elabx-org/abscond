<template>
  <div class="admin-feeds">
    <div class="section-header">
      <h3 class="section-title">RSS Feeds</h3>
      <span v-if="!loading && feeds.length" class="count-badge">{{ feeds.length }} open</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 3" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!feeds.length" class="empty-state">
      <AppIcon icon="mdi-rss-off" :size="36" color="rgba(255,255,255,0.15)" />
      <p>No open RSS feeds</p>
    </div>

    <div v-else class="feed-list">
      <div v-for="feed in feeds" :key="feed.id" class="feed-row">
        <AppIcon icon="mdi-rss" :size="20" color="#d4a017" class="feed-icon" />
        <div class="feed-info">
          <p class="feed-title">{{ feed.meta.title }}</p>
          <div class="feed-sub">
            <span class="entity-badge">{{ feed.entityType }}</span>
            <span class="feed-url">{{ feed.meta.feedUrl }}</span>
          </div>
        </div>
        <button
          class="close-btn"
          :disabled="closingId === feed.id"
          @click="doClose(feed.id)"
        >
          {{ closingId === feed.id ? 'Closing…' : 'Close' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, ref } from 'vue'
import { getRssFeeds, closeRssFeed } from '@/api/admin'
import type { RssFeed } from '@/api/admin'

const loading   = ref(true)
const feeds     = ref<RssFeed[]>([])
const closingId = ref<string | null>(null)

async function doClose(id: string) {
  closingId.value = id
  try {
    await closeRssFeed(id)
    feeds.value = feeds.value.filter(f => f.id !== id)
  } catch { /* ignore */ }
  finally { closingId.value = null }
}

onMounted(async () => {
  try { feeds.value = await getRssFeeds() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-feeds { padding: 4px 0; }

.section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.section-title {
  font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7);
  margin: 0; text-transform: uppercase; letter-spacing: 0.05em;
}
.count-badge {
  font-size: 11px; font-weight: 600; color: rgba(212,160,23,0.7);
  background: rgba(212,160,23,0.1); border: 1px solid rgba(212,160,23,0.2);
  border-radius: 20px; padding: 2px 8px;
}

.loading-state { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 60px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.feed-list { display: flex; flex-direction: column; }

.feed-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.feed-row:last-child { border-bottom: none; }

.feed-icon { flex-shrink: 0; }

.feed-info { flex: 1; min-width: 0; }
.feed-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.feed-sub { display: flex; align-items: center; gap: 6px; min-width: 0; }
.entity-badge {
  flex-shrink: 0;
  font-size: 10px; font-weight: 600; text-transform: capitalize;
  color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 5px;
}
.feed-url {
  font-size: 10px; color: rgba(255,255,255,0.35);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}

.close-btn {
  flex-shrink: 0;
  padding: 6px 12px; border-radius: 8px;
  font-size: 11px; font-weight: 600; cursor: pointer;
  background: rgba(220,50,50,0.08); border: 1px solid rgba(220,50,50,0.25); color: #e05555;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.close-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

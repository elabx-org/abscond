<template>
  <div class="admin-layout">
    <div class="admin-topbar">
      <button class="back-btn" @click="handleBack">
        <AppIcon icon="mdi-arrow-left" :size="20" />
      </button>
      <span class="admin-title">{{ pageTitle }}</span>
    </div>

    <div class="admin-body">
      <!-- Sidebar (desktop only) -->
      <aside class="admin-sidebar">
        <nav class="sidebar-nav">
          <div v-for="group in NAV_GROUPS" :key="group.label" class="sidebar-group">
            <p class="sidebar-group-label">{{ group.label }}</p>
            <button
              v-for="tab in group.tabs"
              :key="tab.name"
              class="sidebar-item"
              :class="{ active: isActive(tab.name) }"
              @click="router.push({ name: tab.name })"
            >
              <AppIcon :icon="tab.icon" :size="16" :color="isActive(tab.name) ? '#a78bfa' : 'rgba(255,255,255,0.45)'" />
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </nav>
      </aside>

      <div class="admin-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV_GROUPS, ADMIN_DETAIL_PARENT } from './adminNav'

const route  = useRoute()
const router = useRouter()

const allTabs = NAV_GROUPS.flatMap(g => g.tabs)

function isMobile() { return window.innerWidth < 768 }

function isActive(name: string): boolean {
  return route.name === name || ADMIN_DETAIL_PARENT[route.name as string] === name
}

const pageTitle = computed(() => {
  if (route.name === 'admin-hub') return 'Admin Panel'
  const parentName = ADMIN_DETAIL_PARENT[route.name as string]
  const lookupName = parentName ?? (route.name as string)
  return allTabs.find(t => t.name === lookupName)?.label ?? 'Admin Panel'
})

function handleBack() {
  if (route.name === 'admin-hub' || !isMobile()) {
    router.push({ name: 'settings' })
  } else {
    router.push({ name: 'admin-hub' })
  }
}

// On desktop, skip the hub and go straight to overview
watch(() => route.name, (name) => {
  if (name === 'admin-hub' && !isMobile()) {
    router.replace({ name: 'admin-overview' })
  }
}, { immediate: true })
</script>

<style scoped>
.admin-layout { min-height: 100dvh; }

.admin-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
}
.back-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.6); padding: 4px;
}
.admin-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); }

.admin-body { display: flex; }

/* Sidebar hidden on mobile */
.admin-sidebar { display: none; }

.admin-content { flex: 1; padding: 0 16px 80px; min-width: 0; }

@media (min-width: 768px) {
  .admin-topbar { padding: 14px 24px; }

  .admin-sidebar {
    display: flex; flex-direction: column;
    width: 200px; flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    background: rgba(8,8,8,0.4);
    position: sticky;
    top: env(safe-area-inset-top);
    height: calc(100dvh - env(safe-area-inset-top));
    overflow-y: auto; scrollbar-width: none;
  }
  .admin-sidebar::-webkit-scrollbar { display: none; }

  .sidebar-nav { padding: 12px 10px 24px; }
  .sidebar-group { margin-bottom: 20px; }
  .sidebar-group-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
    color: rgba(255,255,255,0.3); padding: 0 8px; margin: 0 0 4px;
  }
  .sidebar-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 10px; border-radius: 8px; border: none; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.55);
    font-size: 13px; font-weight: 500; text-align: left; transition: all 0.15s;
  }
  .sidebar-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
  .sidebar-item.active { background: rgba(134,59,255,0.13); color: #a78bfa; }

  .admin-content { padding: 0 32px 80px; max-width: 960px; }
}

@media (min-width: 1280px) {
  .admin-sidebar { width: 220px; }
  .admin-content { max-width: 1100px; }
}
</style>

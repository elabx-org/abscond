<template>
  <div class="admin-layout">
    <div class="admin-topbar">
      <button class="back-btn" @click="router.push({ name: 'settings' })">
        <AppIcon icon="mdi-arrow-left" :size="20" />
      </button>
      <span class="admin-title">Admin Panel</span>
    </div>

    <div class="admin-subnav">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="subnav-tab"
        :class="{ active: route.name === tab.name || DETAIL_PARENT[route.name as string] === tab.name }"
        @click="router.push({ name: tab.name })"
      >
        <AppIcon :icon="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="admin-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()

const DETAIL_PARENT: Record<string, string> = {
  'admin-user-detail':    'admin-users',
  'admin-podcast-detail': 'admin-libraries',
}

const tabs = [
  { name: 'admin-overview',       label: 'Overview',       icon: 'mdi-view-dashboard-outline' },
  { name: 'admin-libraries',      label: 'Libraries',      icon: 'mdi-bookshelf' },
  { name: 'admin-users',          label: 'Users',          icon: 'mdi-account-group' },
  { name: 'admin-settings',       label: 'Settings',       icon: 'mdi-cog' },
  { name: 'admin-backups',        label: 'Backups',        icon: 'mdi-backup-restore' },
  { name: 'admin-notifications',  label: 'Notifications',  icon: 'mdi-bell-outline' },
  { name: 'admin-logs',           label: 'Logs',           icon: 'mdi-text-box-outline' },
  { name: 'admin-upload',         label: 'Upload',         icon: 'mdi-upload' },
  { name: 'admin-api-keys',  label: 'API Keys',  icon: 'mdi-key-outline' },
  { name: 'admin-sessions',  label: 'Sessions',  icon: 'mdi-headphones' },
  { name: 'admin-email',     label: 'Email',     icon: 'mdi-email-outline' },
  { name: 'admin-metadata',  label: 'Metadata',  icon: 'mdi-tag-search-outline' },
  { name: 'admin-feeds',     label: 'RSS Feeds', icon: 'mdi-rss' },
  { name: 'admin-auth',      label: 'Auth',      icon: 'mdi-shield-lock-outline' },
]
</script>

<style scoped>
.admin-layout { min-height: 100vh; background: #0e0e0e; }

.admin-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 10;
  background: rgba(14,14,14,0.92); backdrop-filter: blur(12px);
}
.back-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.6); padding: 4px;
}
.admin-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); }

.admin-subnav {
  display: flex; overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 0 16px;
}
.admin-subnav::-webkit-scrollbar { display: none; }
.subnav-tab {
  display: flex; align-items: center; gap: 5px; flex-shrink: 0;
  padding: 10px 14px; background: transparent; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 12px; color: rgba(255,255,255,0.4); transition: all 0.15s;
}
.subnav-tab.active { color: #d4a017; border-bottom-color: #d4a017; }

.admin-content { padding: 16px 16px 80px; }

@media (min-width: 768px) {
  .admin-topbar { padding: 14px 32px; }
  .admin-subnav { padding: 0 32px; }
  .admin-content { padding: 24px 32px 80px; max-width: 1100px; margin: 0 auto; }
  .subnav-tab { padding: 12px 18px; font-size: 13px; }
}

@media (min-width: 1280px) {
  .admin-content { max-width: 1200px; }
}
</style>

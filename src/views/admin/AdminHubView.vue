<template>
  <div class="admin-hub">
    <div v-for="group in NAV_GROUPS" :key="group.label" class="hub-group">
      <p class="hub-group-label">{{ group.label }}</p>
      <div class="hub-group-card">
        <button
          v-for="(tab, i) in group.tabs"
          :key="tab.name"
          class="hub-item"
          :class="{ 'hub-item--last': i === group.tabs.length - 1 }"
          @click="router.push({ name: tab.name })"
        >
          <AppIcon :icon="tab.icon" :size="18" color="rgba(255,255,255,0.45)" />
          <span class="hub-item-label">{{ tab.label }}</span>
          <AppIcon icon="mdi-chevron-right" :size="16" color="rgba(255,255,255,0.18)" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useRouter } from 'vue-router'
import { NAV_GROUPS } from './adminNav'

const router = useRouter()
</script>

<style scoped>
.admin-hub { padding: 4px 0 32px; }

.hub-group { margin-bottom: 28px; }
.hub-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
  color: rgba(255,255,255,0.35); padding: 0 4px; margin: 0 0 8px;
}

.hub-group-card {
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}

.hub-item {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 13px 16px; border: none; border-bottom: 1px solid rgba(255,255,255,0.04);
  background: transparent; cursor: pointer; text-align: left;
  transition: background 0.12s;
}
.hub-item:last-child,
.hub-item--last { border-bottom: none; }
.hub-item:active { background: rgba(255,255,255,0.05); }

.hub-item-label {
  flex: 1; font-size: 14px; color: rgba(255,255,255,0.82); font-weight: 500;
}
</style>

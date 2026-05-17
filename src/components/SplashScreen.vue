<template>
  <Transition name="splash">
    <div v-if="visible" class="splash-screen">
      <AppLogo :size="56" animated="flow" />
      <span class="splash-name">ABSCOND</span>
      <div class="splash-spinner" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useProgressStore } from '@/stores/progress'

const auth     = useAuthStore()
const progress = useProgressStore()

// Auth is synchronous (localStorage-based), so there is no async resolved flag.
// The splash stays up until:
//   - the user is not logged in (nothing to load, dismiss immediately), OR
//   - fetchInProgress has completed (initialLoadDone flips true)
const visible = computed(() => auth.isLoggedIn && !progress.initialLoadDone)
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0e0e0e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.splash-name {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 4px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
}
@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
.splash-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(134,59,255,0.3);
  border-top-color: #863bff;
  border-radius: 50%;
  animation: splash-spin 0.8s linear infinite;
}
.splash-leave-active { transition: opacity 0.3s ease; }
.splash-leave-to     { opacity: 0; }
</style>

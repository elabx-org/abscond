<template>
  <div class="page-header">
    <p class="page-header-brand">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</p>
    <div class="page-header-row">
      <h1 class="page-header-title">{{ title }}</h1>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped>
.page-header { padding: 10px 16px 6px; }
.page-header-brand {
  font-size: 8px; font-weight: 300; letter-spacing: 5px;
  color: rgba(255,255,255,0.25); text-transform: uppercase; margin: 0 0 3px;
}
.page-header-row { display: flex; align-items: center; justify-content: space-between; }
.page-header-title {
  font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.95);
  letter-spacing: -0.5px; margin: 0; line-height: 1.1;
}
</style>

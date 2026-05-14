<template>
  <v-app>
    <router-view />
    <ToastContainer />
  </v-app>
</template>

<script setup lang="ts">
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>

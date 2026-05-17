<template>
  <svg
    :width="size"
    :height="Math.round(size * 14 / 36)"
    viewBox="0 0 36 14"
    xmlns="http://www.w3.org/2000/svg"
    style="overflow: visible"
  >
    <defs>
      <linearGradient :id="`logo-fade-${uid}`" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.55" :stop-color="color" stop-opacity="1"/>
        <stop offset="1"    :stop-color="color" stop-opacity="0"/>
      </linearGradient>
      <mask :id="`logo-mask-${uid}`">
        <rect width="36" height="14" :fill="`url(#logo-fade-${uid})`"/>
      </mask>
      <clipPath v-if="animated === 'flow'" :id="`logo-clip-${uid}`">
        <rect x="-36" y="-2" width="108" height="18"/>
      </clipPath>
    </defs>

    <!-- none / breathe / draw: single masked path -->
    <path
      v-if="animated !== 'flow'"
      :mask="`url(#logo-mask-${uid})`"
      :d="WAVE_D"
      :stroke="color"
      stroke-width="3"
      stroke-linecap="round"
      fill="none"
      pathLength="1"
      :class="{
        'anim-breathe': animated === 'breathe',
        'anim-draw':    animated === 'draw',
      }"
    />

    <!-- flow: two tiled paths scroll left seamlessly -->
    <g
      v-else
      :clip-path="`url(#logo-clip-${uid})`"
      :mask="`url(#logo-mask-${uid})`"
      class="anim-flow"
      :style="`--flow-tx: -${Math.round(34 * size / 36)}px`"
    >
      <path :d="WAVE_D"                             :stroke="color" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path :d="WAVE_D" transform="translate(34 0)" :stroke="color" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const WAVE_D = 'M1 7 C2.5 2 4.5 2 6 7 C7.5 12 9.5 12 11 7 C12.5 2 14.5 2 16 7 C17.5 12 19.5 12 21 7 C22.5 2 24.5 2 26 7 C27.5 12 29.5 12 31 7 C32.5 2 34.5 2 35 7'

const props = withDefaults(defineProps<{
  animated?: 'none' | 'breathe' | 'flow' | 'draw'
  size?: number
  color?: string
}>(), {
  animated: 'none',
  size: 36,
  color: '#863bff',
})

const uid = getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)
</script>

<style scoped>
@keyframes wave-breathe {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(134,59,255,0.25)); opacity: 0.8; }
  50%      { filter: drop-shadow(0 0 18px rgba(134,59,255,0.75)); opacity: 1; }
}
@keyframes wave-draw {
  0%   { stroke-dashoffset: 1; opacity: 0.3; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0.3; }
}
@keyframes wave-flow {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--flow-tx)); }
}

.anim-breathe { animation: wave-breathe 2.6s ease-in-out infinite; }
.anim-draw    { stroke-dasharray: 1; stroke-dashoffset: 1; animation: wave-draw 2.2s ease-in-out infinite; }
.anim-flow    { animation: wave-flow 2s linear infinite; }
</style>

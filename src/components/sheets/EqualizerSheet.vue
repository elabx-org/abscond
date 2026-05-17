<template>
  <v-bottom-sheet v-model="show" :scrim="true" max-height="92vh">
    <v-card
      class="eq-sheet"
      rounded="t-xl"
      :style="{
        transform: `translateY(${dragY}px)`,
        transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }"
    >
      <div
        class="drag-handle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />

      <!-- Header -->
      <div class="eq-header">
        <AppIcon icon="mdi-equalizer" :size="20" :color="accent" />
        <span class="eq-title">Audio Enhancements</span>
        <v-spacer />
        <v-switch
          v-model="eq.enabled"
          :color="accent"
          hide-details
          density="compact"
          style="flex:none"
          @update:modelValue="eq.setEnabled(!!$event)"
        />
      </div>
      <v-divider />

      <div class="eq-body">
        <!-- Presets -->
        <p class="section-label">PRESETS</p>
        <div class="presets-row">
          <button
            v-for="(_, name) in PRESETS"
            :key="name"
            class="preset-chip"
            :class="{ active: eq.activePreset === name }"
            :style="eq.activePreset === name ? { borderColor: accent, color: accent, background: accentAlpha } : {}"
            :disabled="!eq.enabled"
            @click="eq.applyPreset(name)"
          >{{ presetLabel(name) }}</button>
          <button
            v-if="eq.isCustom"
            class="preset-chip active"
            :style="{ borderColor: accent, color: accent, background: accentAlpha }"
            disabled
          >Custom</button>
        </div>

        <!-- EQ Bands -->
        <p class="section-label" style="margin-top:20px">EQUALIZER</p>
        <div class="bands-container">
          <div v-for="(band, i) in EQ_BANDS" :key="band.freq" class="band-col">
            <span class="band-val" :style="{ color: eq.enabled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' }">
              {{ eq.bands[i] >= 0 ? '+' : '' }}{{ eq.bands[i].toFixed(0) }}
            </span>
            <div class="band-slider-wrap">
              <input
                type="range"
                class="band-slider"
                :min="eq.MIN_DB"
                :max="eq.MAX_DB"
                step="0.5"
                :value="eq.bands[i]"
                :disabled="!eq.enabled"
                :style="{ '--accent': accent }"
                @input="eq.setBand(i, parseFloat(($event.target as HTMLInputElement).value))"
              />
            </div>
            <span class="band-freq" :style="{ color: eq.enabled ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }">{{ band.label }}</span>
            <span class="band-name" :style="{ color: eq.enabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }">{{ band.name }}</span>
          </div>
        </div>

        <!-- Effects -->
        <p class="section-label" style="margin-top:20px">EFFECTS</p>

        <!-- Bass Boost -->
        <div class="effect-row">
          <AppIcon icon="mdi-speaker" :size="18" :color="eq.enabled ? accent : 'rgba(255,255,255,0.2)'" />
          <span class="effect-label" :style="{ color: eq.enabled ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }">Bass Boost</span>
          <input
            type="range"
            class="effect-slider"
            min="0" max="1" step="0.01"
            :value="eq.bassBoost"
            :disabled="!eq.enabled"
            :style="{ '--accent': accent }"
            @input="eq.setBassBoost(parseFloat(($event.target as HTMLInputElement).value))"
          />
          <span class="effect-pct" :style="{ color: eq.enabled ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)' }">
            {{ Math.round(eq.bassBoost * 100) }}%
          </span>
        </div>

        <!-- Mono -->
        <div class="toggle-row">
          <AppIcon icon="mdi-headphones" :size="18" :color="eq.mono ? accent : 'rgba(255,255,255,0.2)'" />
          <span class="toggle-label" :style="{ color: eq.mono ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }">Mono Audio</span>
          <v-switch
            :modelValue="eq.mono"
            :color="accent"
            hide-details
            density="compact"
            style="flex:none"
            @update:modelValue="eq.setMono(!!$event)"
          />
        </div>

        <!-- Reset -->
        <div style="display:flex;justify-content:center;margin-top:16px">
          <v-btn
            variant="text"
            size="small"
            :disabled="!eq.enabled"
            prepend-icon="mdi-refresh"
            style="color:rgba(255,255,255,0.35)"
            @click="eq.resetAll()"
          >Reset All</v-btn>
        </div>

        <div style="height:24px" />
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, watch } from 'vue'
import { useEqualizerStore, EQ_BANDS, PRESETS } from '@/stores/equalizer'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

const props = defineProps<{ modelValue: boolean; accent?: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const show = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

function close() { emit('update:modelValue', false) }
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)

watch(() => props.modelValue, (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
})
const accent = computed(() => props.accent ?? '#7c9ef0')
const accentAlpha = computed(() => `${accent.value}22`)

const eq = useEqualizerStore()

const PRESET_LABELS: Record<string, string> = {
  flat: 'Flat',
  'voice boost': 'Voice Boost',
  'bass boost': 'Bass Boost',
  'treble boost': 'Treble Boost',
  podcast: 'Podcast',
  audiobook: 'Audiobook',
  'reduce noise': 'Reduce Noise',
  loudness: 'Loudness',
}

function presetLabel(name: string) { return PRESET_LABELS[name] ?? name }
</script>

<style scoped>
.eq-sheet { background: #1a1a2e; display: flex; flex-direction: column; max-height: 92vh; }
.drag-handle {
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}
.eq-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px 10px; }
.eq-title { font-size: 15px; font-weight: 600; }
.eq-body { overflow-y: auto; padding: 16px 20px; }
.section-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: rgba(255,255,255,0.3); margin-bottom: 10px; }
.presets-row { display: flex; flex-wrap: wrap; gap: 8px; }
.preset-chip {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
  transition: all 0.15s;
}
.preset-chip:disabled { opacity: 0.3; cursor: default; }
.preset-chip.active { font-weight: 700; }
.bands-container { display: flex; gap: 0; height: 200px; }
.band-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.band-val { font-size: 10px; font-weight: 600; white-space: nowrap; }
.band-slider-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.band-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 100%;
  height: 140px;
  cursor: pointer;
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  accent-color: var(--accent, #7c9ef0);
}
.band-slider:disabled { opacity: 0.25; cursor: default; }
.band-freq { font-size: 10px; font-weight: 500; }
.band-name { font-size: 9px; }
.effect-row {
  display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04);
  border-radius: 14px; padding: 10px 14px; margin-bottom: 8px;
}
.effect-label { font-size: 12px; font-weight: 500; width: 72px; flex-shrink: 0; }
.effect-slider { flex: 1; accent-color: var(--accent, #7c9ef0); cursor: pointer; }
.effect-slider:disabled { opacity: 0.25; cursor: default; }
.effect-pct { font-size: 11px; font-weight: 600; width: 32px; text-align: right; }
.toggle-row {
  display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04);
  border-radius: 14px; padding: 6px 14px;
}
.toggle-label { flex: 1; font-size: 12px; font-weight: 500; }
</style>

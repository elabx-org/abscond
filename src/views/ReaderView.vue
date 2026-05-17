<template>
  <div class="reader-view">
    <!-- Toolbar -->
    <div class="reader-toolbar" :class="{ hidden: hideUI }">
      <button class="tool-btn" @click="$router.back()">
        <AppIcon icon="mdi-arrow-left" :size="20" />
      </button>
      <span class="tool-title">{{ title }}</span>
      <div class="tool-actions">
        <button class="tool-btn" @click="showSettings = !showSettings">
          <AppIcon icon="mdi-format-size" :size="20" />
        </button>
      </div>
    </div>

    <!-- EPUB reader iframe -->
    <div v-if="fileType === 'epub'" class="reader-frame" @click="hideUI = !hideUI">
      <div id="epub-viewer" class="epub-viewer" />
      <div v-if="loading" class="reader-loading">
        <AppIcon icon="mdi-book-open-variant" :size="40" color="rgba(255,255,255,0.2)" />
        <p>Loading book…</p>
      </div>
    </div>

    <!-- PDF -->
    <div v-else-if="fileType === 'pdf'" class="pdf-frame">
      <iframe :src="pdfUrl" class="pdf-iframe" title="PDF reader" />
    </div>

    <!-- Unsupported -->
    <div v-else class="unsupported">
      <AppIcon icon="mdi-file-question-outline" :size="48" color="rgba(255,255,255,0.15)" />
      <p>This file type cannot be read in the browser</p>
      <p class="unsupported-sub">Use the desktop app or download directly</p>
    </div>

    <!-- Font/Theme settings -->
    <Transition name="fade">
      <div v-if="showSettings" class="reader-settings">
        <p class="rs-label">Font size</p>
        <div class="rs-row">
          <button class="rs-btn" @click="changeFontSize(-2)">A−</button>
          <span class="rs-val">{{ fontSize }}px</span>
          <button class="rs-btn" @click="changeFontSize(2)">A+</button>
        </div>
        <p class="rs-label">Theme</p>
        <div class="rs-row">
          <button
            v-for="t in themes"
            :key="t.key"
            class="theme-btn"
            :class="{ active: theme === t.key }"
            :style="{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }"
            @click="setTheme(t.key)"
          >{{ t.label }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getBaseUrl } from '@/api/client'

const route = useRoute()
const auth  = useAuthStore()

const itemId   = computed(() => route.query.itemId as string)
const fileType = ref<'epub' | 'pdf' | 'unknown'>('unknown')
const title    = ref('')
const loading  = ref(true)
const hideUI   = ref(false)
const showSettings = ref(false)
const fontSize = ref(16)
const theme    = ref<'dark' | 'sepia' | 'light'>('dark')

const themes = [
  { key: 'dark'  as const, label: 'Dark',  bg: '#111',   fg: '#e8e8e8', border: 'rgba(255,255,255,0.1)' },
  { key: 'sepia' as const, label: 'Sepia', bg: '#f4ecd8', fg: '#3d2b1a', border: '#c9b08c' },
  { key: 'light' as const, label: 'Light', bg: '#ffffff', fg: '#111',    border: '#ddd' },
]

let book: unknown = null
let rendition: unknown = null

const pdfUrl = ref('')

function changeFontSize(delta: number) {
  fontSize.value = Math.max(10, Math.min(32, fontSize.value + delta))
  applyFontSize()
}

function applyFontSize() {
  if (rendition && typeof rendition === 'object') {
    const r = rendition as { themes?: { fontSize?: (v: string) => void } }
    r.themes?.fontSize?.(`${fontSize.value}px`)
  }
}

function setTheme(t: typeof theme.value) {
  theme.value = t
  if (rendition && typeof rendition === 'object') {
    const r = rendition as { themes?: { select?: (v: string) => void } }
    r.themes?.select?.(t)
  }
}

async function loadEpub(url: string) {
  try {
    // Dynamically import epubjs — bundled via vite
    const ePub = (await import('epubjs')).default
    book = ePub(url)
    const b = book as { renderTo: (el: string, opts: Record<string, unknown>) => unknown; ready: Promise<unknown> }
    rendition = b.renderTo('epub-viewer', { width: '100%', height: '100%', spread: 'none' })
    const r = rendition as {
      display: () => Promise<void>
      themes: {
        fontSize: (v: string) => void
        register: (key: string, styles: Record<string, Record<string, Record<string, string>>>) => void
        select: (v: string) => void
        default: (styles: Record<string, Record<string, string>>) => void
      }
    }
    r.themes.register('dark',  { body: { style: { background: '#111',    color: '#e8e8e8' } } })
    r.themes.register('sepia', { body: { style: { background: '#f4ecd8', color: '#3d2b1a' } } })
    r.themes.register('light', { body: { style: { background: '#ffffff', color: '#111' } } })
    r.themes.select('dark')
    r.themes.fontSize(`${fontSize.value}px`)
    await r.display()
    loading.value = false
  } catch (e) {
    console.error('epub load error', e)
    loading.value = false
  }
}

onMounted(async () => {
  if (!itemId.value) return
  const base  = await getBaseUrl()
  const token = auth.token ?? ''

  try {
    const res = await fetch(`${base}/items/${itemId.value}?expanded=1&token=${token}`)
    const data = await res.json()
    title.value = data.media?.metadata?.title ?? 'Reading'
    const files: Array<{ ino: string; metadata: { ext: string } }> = data.libraryFiles ?? []
    const epub  = files.find(f => f.metadata.ext === '.epub')
    const pdf   = files.find(f => f.metadata.ext === '.pdf')

    if (epub) {
      fileType.value = 'epub'
      const epubUrl  = `${base}/items/${itemId.value}/ebook?token=${token}`
      await loadEpub(epubUrl)
    } else if (pdf) {
      fileType.value = 'pdf'
      pdfUrl.value   = `${base}/items/${itemId.value}/ebook?token=${token}`
      loading.value  = false
    } else {
      fileType.value = 'unknown'
      loading.value  = false
    }
  } catch {
    loading.value = false
  }
})

onUnmounted(() => {
  if (book && typeof book === 'object') {
    const b = book as { destroy?: () => void }
    b.destroy?.()
  }
})
</script>

<style scoped>
.reader-view { min-height: 100dvh; background: #111; display: flex; flex-direction: column; position: relative; }

.reader-toolbar {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  background: rgba(17,17,17,0.95); backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 10; border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: opacity 0.2s, transform 0.2s;
}
.reader-toolbar.hidden { opacity: 0; pointer-events: none; transform: translateY(-100%); }
.tool-btn { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.7); padding: 6px; }
.tool-title { flex: 1; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tool-actions { display: flex; gap: 4px; }

.reader-frame { flex: 1; position: relative; }
.epub-viewer { width: 100%; height: calc(100dvh - 56px); }
.reader-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: rgba(255,255,255,0.4); font-size: 13px; }

.pdf-iframe { width: 100%; height: calc(100dvh - 56px); border: none; }

.unsupported { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px; text-align: center; }
.unsupported p { font-size: 14px; color: rgba(255,255,255,0.5); margin: 0; }
.unsupported-sub { font-size: 12px; color: rgba(255,255,255,0.3) !important; }

.reader-settings {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  background: rgba(20,20,20,0.98); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.1); padding: 16px 20px 40px;
}
.rs-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px; }
.rs-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.rs-btn { font-size: 14px; font-weight: 700; padding: 6px 14px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); cursor: pointer; }
.rs-val { font-size: 14px; color: rgba(255,255,255,0.8); min-width: 40px; text-align: center; }
.theme-btn { padding: 8px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.theme-btn.active { outline: 2px solid #d4a017; outline-offset: 2px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

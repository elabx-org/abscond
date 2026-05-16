<template>
  <Teleport to="body">
    <Transition name="sheet">
    <div v-if="modelValue" class="match-sheet-overlay" @click.self="close">
      <div class="match-sheet">
        <div class="sheet-handle" />

        <!-- Step 1: Search -->
        <template v-if="step === 'search'">
          <div class="sheet-header">
            <p class="sheet-title">Match Metadata</p>
            <button class="sheet-close-btn" @click="close">
              <v-icon size="16">mdi-close</v-icon>
            </button>
          </div>

          <div class="sheet-body">
            <div class="provider-chips">
              <button
                v-for="p in PROVIDERS" :key="p.value"
                class="provider-chip"
                :class="{ active: provider === p.value }"
                @click="provider = p.value"
              >{{ p.label }}</button>
            </div>

            <label class="field-label">Title</label>
            <input v-model="searchTitle" class="match-input" placeholder="Title" />
            <label class="field-label">Author</label>
            <input v-model="searchAuthor" class="match-input" placeholder="Author" />

            <p v-if="error" class="match-error">{{ error }}</p>

            <button
              class="match-search-btn"
              :disabled="loading || !searchTitle.trim()"
              @click="doSearch"
            >
              <v-icon v-if="loading" size="15" class="spin">mdi-loading</v-icon>
              <v-icon v-else size="15">mdi-magnify</v-icon>
              {{ loading ? 'Searching…' : 'Search' }}
            </button>
          </div>
        </template>

        <!-- Step 2: Candidates -->
        <template v-else-if="step === 'candidates'">
          <div class="sheet-header">
            <button class="sheet-back-btn" @click="step = 'search'">
              <v-icon size="18">mdi-chevron-left</v-icon>
            </button>
            <p class="sheet-title">Match Metadata</p>
            <button class="sheet-close-btn" @click="close">
              <v-icon size="16">mdi-close</v-icon>
            </button>
          </div>

          <div class="sheet-body">
            <p class="results-count">{{ candidates.length }} result{{ candidates.length !== 1 ? 's' : '' }} from {{ providerLabel }}</p>

            <div v-if="!candidates.length" class="no-results">
              <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-book-search-outline</v-icon>
              <p>No results found</p>
              <button class="try-again-btn" @click="step = 'search'">Try again</button>
            </div>

            <div v-else class="candidates-list">
              <div
                v-for="(c, idx) in candidates"
                :key="c.id ?? `${c.title}-${idx}`"
                class="candidate-row"
                :class="{ selected: selected === c }"
                @click="selected = c"
              >
                <div class="cand-cover">
                  <img v-if="c.coverUrl" :src="c.coverUrl" :alt="c.title" />
                  <div v-else class="cand-cover-placeholder" />
                </div>
                <div class="cand-meta">
                  <p class="cand-title">{{ c.title }}</p>
                  <p class="cand-sub">{{ [c.author, c.narrator].filter(Boolean).join(' · ') }}</p>
                  <p class="cand-detail">{{ [c.publishedYear, c.publisher].filter(Boolean).join(' · ') }}</p>
                </div>
                <div class="cand-radio" :class="{ on: selected === c }" />
              </div>
            </div>

            <button
              v-if="candidates.length"
              class="match-search-btn"
              :disabled="!selected"
              @click="step = 'diff'"
            >Preview Match →</button>
          </div>
        </template>

        <!-- Step 3: Diff -->
        <template v-else-if="step === 'diff'">
          <div class="sheet-header">
            <button class="sheet-back-btn" @click="step = 'candidates'">
              <v-icon size="18">mdi-chevron-left</v-icon>
            </button>
            <p class="sheet-title">Review Changes</p>
            <button class="sheet-close-btn" @click="close">
              <v-icon size="16">mdi-close</v-icon>
            </button>
          </div>

          <div class="sheet-body">
            <div class="cover-compare">
              <div class="cover-compare-item">
                <div class="cover-old">
                  <img :src="coverUrl(item.id, auth.token ?? '')" alt="current" />
                </div>
                <p class="cover-label">Current</p>
              </div>
              <v-icon size="20" color="rgba(255,255,255,0.2)">mdi-arrow-right</v-icon>
              <div class="cover-compare-item">
                <div class="cover-new">
                  <img v-if="selected?.coverUrl" :src="selected.coverUrl" alt="new" />
                  <div v-else class="cover-new-placeholder" />
                </div>
                <p class="cover-label new">New</p>
              </div>
            </div>

            <p class="diff-section-label">Metadata changes</p>
            <div class="diff-table">
              <div v-for="row in diff" :key="row.field" class="diff-row">
                <span class="diff-field">{{ row.field }}</span>
                <template v-if="row.changed">
                  <span class="diff-old">{{ row.old ?? '—' }}</span>
                  <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-arrow-right</v-icon>
                  <span class="diff-new">{{ row.new }}</span>
                </template>
                <template v-else>
                  <span class="diff-same">{{ row.old ?? '—' }}</span>
                </template>
              </div>
            </div>

            <p v-if="error" class="match-error">{{ error }}</p>

            <button class="match-search-btn" :disabled="applying" @click="doApply">
              <v-icon v-if="applying" size="15" class="spin">mdi-loading</v-icon>
              {{ applying ? 'Applying…' : 'Apply Changes' }}
            </button>
            <button class="match-secondary-btn" @click="step = 'candidates'">Back to results</button>
          </div>
        </template>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { searchCandidates, applyMatch, type MatchCandidate } from '@/api/match'
import { getItem } from '@/api/items'
import { coverUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{ modelValue: boolean; item: LibraryItem }>()
const emit  = defineEmits<{ 'update:modelValue': [val: boolean]; matched: [item: LibraryItem] }>()
const auth  = useAuthStore()

const PROVIDERS = [
  { value: 'audible',     label: 'Audible' },
  { value: 'audible.ca',  label: 'Audible CA' },
  { value: 'audible.uk',  label: 'Audible UK' },
  { value: 'audible.de',  label: 'Audible DE' },
  { value: 'openlibrary', label: 'Open Library' },
  { value: 'itunes',      label: 'iTunes' },
]

type Step = 'search' | 'candidates' | 'diff'

const step         = ref<Step>('search')
const provider     = ref('audible')
const searchTitle  = ref('')
const searchAuthor = ref('')
const candidates   = ref<MatchCandidate[]>([])
const selected     = ref<MatchCandidate | null>(null)
const loading      = ref(false)
const applying     = ref(false)
const error        = ref<string | null>(null)

watch(() => props.modelValue, v => {
  if (v) {
    searchTitle.value  = props.item.media.metadata.title ?? ''
    searchAuthor.value = props.item.media.metadata.authorName ?? ''
  } else {
    step.value       = 'search'
    candidates.value = []
    selected.value   = null
    error.value      = null
  }
}, { immediate: true })

const providerLabel = computed(() =>
  PROVIDERS.find(p => p.value === provider.value)?.label ?? provider.value
)

interface DiffRow { field: string; old: string | null; new: string | null; changed: boolean }

const diff = computed<DiffRow[]>(() => {
  if (!selected.value) return []
  return buildDiff(props.item, selected.value)
})

function buildDiff(item: LibraryItem, c: MatchCandidate): DiffRow[] {
  const m = item.media.metadata
  const rows = [
    { field: 'Title',       oldVal: m.title,                      newVal: c.title },
    { field: 'Subtitle',    oldVal: m.subtitle,                   newVal: c.subtitle },
    { field: 'Author',      oldVal: m.authorName,                 newVal: c.author },
    { field: 'Narrator',    oldVal: m.narratorName,               newVal: c.narrator },
    { field: 'Publisher',   oldVal: m.publisher,                  newVal: c.publisher },
    { field: 'Year',        oldVal: m.publishedYear,              newVal: c.publishedYear },
    { field: 'Description', oldVal: m.description?.slice(0, 60), newVal: c.description?.slice(0, 60) },
    { field: 'Genres',      oldVal: m.genres?.join(', ') || null, newVal: c.genres?.join(', ') || null },
  ]
  return rows.map(r => {
    const oldStr = r.oldVal?.trim() || null
    const newStr = r.newVal?.trim() || null
    return { field: r.field, old: oldStr, new: newStr, changed: !!newStr && oldStr !== newStr }
  })
}

async function doSearch() {
  loading.value = true
  error.value   = null
  try {
    const results = await searchCandidates(searchTitle.value.trim(), searchAuthor.value.trim(), provider.value)
    candidates.value = results
    selected.value   = null
    step.value       = 'candidates'
  } catch {
    error.value = 'Search failed — try a different title or provider'
  } finally {
    loading.value = false
  }
}

async function doApply() {
  if (!selected.value) return
  applying.value = true
  error.value    = null
  try {
    const asin = (selected.value as MatchCandidate & { asin?: string }).asin ?? selected.value.id
    await applyMatch(props.item.id, provider.value, selected.value.title, selected.value.author || undefined, asin)
  } catch {
    error.value = 'Failed to apply match — please try again'
    applying.value = false
    return
  }
  // Fetch the authoritative updated item from the server — the server applies the
  // metadata, downloads the cover, and reconciles author/narrator records.
  // Client-side construction misses all of that.
  try {
    const updatedItem = await getItem(props.item.id)
    emit('matched', updatedItem)
  } catch {
    error.value = 'Match applied but failed to reload — please close and reopen the book'
    applying.value = false
    return
  }
  applying.value = false
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.match-sheet-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end;
}
.match-sheet {
  width: 100%; background: #1c1c1e; border-radius: 20px 20px 0 0;
  padding: 0 0 40px; max-height: 90vh; overflow-y: auto; scrollbar-width: none;
}
.match-sheet::-webkit-scrollbar { display: none; }
.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.18); margin: 10px auto 0;
}
.sheet-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px 8px;
}
.sheet-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.92); flex: 1; margin: 0; }
.sheet-close-btn {
  background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; color: rgba(255,255,255,0.5);
}
.sheet-back-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 0; display: flex; align-items: center;
}
.sheet-body { padding: 8px 16px 0; }
.provider-chips {
  display: flex; gap: 6px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;
}
.provider-chips::-webkit-scrollbar { display: none; }
.provider-chip {
  flex-shrink: 0; font-size: 11px; font-weight: 600;
  padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.provider-chip.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017;
}
.field-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); display: block; margin-bottom: 4px; }
.match-input {
  width: 100%; background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  padding: 9px 12px; font-size: 13px; color: rgba(255,255,255,0.9);
  outline: none; margin-bottom: 10px; box-sizing: border-box;
}
.match-input:focus { border-color: rgba(212,160,23,0.4); }
.match-search-btn {
  width: 100%; background: #d4a017; color: #111;
  font-size: 13px; font-weight: 700; padding: 12px; border-radius: 12px;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 4px;
}
.match-search-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.match-secondary-btn {
  width: 100%; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
  font-size: 12px; font-weight: 600; padding: 10px; border-radius: 12px;
  border: none; cursor: pointer; margin-top: 8px;
}
.match-error { font-size: 11px; color: rgba(255,80,80,0.85); margin: 6px 0; }
.results-count { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 10px; }
.no-results { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 0; color: rgba(255,255,255,0.35); font-size: 12px; }
.no-results p { margin: 0; }
.try-again-btn { background: transparent; border: none; color: #d4a017; font-size: 12px; font-weight: 600; cursor: pointer; }
.candidates-list { display: flex; flex-direction: column; margin-bottom: 12px; }
.candidate-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 8px; border-radius: 8px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.candidate-row:last-child { border-bottom: none; }
.candidate-row.selected { background: rgba(212,160,23,0.06); }
.cand-cover { width: 40px; height: 56px; border-radius: 5px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.06); }
.cand-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cand-cover-placeholder { width: 100%; height: 100%; }
.cand-meta { flex: 1; min-width: 0; }
.cand-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.88); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-sub   { font-size: 10px; color: rgba(255,255,255,0.45); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-detail{ font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-radio { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.2); flex-shrink: 0; margin-top: 2px; }
.cand-radio.on { background: #d4a017; border-color: #d4a017; position: relative; }
.cand-radio.on::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #111; }
.cover-compare { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cover-compare-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.cover-old { width: 52px; height: 68px; border-radius: 6px; overflow: hidden; opacity: 0.5; position: relative; }
.cover-old::after { content: ''; position: absolute; inset: 0; background: rgba(255,60,60,0.2); }
.cover-old img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-new { width: 52px; height: 68px; border-radius: 6px; overflow: hidden; border: 1.5px solid #4ade80; }
.cover-new img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-new-placeholder { width: 100%; height: 100%; background: rgba(255,255,255,0.06); }
.cover-label { font-size: 9px; color: rgba(255,255,255,0.25); }
.cover-label.new { color: #4ade80; }
.diff-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
.diff-table { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.diff-row { display: flex; align-items: center; gap: 6px; }
.diff-field { font-size: 9px; color: rgba(255,255,255,0.3); width: 64px; flex-shrink: 0; }
.diff-old { font-size: 10px; color: rgba(255,80,80,0.7); text-decoration: line-through; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.diff-new { font-size: 10px; color: #4ade80; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.diff-same { font-size: 10px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .match-sheet, .sheet-leave-active .match-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .match-sheet, .sheet-leave-to .match-sheet { transform: translateY(100%); }
@media (min-width: 520px) {
  .match-sheet-overlay { align-items: center; justify-content: center; }
  .match-sheet {
    width: 480px; max-width: 90vw; border-radius: 20px; max-height: 80vh; border-top: none;
  }
  .sheet-handle { display: none; }
  .sheet-enter-from .match-sheet, .sheet-leave-to .match-sheet { transform: scale(0.96) translateY(8px); }
}
</style>

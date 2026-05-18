<template>
  <div
    class="collections-view"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <Transition name="ptr">
      <div v-if="ptr.pulling || ptr.refreshing" class="ptr-indicator">
        <AppIcon :icon="ptr.refreshing ? 'mdi-loading' : 'mdi-arrow-down'" :size="18" color="rgba(255,255,255,0.5)" :class="{ spin: ptr.refreshing }" />
      </div>
    </Transition>
    <div class="view-header">
      <h2 class="screen-title">Collections</h2>
      <button class="add-btn" @click="showCreate = true">
        <AppIcon icon="mdi-plus" :size="20" />
      </button>
    </div>

    <!-- Search -->
    <div v-if="!loading && collections.length" class="col-search-wrap">
      <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
      <input v-model="colSearch" class="col-search" placeholder="Search collections…" />
      <button v-if="colSearch" class="col-search-clear" @click="colSearch = ''">
        <AppIcon icon="mdi-close" :size="12" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid">
      <div v-for="n in 6" :key="n" class="col-skeleton">
        <div class="skel-cover" />
        <div class="skel-line" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!collections.length" class="empty-state">
      <AppIcon icon="mdi-bookmark-multiple-outline" :size="40" color="rgba(255,255,255,0.15)" />
      <p>No collections yet</p>
      <button class="create-btn" @click="showCreate = true">Create one</button>
    </div>

    <!-- No search match -->
    <div v-else-if="!filteredCollections.length && colSearch" class="empty-state" style="padding: 30px 0">
      <p>No collections match "{{ colSearch }}"</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid">
      <div
        v-for="col in filteredCollections"
        :key="col.id"
        class="col-card"
        @click="selectedCol = col"
      >
        <!-- Cover collage (up to 4) -->
        <div class="col-cover">
          <div class="collage" :class="`collage--${Math.min(col.books.length, 4)}`">
            <img
              v-for="(b, i) in col.books.slice(0, 4)"
              :key="b.id"
              :src="coverUrl(b.id, auth.token ?? '')"
              class="collage-img"
              :style="{ gridArea: `c${i + 1}` }"
            />
            <div v-if="!col.books.length" class="collage-placeholder">
              <AppIcon icon="mdi-bookmark-multiple" :size="28" color="rgba(255,255,255,0.2)" />
            </div>
          </div>
        </div>
        <p class="col-name">{{ col.name }}</p>
        <p class="col-count">{{ col.books.length }} books</p>
      </div>
    </div>

    <!-- Collection detail sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="selectedCol" class="sheet-backdrop" @click.self="selectedCol = null">
          <div class="col-sheet">
            <div class="drag-handle-area">
              <div class="drag-handle" />
            </div>
            <div class="col-sheet-content">
              <div class="col-sheet-header">
                <button class="sheet-close" @click="selectedCol = null">
                  <AppIcon icon="mdi-close" :size="20" />
                </button>
                <h3 class="col-sheet-title">{{ selectedCol.name }}</h3>
                <p v-if="selectedCol.description" class="col-sheet-desc">{{ selectedCol.description }}</p>
                <button class="del-col-btn" @click="confirmDelete(selectedCol)">
                  <AppIcon icon="mdi-delete-outline" :size="14" />
                  Delete collection
                </button>
              </div>
              <div v-if="!selectedCol.books.length" class="empty-state">
                <AppIcon icon="mdi-book-open-blank-variant" :size="32" color="rgba(255,255,255,0.15)" />
                <p>No books in this collection</p>
              </div>
              <div v-else class="col-book-list">
                <div
                  v-for="b in selectedCol.books"
                  :key="b.id"
                  class="col-book-row"
                  @click="openBook(b)"
                >
                  <img :src="coverUrl(b.id, auth.token ?? '')" class="col-book-thumb" />
                  <div class="col-book-info">
                    <p class="col-book-title">{{ b.media.metadata.title }}</p>
                    <p class="col-book-author">{{ getAuthorDisplay(b) || 'Unknown' }}</p>
                  </div>
                  <button class="col-book-del" @click.stop="removeBook(b.id)">
                    <AppIcon icon="mdi-close" :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create collection sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreate" class="sheet-backdrop" @click.self="showCreate = false">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">New Collection</h3>
              <input v-model="newName" class="form-input" placeholder="Collection name" />
              <textarea v-model="newDesc" class="form-input form-textarea" placeholder="Description (optional)" />
              <button class="save-btn" :disabled="!newName.trim() || saving" @click="doCreate">
                {{ saving ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteTarget" class="sheet-backdrop" @click.self="deleteTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Delete Collection</h3>
              <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px">Delete <strong style="color:rgba(255,255,255,0.9)">{{ deleteTarget.name }}</strong>?</p>
              <button class="del-confirm-btn" :disabled="deleting" @click="doDelete">{{ deleting ? 'Deleting…' : 'Delete' }}</button>
              <button class="cancel-btn" @click="deleteTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Book detail sheet when tapped from collection -->
    <BookDetailSheet
      v-if="detailItem"
      :item="detailItem"
      :cover-src="coverUrl(detailItem.id, auth.token ?? '')"
      :show="!!detailItem"
      @close="detailItem = null"
      @item-updated="(u) => detailItem = u"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, ref, computed } from 'vue'
import { getCollections, createCollection, deleteCollection, removeBookFromCollection } from '@/api/collections'
import { coverUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { Collection } from '@/api/collections'
import type { LibraryItem } from '@/api/types'
import { getAuthorDisplay } from '@/utils/metadata'

const auth = useAuthStore()
const lib  = useLibraryStore()

const ptr = ref({ pulling: false, refreshing: false, startY: 0 })

function onTouchStart(e: TouchEvent) {
  if (window.scrollY > 0) return
  ptr.value.startY = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (!ptr.value.startY) return
  ptr.value.pulling = e.touches[0].clientY - ptr.value.startY > 40
}

async function onTouchEnd() {
  if (ptr.value.pulling) {
    ptr.value.pulling = false
    ptr.value.refreshing = true
    try { collections.value = await getCollections() } catch { /* ignore */ }
    finally { ptr.value.refreshing = false }
  }
  ptr.value.pulling = false
  ptr.value.startY = 0
}

const loading     = ref(true)
const collections = ref<Collection[]>([])
const selectedCol = ref<Collection | null>(null)
const showCreate  = ref(false)
const newName     = ref('')
const newDesc     = ref('')
const saving      = ref(false)
const detailItem  = ref<LibraryItem | null>(null)
const deleteTarget = ref<Collection | null>(null)
const deleting     = ref(false)
const colSearch    = ref('')

const filteredCollections = computed(() => {
  const q = colSearch.value.trim().toLowerCase()
  if (!q) return collections.value
  return collections.value.filter(c => c.name.toLowerCase().includes(q))
})

function openBook(item: LibraryItem) {
  selectedCol.value = null
  detailItem.value  = item
}

function confirmDelete(col: Collection) {
  selectedCol.value = null
  deleteTarget.value = col
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteCollection(deleteTarget.value.id)
    collections.value = collections.value.filter(c => c.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } finally { deleting.value = false }
}

async function removeBook(bookId: string) {
  if (!selectedCol.value) return
  try {
    await removeBookFromCollection(selectedCol.value.id, bookId)
    selectedCol.value.books = selectedCol.value.books.filter(b => b.id !== bookId)
  } catch { /* ignore */ }
}

async function doCreate() {
  if (!newName.value.trim() || !lib.activeLibraryId) return
  saving.value = true
  try {
    const col = await createCollection(newName.value.trim(), newDesc.value, lib.activeLibraryId)
    collections.value.unshift(col)
    showCreate.value = false
    newName.value    = ''
    newDesc.value    = ''
  } finally { saving.value = false }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  try { collections.value = await getCollections() }
  catch { /* server may not have collections */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.collections-view { min-height: 100dvh; padding: 16px 12px 60px; }

.ptr-indicator { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 8px; background: rgba(14,14,14,0.85); backdrop-filter: blur(4px); }
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s, transform 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; transform: translateY(-100%); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
.add-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer; color: rgba(255,255,255,0.7);
  display: flex; align-items: center; justify-content: center;
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }

.col-skeleton { display: flex; flex-direction: column; gap: 6px; }
.skel-cover {
  aspect-ratio: 1; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.col-card { cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
.col-cover {
  aspect-ratio: 1; border-radius: 10px; overflow: hidden;
  background: #141414;
}
.collage { width: 100%; height: 100%; display: grid; }
.collage--0 { place-items: center; }
.collage-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.collage--1 { grid-template-areas: "c1 c1" "c1 c1"; }
.collage--2 { grid-template-areas: "c1 c2" "c1 c2"; grid-template-columns: 1fr 1fr; }
.collage--3 { grid-template-areas: "c1 c2" "c1 c3"; grid-template-columns: 1fr 1fr; }
.collage--4 { grid-template-areas: "c1 c2" "c3 c4"; grid-template-columns: 1fr 1fr; }
.collage-img { width: 100%; height: 100%; object-fit: cover; }
.col-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); margin: 0; }
.col-count { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }

.col-search-wrap {
  display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 8px 12px;
}
.col-search { flex: 1; background: transparent; border: none; outline: none; font-size: 13px; color: rgba(255,255,255,0.85); }
.col-search::placeholder { color: rgba(255,255,255,0.3); }
.col-search-clear { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 0; color: rgba(255,255,255,0.4); font-size: 13px;
}
.create-btn {
  font-size: 13px; padding: 8px 20px; border-radius: 20px; cursor: pointer;
  background: rgba(212,160,23,0.15); border: 1px solid rgba(212,160,23,0.3);
  color: #d4a017;
}

/* Sheet */
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55);
}
.col-sheet {
  position: absolute; bottom: 0; left: 0; right: 0; height: 85vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.col-sheet-content { flex: 1; overflow-y: auto; scrollbar-width: none; padding: 8px 16px 40px; }
.sheet-close {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 4px; float: right;
}
.col-sheet-header { margin-bottom: 16px; }
.col-sheet-title { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; clear: both; }
.col-sheet-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
.col-book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }

/* Create sheet */
.create-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; overflow: hidden;
}
.create-content { padding: 8px 20px 40px; }
.create-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }
.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; margin-bottom: 10px; box-sizing: border-box;
}
.form-textarea { height: 80px; resize: none; font-family: inherit; }
.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

.del-col-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(220,80,80,0.7); background: transparent; border: none; cursor: pointer; padding: 0; margin-top: 6px; }
.col-book-list { display: flex; flex-direction: column; }
.col-book-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
.col-book-thumb { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.col-book-info { flex: 1; min-width: 0; }
.col-book-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-book-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.col-book-del { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 4px; flex-shrink: 0; }
.del-confirm-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #c0392b; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.del-confirm-btn:disabled { opacity: 0.5; }
.cancel-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; }
</style>

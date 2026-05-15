<template>
  <div class="playlists-view">
    <div class="view-header">
      <h2 class="screen-title">Playlists</h2>
      <button class="add-btn" @click="showCreate = true">
        <v-icon size="20">mdi-plus</v-icon>
      </button>
    </div>

    <div v-if="loading" class="grid">
      <div v-for="n in 6" :key="n" class="pl-skeleton">
        <div class="skel-cover" />
        <div class="skel-line" />
      </div>
    </div>

    <div v-else-if="!playlists.length" class="empty-state">
      <v-icon size="40" color="rgba(255,255,255,0.15)">mdi-playlist-music</v-icon>
      <p>No playlists yet</p>
      <button class="create-btn" @click="showCreate = true">Create one</button>
    </div>

    <div v-else class="grid">
      <div
        v-for="pl in playlists"
        :key="pl.id"
        class="pl-card"
        @click="selected = pl"
      >
        <div class="pl-cover">
          <div class="collage" :class="`collage--${Math.min(pl.items.length, 4)}`">
            <img
              v-for="(item, i) in pl.items.slice(0, 4)"
              :key="item.libraryItemId"
              :src="coverUrl(item.libraryItemId, auth.token ?? '')"
              class="collage-img"
              :style="{ gridArea: `c${i + 1}` }"
            />
            <div v-if="!pl.items.length" class="collage-placeholder">
              <v-icon size="28" color="rgba(255,255,255,0.2)">mdi-playlist-music</v-icon>
            </div>
          </div>
        </div>
        <p class="pl-name">{{ pl.name }}</p>
        <p class="pl-count">{{ pl.items.length }} items</p>
      </div>
    </div>

    <!-- Playlist detail sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="selected" class="sheet-backdrop" @click.self="selected = null">
          <div class="pl-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="pl-sheet-content">
              <div class="sheet-head">
                <button class="sheet-close" @click="selected = null">
                  <v-icon size="20">mdi-close</v-icon>
                </button>
                <h3 class="sheet-title">{{ selected.name }}</h3>
                <p v-if="selected.description" class="sheet-desc">{{ selected.description }}</p>
                <div class="sheet-actions">
                  <button
                    v-if="selected.items.length"
                    class="play-all-btn"
                    @click="playAll(selected)"
                  >
                    <v-icon size="14" color="#111">mdi-play</v-icon>
                    Play all
                  </button>
                  <button class="rename-pl-btn" @click="openRename(selected)">
                    <v-icon size="14">mdi-pencil-outline</v-icon>
                    Rename
                  </button>
                  <button class="del-pl-btn" @click="confirmDeletePl(selected)">
                    <v-icon size="14">mdi-delete-outline</v-icon>
                    Delete
                  </button>
                </div>
              </div>
              <div v-if="!selected.items.length" class="empty-state">
                <v-icon size="32" color="rgba(255,255,255,0.15)">mdi-playlist-music</v-icon>
                <p>No items in this playlist</p>
              </div>
              <div v-else class="pl-item-list">
                <div
                  v-for="(item, idx) in selected.items"
                  :key="item.libraryItemId + (item.episodeId ?? '')"
                  class="pl-item-row"
                  @click="openItem(item)"
                >
                  <span class="pl-idx">{{ idx + 1 }}</span>
                  <img :src="coverUrl(item.libraryItemId, auth.token ?? '')" class="pl-thumb" />
                  <div class="pl-item-info">
                    <p class="pl-item-title">{{ item.libraryItem.media.metadata.title }}</p>
                    <p class="pl-item-author">{{ (item.libraryItem.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown' }}</p>
                  </div>
                  <button class="pl-item-del" @click.stop="removeItem(item)">
                    <v-icon size="14">mdi-close</v-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create playlist sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreate" class="sheet-backdrop" @click.self="showCreate = false">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">New Playlist</h3>
              <input v-model="newName" class="form-input" placeholder="Playlist name" />
              <textarea v-model="newDesc" class="form-input form-textarea" placeholder="Description (optional)" />
              <button class="save-btn" :disabled="!newName.trim() || saving" @click="doCreate">
                {{ saving ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteTarget" class="sheet-backdrop" @click.self="deleteTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Delete Playlist</h3>
              <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px">Delete <strong style="color:rgba(255,255,255,0.9)">{{ deleteTarget.name }}</strong>?</p>
              <button class="del-confirm-btn" :disabled="deleting" @click="doDeletePl">{{ deleting ? 'Deleting…' : 'Delete' }}</button>
              <button class="cancel-btn" @click="deleteTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Rename playlist sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="renameTarget" class="sheet-backdrop" @click.self="renameTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Rename Playlist</h3>
              <input v-model="renameValue" class="form-input" placeholder="Playlist name" />
              <button class="save-btn" :disabled="!renameValue.trim() || renaming" @click="doRename">
                {{ renaming ? 'Saving…' : 'Save' }}
              </button>
              <button class="cancel-btn" @click="renameTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <BookDetailSheet
      v-if="detailItem"
      :item="detailItem"
      :cover-src="coverUrl(detailItem.id, auth.token ?? '')"
      :show="!!detailItem"
      @close="detailItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getPlaylists, createPlaylist, deletePlaylist, removeItemFromPlaylist, updatePlaylist } from '@/api/playlists'
import { coverUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useRouter } from 'vue-router'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { Playlist, PlaylistItem } from '@/api/playlists'
import type { LibraryItem } from '@/api/types'

const auth   = useAuthStore()
const lib    = useLibraryStore()
const player = usePlayerStore()
const router = useRouter()

const loading    = ref(true)
const playlists  = ref<Playlist[]>([])
const selected   = ref<Playlist | null>(null)
const showCreate = ref(false)
const newName    = ref('')
const newDesc    = ref('')
const saving     = ref(false)
const detailItem   = ref<LibraryItem | null>(null)
const deleteTarget = ref<Playlist | null>(null)
const deleting     = ref(false)
const renameTarget = ref<Playlist | null>(null)
const renameValue  = ref('')
const renaming     = ref(false)

function openItem(item: PlaylistItem) {
  selected.value   = null
  detailItem.value = item.libraryItem
}

async function playAll(pl: Playlist) {
  if (!pl.items.length) return
  selected.value = null
  const first = pl.items[0].libraryItem
  // Queue the rest
  player.clearQueue()
  pl.items.slice(1).forEach(i => player.addToQueue(i.libraryItem))
  await player.play(first)
  router.push({ name: 'player' })
}

function openRename(pl: Playlist) {
  renameTarget.value = pl
  renameValue.value  = pl.name
}

async function doRename() {
  if (!renameTarget.value || !renameValue.value.trim()) return
  renaming.value = true
  try {
    await updatePlaylist(renameTarget.value.id, { name: renameValue.value.trim() })
    renameTarget.value.name = renameValue.value.trim()
    if (selected.value?.id === renameTarget.value.id) selected.value.name = renameValue.value.trim()
    renameTarget.value = null
  } finally { renaming.value = false }
}

function confirmDeletePl(pl: Playlist) {
  selected.value    = null
  deleteTarget.value = pl
}

async function doCreate() {
  if (!newName.value.trim() || !lib.activeLibraryId) return
  saving.value = true
  try {
    const pl = await createPlaylist(newName.value.trim(), newDesc.value, lib.activeLibraryId)
    playlists.value.unshift(pl)
    showCreate.value = false
    newName.value    = ''
    newDesc.value    = ''
  } finally { saving.value = false }
}

async function doDeletePl() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deletePlaylist(deleteTarget.value.id)
    playlists.value  = playlists.value.filter(p => p.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } finally { deleting.value = false }
}

async function removeItem(item: PlaylistItem) {
  if (!selected.value) return
  try {
    await removeItemFromPlaylist(selected.value.id, item.libraryItemId, item.episodeId ?? undefined)
    selected.value.items = selected.value.items.filter(
      i => !(i.libraryItemId === item.libraryItemId && i.episodeId === item.episodeId)
    )
  } catch { /* ignore */ }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  try { playlists.value = await getPlaylists() }
  catch { /* server may not support playlists */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.playlists-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 60px; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
.add-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer; color: rgba(255,255,255,0.7);
  display: flex; align-items: center; justify-content: center;
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
.pl-skeleton { display: flex; flex-direction: column; gap: 6px; }
.skel-cover { aspect-ratio: 1; border-radius: 10px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.pl-card { cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
.pl-cover { aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #141414; }
.collage { width: 100%; height: 100%; display: grid; }
.collage--0 { place-items: center; }
.collage-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.collage--1 { grid-template-areas: "c1 c1" "c1 c1"; }
.collage--2 { grid-template-areas: "c1 c2" "c1 c2"; grid-template-columns: 1fr 1fr; }
.collage--3 { grid-template-areas: "c1 c2" "c1 c3"; grid-template-columns: 1fr 1fr; }
.collage--4 { grid-template-areas: "c1 c2" "c3 c4"; grid-template-columns: 1fr 1fr; }
.collage-img { width: 100%; height: 100%; object-fit: cover; }
.pl-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); margin: 0; }
.pl-count { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: rgba(255,255,255,0.4); font-size: 13px; }
.create-btn { font-size: 13px; padding: 8px 20px; border-radius: 20px; cursor: pointer; background: rgba(212,160,23,0.15); border: 1px solid rgba(212,160,23,0.3); color: #d4a017; }

.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.pl-sheet { position: absolute; bottom: 0; left: 0; right: 0; height: 85vh; border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); background: #111; display: flex; flex-direction: column; overflow: hidden; }
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.pl-sheet-content { flex: 1; overflow-y: auto; scrollbar-width: none; padding: 8px 16px 40px; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.5); padding: 4px; float: right; }
.sheet-head { margin-bottom: 16px; }
.sheet-title { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; clear: both; }
.sheet-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 10px; }
.sheet-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.play-all-btn {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 12px;
  border-radius: 8px; background: #d4a017; border: none; cursor: pointer; color: #111; font-weight: 700;
}
.rename-pl-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.del-pl-btn { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(220,80,80,0.7); background: rgba(220,80,80,0.06); border: 1px solid rgba(220,80,80,0.15); border-radius: 8px; padding: 6px 12px; cursor: pointer; }

.pl-item-list { display: flex; flex-direction: column; }
.pl-item-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
.pl-idx { font-size: 12px; color: rgba(255,255,255,0.3); width: 16px; text-align: right; flex-shrink: 0; }
.pl-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.pl-item-info { flex: 1; min-width: 0; }
.pl-item-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-item-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.pl-item-del { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 4px; flex-shrink: 0; }

.create-sheet { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); background: #111; overflow: hidden; }
.create-content { padding: 8px 20px 40px; }
.create-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }
.form-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: rgba(255,255,255,0.9); outline: none; margin-bottom: 10px; box-sizing: border-box; }
.form-textarea { height: 80px; resize: none; font-family: inherit; }
.save-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #d4a017; color: white; font-size: 15px; font-weight: 700; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.del-confirm-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #c0392b; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.del-confirm-btn:disabled { opacity: 0.5; }
.cancel-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

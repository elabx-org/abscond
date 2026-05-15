<template>
  <div class="admin-backups">
    <div class="section-header">
      <h3 class="section-title">Backups</h3>
      <button class="add-btn" :disabled="creating" @click="doCreate">
        <v-icon size="16">{{ creating ? 'mdi-loading' : 'mdi-plus' }}</v-icon>
        <span>{{ creating ? 'Creating…' : 'New' }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 3" :key="n" class="skel-row" />
    </div>

    <div v-else-if="!backups.length" class="empty-state">
      <v-icon size="36" color="rgba(255,255,255,0.15)">mdi-backup-restore</v-icon>
      <p>No backups yet</p>
    </div>

    <div v-else class="backup-list">
      <div v-for="b in backups" :key="b.id" class="backup-row">
        <v-icon size="20" color="rgba(255,255,255,0.4)">mdi-database</v-icon>
        <div class="backup-info">
          <p class="backup-filename">{{ b.filename }}</p>
          <p class="backup-meta">{{ formatSize(b.fileSize) }} · {{ formatDate(b.createdAt) }}</p>
        </div>
        <button class="del-btn" @click="confirmDelete(b)">
          <v-icon size="16">mdi-delete-outline</v-icon>
        </button>
      </div>
    </div>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteTarget" class="sheet-backdrop" @click.self="deleteTarget = null">
          <div class="confirm-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Delete Backup</h3>
              <p class="confirm-text">Delete <strong>{{ deleteTarget.filename }}</strong>?</p>
              <button class="del-confirm-btn" :disabled="deleting" @click="doDelete">
                {{ deleting ? 'Deleting…' : 'Delete' }}
              </button>
              <button class="cancel-btn" @click="deleteTarget = null">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getBackups, createBackup, deleteBackup } from '@/api/admin'
import type { AdminBackup } from '@/api/admin'

const loading      = ref(true)
const backups      = ref<AdminBackup[]>([])
const creating     = ref(false)
const deleteTarget = ref<AdminBackup | null>(null)
const deleting     = ref(false)

function confirmDelete(b: AdminBackup) { deleteTarget.value = b }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function doCreate() {
  creating.value = true
  try {
    await createBackup()
    backups.value = await getBackups()
  } catch { /* ignore */ }
  finally { creating.value = false }
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteBackup(deleteTarget.value.id)
    backups.value  = backups.value.filter(b => b.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch { /* ignore */ }
  finally { deleting.value = false }
}

onMounted(async () => {
  try { backups.value = await getBackups() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-backups { padding: 4px 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.add-btn {
  display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 6px 12px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer;
}
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-state { display: flex; flex-direction: column; gap: 8px; }
.skel-row { height: 56px; border-radius: 10px; background: #1a1a1a; animation: shimmer 1.5s infinite;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: rgba(255,255,255,0.4); font-size: 13px; }
.backup-list { display: flex; flex-direction: column; gap: 0; }
.backup-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.backup-info { flex: 1; }
.backup-filename { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.backup-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.del-btn { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 6px; }

.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.confirm-sheet { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); background: #111; overflow: hidden; }
.drag-handle-area { padding: 10px 0 4px; cursor: grab; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.create-content { padding: 8px 20px 40px; }
.create-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }
.confirm-text { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 20px; }
.confirm-text strong { color: rgba(255,255,255,0.9); }
.del-confirm-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; background: #c0392b; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.del-confirm-btn:disabled { opacity: 0.5; }
.cancel-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

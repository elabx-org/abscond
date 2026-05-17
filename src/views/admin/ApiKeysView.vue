<template>
  <div class="admin-api-keys">
    <div class="section-header">
      <h3 class="section-title">API Keys</h3>
      <button class="add-btn" @click="showCreate = true">
        <AppIcon icon="mdi-plus" :size="16" />
        <span>New Key</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 4" :key="n" class="skel-row" />
    </div>

    <div v-else-if="keys.length === 0" class="empty-state">
      <AppIcon icon="mdi-key-off-outline" :size="40" color="rgba(255,255,255,0.2)" />
      <p class="empty-text">No API keys</p>
    </div>

    <div v-else class="key-list">
      <template v-for="k in keys" :key="k.id">
        <div class="key-row">
          <AppIcon icon="mdi-key-outline" :size="18" color="#d4a017" class="key-icon" />
          <div class="key-info">
            <p class="key-name">{{ k.name }}</p>
            <p class="key-meta">
              <span class="meta-dim">{{ ownerName(k) }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-dim">{{ fmtDate(k.createdAt) }}</span>
            </p>
          </div>
          <div class="key-right">
            <span class="badge" :class="k.isActive ? 'active' : 'inactive'">
              {{ k.isActive ? 'active' : 'inactive' }}
            </span>
            <button class="del-btn" @click="toggleConfirm(k.id)">
              <AppIcon icon="mdi-delete-outline" :size="18" />
            </button>
          </div>
        </div>
        <div v-if="confirmId === k.id" class="confirm-row">
          <span class="confirm-label">Delete "{{ k.name }}"?</span>
          <button class="confirm-yes" :disabled="deleting" @click="doDelete(k.id)">
            {{ deleting ? 'Deleting…' : 'Confirm delete' }}
          </button>
          <button class="confirm-cancel" @click="confirmId = null">Cancel</button>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreate" class="sheet-backdrop" @click.self="closeSheet">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="sheet-content">
              <h3 class="sheet-title">New API Key</h3>
              <input
                v-model="newName"
                class="form-input"
                placeholder="Key name"
                autocomplete="off"
              />
              <AppSelect
                v-model="newUserId"
                :options="selectableUsers.map(u => ({ value: u.id, label: u.username }))"
                placeholder="Select user"
                :full="true"
                style="margin-bottom:10px"
              />
              <AppSelect
                v-model="newExpiresIn"
                :options="[
                  { value: undefined, label: 'Never' },
                  { value: 2592000, label: '30 days' },
                  { value: 7776000, label: '90 days' },
                  { value: 31536000, label: '1 year' },
                ]"
                :full="true"
                style="margin-bottom:10px"
              />
              <p v-if="createError" class="form-error">{{ createError }}</p>
              <button
                class="save-btn"
                :disabled="!canCreate || saving"
                @click="doCreate"
              >
                {{ saving ? 'Creating…' : 'Create Key' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getApiKeys, createApiKey, deleteApiKey, getUsers } from '@/api/admin'
import type { ApiKey, AdminUser } from '@/api/admin'
import AppSelect from '@/components/common/AppSelect.vue'

const loading = ref(true)
const keys    = ref<ApiKey[]>([])
const users   = ref<AdminUser[]>([])

const showCreate   = ref(false)
const newName      = ref('')
const newUserId    = ref('')
const newExpiresIn = ref<number | undefined>(undefined)
const saving       = ref(false)
const createError  = ref('')

const confirmId = ref<string | null>(null)
const deleting  = ref(false)

const selectableUsers = computed(() =>
  users.value.filter(u => u.type !== 'root')
)

const canCreate = computed(() =>
  newName.value.trim().length > 0 && newUserId.value.length > 0
)

function ownerName(k: ApiKey): string {
  if (k.user?.username) return k.user.username
  const u = users.value.find(u => u.id === k.userId)
  return u?.username ?? k.userId
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function toggleConfirm(id: string) {
  confirmId.value = confirmId.value === id ? null : id
}

function closeSheet() {
  showCreate.value  = false
  newName.value     = ''
  newUserId.value   = ''
  newExpiresIn.value = undefined
  createError.value = ''
}

async function doCreate() {
  if (!canCreate.value) return
  saving.value      = true
  createError.value = ''
  try {
    const payload: { name: string; userId: string; expiresIn?: number } = {
      name:   newName.value.trim(),
      userId: newUserId.value,
    }
    if (newExpiresIn.value !== undefined) {
      payload.expiresIn = newExpiresIn.value
    }
    const k = await createApiKey(payload)
    keys.value.push(k)
    closeSheet()
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Failed to create key'
  } finally {
    saving.value = false
  }
}

async function doDelete(id: string) {
  deleting.value = true
  try {
    await deleteApiKey(id)
    keys.value  = keys.value.filter(k => k.id !== id)
    confirmId.value = null
  } catch { /* ignore */ }
  finally { deleting.value = false }
}

onMounted(async () => {
  try {
    const [fetchedKeys, fetchedUsers] = await Promise.all([
      getApiKeys().catch(() => [] as ApiKey[]),
      getUsers().catch(() => [] as AdminUser[]),
    ])
    keys.value  = fetchedKeys
    users.value = fetchedUsers
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin-api-keys { padding: 4px 0; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title  { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }

.add-btn {
  display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 6px 12px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer;
}

.loading-state { display: flex; flex-direction: column; gap: 8px; }
.skel-row {
  height: 52px; border-radius: 10px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 48px 0; color: rgba(255,255,255,0.3);
}
.empty-text { font-size: 13px; margin: 0; }

.key-list { display: flex; flex-direction: column; }

.key-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.key-icon { flex-shrink: 0; }
.key-info { flex: 1; min-width: 0; }
.key-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
.key-meta { display: flex; align-items: center; gap: 5px; margin: 0; }
.meta-dim { font-size: 11px; color: rgba(255,255,255,0.35); }
.meta-sep { font-size: 11px; color: rgba(255,255,255,0.2); }

.key-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.badge { font-size: 10px; padding: 2px 7px; border-radius: 10px; }
.badge.active   { background: rgba(34,197,94,0.15);  color: #22c55e; }
.badge.inactive { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); }

.del-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.3); padding: 4px; border-radius: 6px;
  transition: color 0.15s;
}
.del-btn:hover { color: rgba(220,50,50,0.8); }

.confirm-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0 12px 30px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.confirm-label { font-size: 12px; color: rgba(255,255,255,0.5); flex: 1; }
.confirm-yes {
  font-size: 12px; padding: 5px 12px; border-radius: 7px;
  background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.3);
  color: #e05555; cursor: pointer;
}
.confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }
.confirm-cancel {
  font-size: 12px; padding: 5px 12px; border-radius: 7px;
  background: transparent; border: none;
  color: rgba(255,255,255,0.4); cursor: pointer;
}

.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.create-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-content { padding: 8px 20px 40px; }
.sheet-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }

.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 13px;
  color: rgba(255,255,255,0.9); outline: none; margin-bottom: 10px; box-sizing: border-box;
}
.form-select { appearance: none; }
.form-error { font-size: 12px; color: #e05555; margin: 0 0 10px; }

.save-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #d4a017; color: white; font-size: 15px; font-weight: 700; margin-top: 4px;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>

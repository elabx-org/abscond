<template>
  <div class="admin-users">
    <div class="section-header">
      <h3 class="section-title">Users</h3>
      <button class="add-btn" @click="showCreate = true">
        <v-icon size="16">mdi-plus</v-icon>
        <span>Add</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="n in 4" :key="n" class="skel-row" />
    </div>

    <div v-else class="user-list">
      <div v-for="u in users" :key="u.id" class="user-row">
        <div class="user-avatar">{{ u.username[0].toUpperCase() }}</div>
        <div class="user-info">
          <p class="user-name">{{ u.username }}</p>
          <p class="user-meta">
            <span class="badge" :class="u.type">{{ u.type }}</span>
            <span v-if="!u.isActive" class="badge inactive">inactive</span>
            <span v-if="u.lastSeen" class="seen">seen {{ timeAgo(u.lastSeen) }}</span>
          </p>
        </div>
        <button v-if="u.type !== 'root'" class="edit-btn" @click="openEdit(u)">
          <v-icon size="16">mdi-pencil-outline</v-icon>
        </button>
        <button v-if="u.type !== 'root'" class="del-btn" @click="confirmDelete(u)">
          <v-icon size="16">mdi-delete-outline</v-icon>
        </button>
      </div>
    </div>

    <!-- Create user sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showCreate" class="sheet-backdrop" @click.self="showCreate = false">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">New User</h3>
              <input v-model="newUsername" class="form-input" placeholder="Username" autocomplete="off" />
              <input v-model="newPassword" class="form-input" type="password" placeholder="Password" autocomplete="new-password" />
              <select v-model="newType" class="form-input form-select">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              <p v-if="createError" class="form-error">{{ createError }}</p>
              <button class="save-btn" :disabled="!canCreate || saving" @click="doCreate">
                {{ saving ? 'Creating…' : 'Create User' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit permissions sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editTarget" class="sheet-backdrop" @click.self="editTarget = null">
          <div class="create-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Edit — {{ editTarget.username }}</h3>

              <!-- Active toggle -->
              <div class="perm-row" @click="editActive = !editActive">
                <div class="perm-info">
                  <p class="perm-label">Active</p>
                  <p class="perm-sub">Allow user to log in</p>
                </div>
                <div class="toggle" :class="{ on: editActive }">
                  <div class="toggle-thumb" />
                </div>
              </div>

              <div class="perm-divider" />

              <div
                v-for="perm in permKeys"
                :key="perm.key"
                class="perm-row"
                @click="editPerms[perm.key] = !editPerms[perm.key]"
              >
                <div class="perm-info">
                  <p class="perm-label">{{ perm.label }}</p>
                  <p class="perm-sub">{{ perm.desc }}</p>
                </div>
                <div class="toggle" :class="{ on: editPerms[perm.key] }">
                  <div class="toggle-thumb" />
                </div>
              </div>

              <div class="perm-divider" />

              <!-- Password reset -->
              <div class="pw-reset-section">
                <p class="pw-reset-label">Reset Password</p>
                <input v-model="newPw" class="form-input" type="password" placeholder="New password" autocomplete="new-password" />
                <button class="pw-reset-btn" :disabled="!newPw.trim() || pwSaving" @click="doResetPw">
                  {{ pwSaving ? 'Updating…' : 'Update Password' }}
                </button>
                <p v-if="pwError" class="form-error" style="margin-top:4px">{{ pwError }}</p>
              </div>

              <p v-if="editError" class="form-error">{{ editError }}</p>
              <button class="save-btn" :disabled="editSaving" @click="doSaveEdit">
                {{ editSaving ? 'Saving…' : 'Save Changes' }}
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
          <div class="confirm-sheet">
            <div class="drag-handle-area"><div class="drag-handle" /></div>
            <div class="create-content">
              <h3 class="create-title">Delete User</h3>
              <p class="confirm-text">Delete <strong>{{ deleteTarget.username }}</strong>? This cannot be undone.</p>
              <button class="del-confirm-btn" :disabled="deleting" @click="doDelete">
                {{ deleting ? 'Deleting…' : 'Delete User' }}
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
import { computed, onMounted, ref, reactive } from 'vue'
import { getUsers, createUser, deleteUser, updateUser } from '@/api/admin'
import type { AdminUser, AdminUserPermissions } from '@/api/admin'

const loading = ref(true)
const users   = ref<AdminUser[]>([])

const showCreate  = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const newType     = ref('user')
const saving      = ref(false)
const createError = ref('')
const canCreate   = computed(() => newUsername.value.trim().length > 0 && newPassword.value.length >= 4)

const deleteTarget = ref<AdminUser | null>(null)
const deleting     = ref(false)

const editTarget = ref<AdminUser | null>(null)
const editActive = ref(true)
const editSaving = ref(false)
const editError  = ref('')
const editPerms  = reactive<Record<string, boolean>>({
  download: true, update: true, delete: false, upload: false,
  accessAllLibraries: true, accessAllTags: true, accessExplicitContent: false,
})

const permKeys = [
  { key: 'download',             label: 'Download',              desc: 'Download audio files' },
  { key: 'update',               label: 'Update Items',          desc: 'Edit library item metadata' },
  { key: 'delete',               label: 'Delete Items',          desc: 'Delete books and podcasts' },
  { key: 'upload',               label: 'Upload',                desc: 'Upload new library items' },
  { key: 'accessAllLibraries',   label: 'All Libraries',         desc: 'Access all libraries' },
  { key: 'accessAllTags',        label: 'All Tags',              desc: 'Access items with any tag' },
  { key: 'accessExplicitContent',label: 'Explicit Content',      desc: 'Access explicit items' },
]

const newPw    = ref('')
const pwSaving = ref(false)
const pwError  = ref('')

async function doResetPw() {
  if (!editTarget.value || !newPw.value.trim()) return
  pwSaving.value = true
  pwError.value  = ''
  try {
    await updateUser(editTarget.value.id, { password: newPw.value })
    newPw.value = ''
  } catch (e: unknown) {
    pwError.value = e instanceof Error ? e.message : 'Failed to update password'
  } finally { pwSaving.value = false }
}

function openEdit(u: AdminUser) {
  editTarget.value = u
  editActive.value = u.isActive
  editError.value  = ''
  newPw.value      = ''
  pwError.value    = ''
  const p = u.permissions
  editPerms.download              = p?.download              ?? true
  editPerms.update                = p?.update                ?? true
  editPerms.delete                = p?.delete                ?? false
  editPerms.upload                = p?.upload                ?? false
  editPerms.accessAllLibraries    = p?.accessAllLibraries    ?? true
  editPerms.accessAllTags         = p?.accessAllTags         ?? true
  editPerms.accessExplicitContent = p?.accessExplicitContent ?? false
}

async function doSaveEdit() {
  if (!editTarget.value) return
  editSaving.value = true
  editError.value  = ''
  try {
    const updated = await updateUser(editTarget.value.id, {
      isActive: editActive.value,
      permissions: editPerms as Partial<AdminUserPermissions>,
    })
    const idx = users.value.findIndex(u => u.id === editTarget.value!.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...updated, permissions: editPerms as AdminUserPermissions }
    editTarget.value = null
  } catch (e: unknown) {
    editError.value = e instanceof Error ? e.message : 'Failed to save'
  } finally { editSaving.value = false }
}

function confirmDelete(u: AdminUser) { deleteTarget.value = u }

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

async function doCreate() {
  if (!canCreate.value) return
  saving.value = true
  createError.value = ''
  try {
    const u = await createUser({ username: newUsername.value.trim(), password: newPassword.value, type: newType.value })
    users.value.push(u)
    showCreate.value  = false
    newUsername.value = ''
    newPassword.value = ''
    newType.value     = 'user'
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Failed to create user'
  } finally { saving.value = false }
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteUser(deleteTarget.value.id)
    users.value = users.value.filter(u => u.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch { /* ignore */ }
  finally { deleting.value = false }
}

onMounted(async () => {
  try { users.value = await getUsers() } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-users { padding: 4px 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
.add-btn {
  display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 6px 12px;
  border-radius: 8px; background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  color: #d4a017; cursor: pointer;
}

.loading-state { display: flex; flex-direction: column; gap: 8px; }
.skel-row { height: 52px; border-radius: 10px; background: #1a1a1a; animation: shimmer 1.5s infinite;
  background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.user-list { display: flex; flex-direction: column; gap: 0; }
.user-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: rgba(212,160,23,0.2); color: #d4a017;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
}
.user-info { flex: 1; }
.user-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
.user-meta { display: flex; align-items: center; gap: 6px; margin: 0; }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.badge.admin { background: rgba(212,160,23,0.15); color: #d4a017; }
.badge.root  { background: rgba(220,50,50,0.15);  color: #e05555; }
.badge.inactive { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }
.seen { font-size: 10px; color: rgba(255,255,255,0.3); }
.del-btn  { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 6px; }
.edit-btn { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 6px; }

/* Sheet */
.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.create-sheet, .confirm-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.create-content { padding: 8px 20px 40px; }
.create-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 16px; }
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
.confirm-text { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 20px; }
.confirm-text strong { color: rgba(255,255,255,0.9); }
.del-confirm-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer;
  background: #c0392b; color: white; font-size: 15px; font-weight: 700; margin-bottom: 10px;
}
.del-confirm-btn:disabled { opacity: 0.5; }
.cancel-btn {
  width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer;
}
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

.perm-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.perm-row:last-of-type { border-bottom: none; }
.perm-info { flex: 1; }
.perm-label { font-size: 13px; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.perm-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
.perm-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0 4px; }

.toggle {
  width: 42px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.12);
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.toggle.on { background: #d4a017; }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
  border-radius: 50%; background: white; transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 21px; }
.pw-reset-section { padding: 8px 0; }
.pw-reset-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.pw-reset-btn {
  width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer;
  margin-top: 6px;
}
.pw-reset-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

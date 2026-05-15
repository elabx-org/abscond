import { defineStore } from 'pinia'
import { ref } from 'vue'
import { connectSocket, disconnectSocket, onSocketEvent } from '@/api/socket'
import { getBaseUrl } from '@/api/client'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'
import { useNotificationStore } from '@/stores/notifications'

export interface ScanProgress {
  found: number
  added: number
  updated: number
  removed: number
  pct: number
}

export const useSocketStore = defineStore('socket', () => {
  const connected    = ref(false)
  const scanProgress = ref<Record<string, ScanProgress>>({})
  const cleanups: Array<() => void> = []

  async function connect(token: string) {
    const base = await getBaseUrl()
    const host  = base.replace(/\/api$/, '')
    const sock  = connectSocket(host, token)

    sock.on('connect',    () => { connected.value = true })
    sock.on('disconnect', () => { connected.value = false })

    cleanups.push(onSocketEvent('user_stream_progress_update', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      if (d.libraryItemId && typeof d.progress === 'number') {
        const ps = useProgressStore()
        const item = ps.inProgress.find((i: { id: unknown }) => i.id === d.libraryItemId)
        if (item?.userMediaProgress) item.userMediaProgress.progress = d.progress as number
      }
    }))

    cleanups.push(onSocketEvent('user_item_progress_updated', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const prog = d.userMediaProgress as Record<string, unknown> | undefined
      if (!prog) return
      const ps = useProgressStore()
      const updateInList = (list: { id: unknown; userMediaProgress?: Record<string, unknown> | null }[]) => {
        const item = list.find(i => i.id === d.id || i.id === prog.libraryItemId)
        if (item) item.userMediaProgress = prog as unknown as typeof item.userMediaProgress
      }
      updateInList(ps.inProgress)
      updateInList(ps.recentlyAdded)
    }))

    cleanups.push(onSocketEvent('item_updated', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      if (!d.id) return
      const ls = useLibraryStore()
      const libId = d.libraryId as string
      if (libId) {
        const items = ls.itemsFor(libId)
        const idx = items.findIndex(i => i.id === d.id)
        if (idx >= 0) items[idx] = d as unknown as typeof items[0]
      }
    }))

    cleanups.push(onSocketEvent('scan_start', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const libId = d.libraryId as string
      if (libId) scanProgress.value[libId] = { found: 0, added: 0, updated: 0, removed: 0, pct: 0 }
    }))

    cleanups.push(onSocketEvent('scan_progress', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const libId = d.libraryId as string
      const p = d.progress as Record<string, unknown> | undefined
      if (!libId || !p) return
      const total = (p.totalChunks as number) || 1
      const done  = (p.completedChunks as number) || 0
      scanProgress.value[libId] = {
        found:   (p.libraryFilesFound as number) || 0,
        added:   (p.libraryItemsAdded as number) || 0,
        updated: (p.libraryItemsUpdated as number) || 0,
        removed: (p.libraryItemsRemoved as number) || 0,
        pct:     Math.round((done / total) * 100),
      }
    }))

    cleanups.push(onSocketEvent('library_scan_complete', (data: unknown) => {
      const ls = useLibraryStore()
      const ns = useNotificationStore()
      if (ls.activeLibraryId) ls.fetchItems(ls.activeLibraryId)
      const d = data as Record<string, unknown> | undefined
      const libId = d?.libraryId as string | undefined
      if (libId) delete scanProgress.value[libId]
      const count = d?.totalAdded as number | undefined
      ns.show(count ? `Library scan complete — ${count} new item${count !== 1 ? 's' : ''}` : 'Library scan complete', 'success')
    }))

    cleanups.push(onSocketEvent('item_added', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const ls = useLibraryStore()
      const libId = d.libraryId as string
      if (libId && libId === ls.activeLibraryId) ls.fetchItems(libId)
    }))

    cleanups.push(onSocketEvent('podcast_episode_added', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const ep = d.episode as Record<string, unknown> | undefined
      const ns = useNotificationStore()
      const title = ep?.title as string | undefined
      ns.show(title ? `New episode: ${title}` : 'New podcast episode added', 'success')
    }))

    cleanups.push(onSocketEvent('episode_download_complete', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const ns = useNotificationStore()
      const ep = d.episode as Record<string, unknown> | undefined
      const ok = d.success !== false
      if (ok) ns.show(ep?.title ? `Downloaded: ${ep.title}` : 'Episode downloaded', 'success')
      else    ns.show('Episode download failed', 'error')
    }))

    cleanups.push(onSocketEvent('item_removed', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      if (!d.id) return
      const ls = useLibraryStore()
      for (const libId of Object.keys(ls.itemsByLibrary ?? {})) {
        const items = ls.itemsFor(libId)
        const idx = items.findIndex(i => i.id === d.id)
        if (idx >= 0) { items.splice(idx, 1); break }
      }
      const ps = useProgressStore()
      ps.inProgress     = ps.inProgress.filter((i: { id: unknown }) => i.id !== d.id)
      ps.recentlyAdded  = ps.recentlyAdded.filter((i: { id: unknown }) => i.id !== d.id)
    }))
  }

  function disconnect() {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
    disconnectSocket()
    connected.value = false
  }

  return { connected, scanProgress, connect, disconnect }
})

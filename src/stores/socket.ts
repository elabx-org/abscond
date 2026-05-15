import { defineStore } from 'pinia'
import { ref } from 'vue'
import { connectSocket, disconnectSocket, onSocketEvent } from '@/api/socket'
import { getBaseUrl } from '@/api/client'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'

export const useSocketStore = defineStore('socket', () => {
  const connected = ref(false)
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

    cleanups.push(onSocketEvent('library_scan_complete', () => {
      const ls = useLibraryStore()
      if (ls.activeLibraryId) ls.fetchItems(ls.activeLibraryId)
    }))
  }

  function disconnect() {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
    disconnectSocket()
    connected.value = false
  }

  return { connected, connect, disconnect }
})

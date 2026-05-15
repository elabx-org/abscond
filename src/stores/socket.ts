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

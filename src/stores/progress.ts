import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'
import { api } from '@/api/client'
import type { LibraryItem } from '@/api/types'

export const useProgressStore = defineStore('progress', () => {
  const inProgress       = ref<LibraryItem[]>([])
  const recentlyAdded    = ref<LibraryItem[]>([])
  const recentlyFinished = ref<LibraryItem[]>([])
  const discover         = ref<LibraryItem[]>([])

  async function fetchInProgress() {
    inProgress.value = await getItemsInProgress()
  }

  async function fetchRecentlyAdded(libraryId: string) {
    const res = await getLibraryItems(libraryId, { limit: 20, sort: 'addedAt', desc: true })
    recentlyAdded.value = res.results
  }

  async function fetchRecentlyFinished(libraryId: string) {
    try {
      const res = await api.get(`/libraries/${libraryId}/items`, {
        params: { limit: 40, sort: 'addedAt', desc: 1, filter: 'progress.finished' },
      })
      // Sort by finishedAt client-side if available
      const finished = (res.data.results ?? []).filter(
        (item: LibraryItem) => item.userMediaProgress?.isFinished
      )
      finished.sort((a: LibraryItem, b: LibraryItem) => {
        const ta = a.userMediaProgress?.finishedAt ?? 0
        const tb = b.userMediaProgress?.finishedAt ?? 0
        return tb - ta
      })
      recentlyFinished.value = finished.slice(0, 20)
    } catch {
      recentlyFinished.value = []
    }
  }

  async function fetchDiscover(libraryId: string) {
    try {
      const res = await api.get(`/libraries/${libraryId}/items`, {
        params: { limit: 30, sort: 'random', desc: 0, filter: 'progress.not-started' },
      })
      discover.value = (res.data.results ?? []).slice(0, 20)
    } catch {
      try {
        const res = await api.get(`/libraries/${libraryId}/items`, {
          params: { limit: 20, sort: 'random', desc: 0 },
        })
        discover.value = res.data.results ?? []
      } catch {
        discover.value = []
      }
    }
  }

  return {
    inProgress, recentlyAdded, recentlyFinished, discover,
    fetchInProgress, fetchRecentlyAdded, fetchRecentlyFinished, fetchDiscover,
  }
})

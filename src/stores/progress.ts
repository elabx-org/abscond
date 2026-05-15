import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'
import { api } from '@/api/client'
import type { LibraryItem } from '@/api/types'

export const useProgressStore = defineStore('progress', () => {
  const inProgress    = ref<LibraryItem[]>([])
  const recentlyAdded = ref<LibraryItem[]>([])
  const discover      = ref<LibraryItem[]>([])

  async function fetchInProgress() {
    inProgress.value = await getItemsInProgress()
  }

  async function fetchRecentlyAdded(libraryId: string) {
    const res = await getLibraryItems(libraryId, { limit: 20, sort: 'addedAt', desc: true })
    recentlyAdded.value = res.results
  }

  async function fetchDiscover(libraryId: string) {
    try {
      const res = await api.get(`/libraries/${libraryId}/items`, {
        params: { limit: 20, sort: 'random', desc: 0 },
      })
      discover.value = res.data.results ?? []
    } catch {
      discover.value = []
    }
  }

  return { inProgress, recentlyAdded, discover, fetchInProgress, fetchRecentlyAdded, fetchDiscover }
})

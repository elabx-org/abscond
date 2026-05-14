import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'
import type { LibraryItem } from '@/api/types'

export const useProgressStore = defineStore('progress', () => {
  const inProgress    = ref<LibraryItem[]>([])
  const recentlyAdded = ref<LibraryItem[]>([])

  async function fetchInProgress() {
    inProgress.value = await getItemsInProgress()
  }

  async function fetchRecentlyAdded(libraryId: string) {
    const res = await getLibraryItems(libraryId, { limit: 20, sort: 'addedAt', desc: true })
    recentlyAdded.value = res.results
  }

  return { inProgress, recentlyAdded, fetchInProgress, fetchRecentlyAdded }
})

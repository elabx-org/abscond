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

  async function fetchInProgress(_libraryId?: string) {
    // ABS's /me/items-in-progress uses toOldJSONMinified() which does NOT embed
    // userMediaProgress. Progress lives in /api/me → mediaProgress[]. Fetch both
    // and merge, exactly as Absorb (github.com/pounat/absorb) does it.
    const [items, meRes] = await Promise.allSettled([
      getItemsInProgress(),
      api.get('/me'),
    ])

    const rawItems: LibraryItem[] = items.status === 'fulfilled' ? items.value : []

    if (meRes.status === 'fulfilled') {
      const progressList: import('@/api/types').MediaProgress[] = meRes.value.data?.mediaProgress ?? []
      const progressMap = new Map(progressList.map(p => [p.libraryItemId + (p.episodeId ? `-${p.episodeId}` : ''), p]))
      inProgress.value = rawItems.map(item => {
        const mp = progressMap.get(item.id) ?? progressMap.get(`${item.id}-`)
        return mp ? { ...item, userMediaProgress: mp } : item
      }).filter(item => item.userMediaProgress && !item.userMediaProgress.isFinished)
        .sort((a, b) => (b.userMediaProgress?.lastUpdate ?? 0) - (a.userMediaProgress?.lastUpdate ?? 0))
    } else {
      inProgress.value = rawItems
    }
  }

  async function fetchRecentlyAdded(libraryId: string) {
    const res = await getLibraryItems(libraryId, { limit: 20, sort: 'addedAt', desc: true })
    recentlyAdded.value = res.results
  }

  async function fetchRecentlyFinished(libraryId: string) {
    try {
      const res = await api.get(`/libraries/${libraryId}/items`, {
        params: { limit: 40, sort: 'addedAt', desc: 1, filter: btoa('progress.finished') },
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
        params: { limit: 30, sort: 'random', desc: 0, filter: btoa('progress.not-started') },
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

  function updateItem(updated: LibraryItem) {
    const merge = (existing: LibraryItem): LibraryItem => ({
      ...updated,
      userMediaProgress: existing.userMediaProgress ?? updated.userMediaProgress,
    })
    const replace = (arr: LibraryItem[]) => arr.map(i => i.id === updated.id ? merge(i) : i)
    inProgress.value       = replace(inProgress.value)
    recentlyAdded.value    = replace(recentlyAdded.value)
    recentlyFinished.value = replace(recentlyFinished.value)
    discover.value         = replace(discover.value)
  }

  return {
    inProgress, recentlyAdded, recentlyFinished, discover,
    fetchInProgress, fetchRecentlyAdded, fetchRecentlyFinished, fetchDiscover, updateItem,
  }
})

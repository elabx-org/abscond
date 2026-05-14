import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLibraries, getLibraryItems } from '@/api/library'
import type { Library, LibraryItem } from '@/api/types'

export const useLibraryStore = defineStore('library', () => {
  const libraries       = ref<Library[]>([])
  const activeLibraryId = ref<string | null>(null)
  const _items          = ref<Record<string, LibraryItem[]>>({})
  const loading         = ref(false)

  function itemsFor(libraryId: string): LibraryItem[] {
    return _items.value[libraryId] ?? []
  }

  async function fetchLibraries() {
    loading.value = true
    try {
      libraries.value = await getLibraries()
      if (libraries.value.length && !activeLibraryId.value) {
        activeLibraryId.value = libraries.value[0].id
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchItems(libraryId: string) {
    loading.value = true
    try {
      const res = await getLibraryItems(libraryId, { limit: 100 })
      _items.value = { ..._items.value, [libraryId]: res.results }
    } finally {
      loading.value = false
    }
  }

  function setActiveLibrary(id: string) {
    activeLibraryId.value = id
  }

  return { libraries, activeLibraryId, loading, itemsFor, fetchLibraries, fetchItems, setActiveLibrary }
})

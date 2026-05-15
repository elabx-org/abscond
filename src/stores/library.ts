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
      const PAGE = 250
      const first = await getLibraryItems(libraryId, { limit: PAGE, page: 0 })
      let all = first.results
      if (first.total > PAGE) {
        const pages = Math.ceil(first.total / PAGE)
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            getLibraryItems(libraryId, { limit: PAGE, page: i + 1 })
          )
        )
        all = [...all, ...rest.flatMap(r => r.results)]
      }
      _items.value = { ..._items.value, [libraryId]: all }
    } finally {
      loading.value = false
    }
  }

  function setActiveLibrary(id: string) {
    activeLibraryId.value = id
  }

  return { libraries, activeLibraryId, loading, itemsFor, fetchLibraries, fetchItems, setActiveLibrary }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const drawerOpen = ref(false)
  const activeLibraryId = ref<string | null>(null)

  function toggleDrawer() { drawerOpen.value = !drawerOpen.value }
  function setLibrary(id: string) { activeLibraryId.value = id }

  return { drawerOpen, activeLibraryId, toggleDrawer, setLibrary }
})

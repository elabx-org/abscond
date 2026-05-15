import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const skipBackSecs = ref<number>(parseInt(localStorage.getItem('abs_skip_back') ?? '30'))
  const skipFwdSecs  = ref<number>(parseInt(localStorage.getItem('abs_skip_fwd')  ?? '30'))

  function setSkipBack(s: number) {
    skipBackSecs.value = s
    localStorage.setItem('abs_skip_back', String(s))
  }

  function setSkipFwd(s: number) {
    skipFwdSecs.value = s
    localStorage.setItem('abs_skip_fwd', String(s))
  }

  return { skipBackSecs, skipFwdSecs, setSkipBack, setSkipFwd }
})

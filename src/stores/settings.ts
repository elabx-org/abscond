import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const skipBackSecs      = ref<number>(parseInt(localStorage.getItem('abs_skip_back') ?? '30'))
  const skipFwdSecs       = ref<number>(parseInt(localStorage.getItem('abs_skip_fwd')  ?? '30'))
  const speedAdjustedTime = ref<boolean>(localStorage.getItem('abs_speed_adj_time') !== 'false')

  function setSkipBack(s: number) {
    skipBackSecs.value = s
    localStorage.setItem('abs_skip_back', String(s))
  }

  function setSkipFwd(s: number) {
    skipFwdSecs.value = s
    localStorage.setItem('abs_skip_fwd', String(s))
  }

  function setSpeedAdjustedTime(v: boolean) {
    speedAdjustedTime.value = v
    localStorage.setItem('abs_speed_adj_time', String(v))
  }

  return { skipBackSecs, skipFwdSecs, speedAdjustedTime, setSkipBack, setSkipFwd, setSpeedAdjustedTime }
})

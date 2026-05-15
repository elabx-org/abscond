import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const skipBackSecs        = ref<number>(parseInt(localStorage.getItem('abs_skip_back') ?? '30'))
  const skipFwdSecs         = ref<number>(parseInt(localStorage.getItem('abs_skip_fwd')  ?? '30'))
  const speedAdjustedTime   = ref<boolean>(localStorage.getItem('abs_speed_adj_time') !== 'false')
  const podcastAutoAdvance  = ref<boolean>(localStorage.getItem('abs_podcast_auto_advance') === 'true')

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

  function setPodcastAutoAdvance(v: boolean) {
    podcastAutoAdvance.value = v
    localStorage.setItem('abs_podcast_auto_advance', String(v))
  }

  return { skipBackSecs, skipFwdSecs, speedAdjustedTime, podcastAutoAdvance, setSkipBack, setSkipFwd, setSpeedAdjustedTime, setPodcastAutoAdvance }
})

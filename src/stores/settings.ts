import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const skipBackSecs        = ref<number>(parseInt(localStorage.getItem('abs_skip_back') ?? '30'))
  const skipFwdSecs         = ref<number>(parseInt(localStorage.getItem('abs_skip_fwd')  ?? '30'))
  const speedAdjustedTime   = ref<boolean>(localStorage.getItem('abs_speed_adj_time') !== 'false')
  const podcastAutoAdvance  = ref<boolean>(localStorage.getItem('abs_podcast_auto_advance') === 'true')
  const autoRewindEnabled   = ref<boolean>(localStorage.getItem('abs_auto_rewind') !== 'false')
  const autoRewindMax       = ref<number>(parseInt(localStorage.getItem('abs_auto_rewind_max') ?? '30'))

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

  function setAutoRewindEnabled(v: boolean) {
    autoRewindEnabled.value = v
    localStorage.setItem('abs_auto_rewind', String(v))
  }

  function setAutoRewindMax(secs: number) {
    autoRewindMax.value = secs
    localStorage.setItem('abs_auto_rewind_max', String(secs))
  }

  return { skipBackSecs, skipFwdSecs, speedAdjustedTime, podcastAutoAdvance, autoRewindEnabled, autoRewindMax, setSkipBack, setSkipFwd, setSpeedAdjustedTime, setPodcastAutoAdvance, setAutoRewindEnabled, setAutoRewindMax }
})

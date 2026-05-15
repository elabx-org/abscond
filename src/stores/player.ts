import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startPlaySession, syncSession, closeSession } from '@/api/player'
import { getPodcastItem } from '@/api/browse'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'
import { useEqualizerStore } from '@/stores/equalizer'
import type { LibraryItem, PlaybackSession, AudioTrack, Chapter } from '@/api/types'

const SYNC_INTERVAL_MS = 15_000

function _loadRecentItems(): LibraryItem[] {
  try { return JSON.parse(localStorage.getItem('abs_recent_items') ?? '[]') } catch { return [] }
}
function _saveRecentItems(items: LibraryItem[]) {
  try { localStorage.setItem('abs_recent_items', JSON.stringify(items.slice(0, 10))) } catch {}
}
function _loadLastItem(): LibraryItem | null {
  try { return JSON.parse(localStorage.getItem('abs_last_item') ?? 'null') } catch { return null }
}

export const usePlayerStore = defineStore('player', () => {
  const currentItem   = ref<LibraryItem | null>(_loadLastItem())
  const session       = ref<PlaybackSession | null>(null)
  const isPlaying     = ref(false)
  const currentTime   = ref(0)
  const duration      = ref(0)
  const playbackRate  = ref<number>(parseFloat(localStorage.getItem('abs_playback_rate') ?? '1'))
  const isLoading     = ref(false)
  const error         = ref<string | null>(null)
  const sleepMinsLeft      = ref<number | null>(null)
  const sleepSecsLeft      = ref<number | null>(null)
  const sleepTotalSecs     = ref<number | null>(null)
  const sleepEndOfChapter  = ref(false)
  const queue              = ref<LibraryItem[]>([])
  const volume             = ref<number>(parseFloat(localStorage.getItem('abs_volume') ?? '1'))
  const recentItems        = ref<LibraryItem[]>(_loadRecentItems())

  let audio: HTMLAudioElement | null = null
  let audioCtx: AudioContext | null = null
  let gainNode: GainNode | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let seekSyncTimer: ReturnType<typeof setTimeout> | null = null
  let sleepTimer: ReturnType<typeof setTimeout> | null = null
  let sleepCountdown: ReturnType<typeof setInterval> | null = null
  let sleepFadeStartVol = 1
  const SLEEP_FADE_SECS = 30
  let syncedAt = 0
  let timeListenedAccum = 0
  let trackStartOffset = 0
  let pausedAt: number | null = null

  function _ensureAudioGraph() {
    if (!audio) return
    const eq = useEqualizerStore()
    if (!audioCtx) {
      audioCtx = new AudioContext()
      gainNode = audioCtx.createGain()
      const { output: eqOut } = eq.buildChain(audioCtx)
      eqOut.connect(gainNode)
      gainNode.connect(audioCtx.destination)
    }
    gainNode!.gain.value = volume.value
    try {
      const src = audioCtx.createMediaElementSource(audio)
      const { input: eqIn } = eq.buildChain(audioCtx)
      src.connect(eqIn)
    } catch {
      // MediaElementAudioSourceNode already created for this element — safe to ignore
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  }

  // Flattened global time → position within a specific audio track
  const currentTrackIndex = computed(() => {
    const tracks = session.value?.audioTracks ?? []
    for (let i = tracks.length - 1; i >= 0; i--) {
      if (currentTime.value >= tracks[i].startOffset) return i
    }
    return 0
  })

  const currentChapter = computed<Chapter | null>(() => {
    const chapters = session.value?.chapters ?? []
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime.value >= chapters[i].start) return chapters[i]
    }
    return chapters[0] ?? null
  })

  const progress = computed(() => {
    if (!duration.value) return 0
    return Math.min(currentTime.value / duration.value, 1)
  })

  function _buildAudioUrl(track: AudioTrack): string {
    const token = localStorage.getItem('abs_token') ?? ''
    const base  = localStorage.getItem('abs_base_url') ?? '/api'
    // base is 'http://server/api'; contentUrl starts with '/api/...' — strip trailing /api to get host
    const host  = base.replace(/\/api$/, '')
    const url   = track.contentUrl.startsWith('http') ? track.contentUrl : `${host}${track.contentUrl}`
    return `${url}?token=${encodeURIComponent(token)}`
  }

  function _updateMediaSession() {
    if (!('mediaSession' in navigator) || !currentItem.value) return
    const meta = currentItem.value.media.metadata
    const base = localStorage.getItem('abs_base_url') ?? ''
    const token = localStorage.getItem('abs_token') ?? ''
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  meta.title,
      artist: session.value?.displayAuthor || (meta.authors ?? []).map((a: { name: string }) => a.name).join(', ') || (meta as Record<string, unknown>).authorName as string || '',
      album:  (meta.series ?? []).map((s: { name: string }) => s.name).join(', ') || '',
      artwork: [{ src: `${base}/api/items/${currentItem.value.id}/cover?token=${encodeURIComponent(token)}`, sizes: '512x512', type: 'image/jpeg' }],
    })
    navigator.mediaSession.setActionHandler('play',           () => { audio?.play() })
    navigator.mediaSession.setActionHandler('pause',          () => { audio?.pause() })
    navigator.mediaSession.setActionHandler('seekbackward',   (d) => skipBack(d?.seekOffset ?? 30))
    navigator.mediaSession.setActionHandler('seekforward',    (d) => skipForward(d?.seekOffset ?? 30))
    navigator.mediaSession.setActionHandler('previoustrack',  () => skipBack(30))
    navigator.mediaSession.setActionHandler('nexttrack',      () => skipForward(30))
  }

  function _attachListeners() {
    if (!audio) return
    audio.addEventListener('timeupdate', _onTimeUpdate)
    audio.addEventListener('ended', _onTrackEnded)
    audio.addEventListener('play', () => {
      isPlaying.value = true
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      if (pausedAt !== null) {
        const pausedSecs = (Date.now() - pausedAt) / 1000
        pausedAt = null
        const settings = useSettingsStore()
        if (settings.autoRewindEnabled && pausedSecs >= 3) {
          const maxSecs = settings.autoRewindMax
          // Scale 0→1 over [3s … 3600s] pause range
          const t = Math.min((pausedSecs - 3) / (3600 - 3), 1)
          const rewind = 1 + (maxSecs - 1) * t
          seek(Math.max(0, currentTime.value - rewind))
        }
      }
    })
    audio.addEventListener('pause', () => {
      isPlaying.value = false
      pausedAt = Date.now()
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    })
    audio.addEventListener('error', () => { error.value = 'Playback error' })
  }

  function _onTimeUpdate() {
    if (!audio || !session.value) return
    currentTime.value = trackStartOffset + audio.currentTime
    if (sleepEndOfChapter.value) {
      const ch = currentChapter.value
      if (ch && currentTime.value >= ch.end - 0.5) {
        audio.pause()
        sleepEndOfChapter.value = false
        const rewindSecs = parseInt(localStorage.getItem('abs_sleep_rewind') ?? '0')
        if (rewindSecs > 0) {
          audio.currentTime = Math.max(0, audio.currentTime - rewindSecs)
          currentTime.value = audio.currentTime + trackStartOffset
        }
        useNotificationStore().show('Sleep timer — end of chapter', 'info')
      }
    }
  }

  async function _onTrackEnded() {
    const tracks = session.value?.audioTracks ?? []
    const next = currentTrackIndex.value + 1
    if (next < tracks.length) {
      _loadTrack(next)
      audio?.play()
    } else {
      isPlaying.value = false
      _doSync()
      if (queue.value.length > 0) {
        const nextItem = queue.value.shift()!
        setTimeout(() => play(nextItem), 500)
      } else if (currentItem.value?.mediaType === 'podcast' && useSettingsStore().podcastAutoAdvance) {
        await _autoAdvancePodcast()
      }
    }
  }

  async function _autoAdvancePodcast() {
    const item = currentItem.value
    const epId = session.value?.episodeId
    if (!item || !epId) return
    try {
      const detail = await getPodcastItem(item.id)
      const eps = (detail.media.episodes ?? [])
        .slice()
        .sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0))
      const idx = eps.findIndex(e => e.id === epId)
      if (idx >= 0 && idx < eps.length - 1) {
        setTimeout(() => play(item, eps[idx + 1].id), 500)
      }
    } catch {}
  }

  function _loadTrack(idx: number) {
    const tracks = session.value?.audioTracks ?? []
    const track  = tracks[idx]
    if (!audio || !track) return
    trackStartOffset   = track.startOffset
    audio.src          = _buildAudioUrl(track)
    audio.playbackRate = playbackRate.value
  }

  function _startSync() {
    syncTimer = setInterval(_doSync, SYNC_INTERVAL_MS)
  }

  function _stopSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null }
  }

  async function _doSync() {
    if (!session.value) return
    const t = currentTime.value
    const elapsed = t - syncedAt
    timeListenedAccum += Math.max(0, elapsed)
    syncedAt = t
    await syncSession(session.value.id, {
      currentTime: t,
      duration:    duration.value,
      timeListened: timeListenedAccum,
    }).catch(() => {})
    timeListenedAccum = 0
  }

  async function play(item: LibraryItem, episodeId?: string) {
    await stop()
    isLoading.value = true
    error.value = null
    try {
      const s = await startPlaySession(item.id, episodeId)
      session.value     = s
      currentItem.value = item
      duration.value    = s.duration
      currentTime.value = s.currentTime

      // Persist and update recent history
      try { localStorage.setItem('abs_last_item', JSON.stringify(item)) } catch {}
      const recent = recentItems.value.filter(r => r.id !== item.id)
      recent.unshift(item)
      recentItems.value = recent.slice(0, 10)
      _saveRecentItems(recentItems.value)

      audio = new Audio()
      audio.playbackRate = playbackRate.value
      _attachListeners()
      _ensureAudioGraph()

      // Find the track for startTime
      const tracks = s.audioTracks
      let startIdx = 0
      for (let i = tracks.length - 1; i >= 0; i--) {
        if (s.currentTime >= tracks[i].startOffset) { startIdx = i; break }
      }
      _loadTrack(startIdx)
      audio.currentTime  = s.currentTime - tracks[startIdx].startOffset
      syncedAt = s.currentTime

      await audio.play()
      _updateMediaSession()
      _startSync()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to start playback'
    } finally {
      isLoading.value = false
    }
  }

  function togglePlay() {
    if (!audio) {
      // audio is null when currentItem was restored from localStorage after a page reload/redeploy
      if (currentItem.value) play(currentItem.value)
      return
    }
    if (isPlaying.value) {
      audio.pause()
    } else {
      if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {})
      audio.play()
    }
  }

  function seek(time: number) {
    if (!audio || !session.value) return
    const tracks = session.value.audioTracks
    let trackIdx = 0
    for (let i = tracks.length - 1; i >= 0; i--) {
      if (time >= tracks[i].startOffset) { trackIdx = i; break }
    }
    const track = tracks[trackIdx]
    const wasPlaying = isPlaying.value
    _loadTrack(trackIdx)
    audio.currentTime = time - track.startOffset
    currentTime.value = time
    if (wasPlaying) audio.play()
    // Debounced sync to persist seek position to server
    if (seekSyncTimer) clearTimeout(seekSyncTimer)
    seekSyncTimer = setTimeout(() => { seekSyncTimer = null; _doSync() }, 2000)
  }

  function skipBack(secs = 30) { seek(Math.max(0, currentTime.value - secs)) }
  function skipForward(secs = 30) { seek(Math.min(duration.value, currentTime.value + secs)) }

  function setRate(rate: number) {
    playbackRate.value = rate
    localStorage.setItem('abs_playback_rate', String(rate))
    if (audio) audio.playbackRate = rate
  }

  function setVolume(vol: number) {
    volume.value = Math.max(0, Math.min(2, vol))
    localStorage.setItem('abs_volume', String(volume.value))
    if (gainNode) {
      gainNode.gain.value = volume.value
    } else if (audio) {
      audio.volume = Math.min(1, volume.value)
    }
  }

  function _clearSleepTimers() {
    if (sleepTimer)    { clearTimeout(sleepTimer);    sleepTimer    = null }
    if (sleepCountdown){ clearInterval(sleepCountdown); sleepCountdown = null }
    if (gainNode) gainNode.gain.value = volume.value
  }

  function setSleepTimer(mins: number | null, endOfChapter = false) {
    _clearSleepTimers()
    sleepEndOfChapter.value = false
    if (endOfChapter) {
      sleepEndOfChapter.value = true
      sleepMinsLeft.value     = null
      sleepSecsLeft.value     = null
      return
    }
    sleepMinsLeft.value  = mins
    sleepSecsLeft.value  = mins !== null ? mins * 60 : null
    sleepTotalSecs.value = mins !== null ? mins * 60 : null
    if (mins && mins > 0) {
      sleepFadeStartVol = volume.value
      sleepTimer = setTimeout(() => {
        _clearSleepTimers()
        audio?.pause()
        const rewindSecs = parseInt(localStorage.getItem('abs_sleep_rewind') ?? '0')
        if (rewindSecs > 0 && audio) {
          audio.currentTime = Math.max(0, audio.currentTime - rewindSecs)
          currentTime.value = audio.currentTime + trackStartOffset
        }
        sleepMinsLeft.value  = null
        sleepSecsLeft.value  = null
        sleepTotalSecs.value = null
        useNotificationStore().show('Sleep timer — playback paused', 'info')
      }, mins * 60 * 1000)
      const fadeEnabled = localStorage.getItem('abs_sleep_fade') !== 'false'
      sleepCountdown = setInterval(() => {
        if (sleepSecsLeft.value !== null && sleepSecsLeft.value > 0) {
          sleepSecsLeft.value--
          sleepMinsLeft.value = Math.ceil(sleepSecsLeft.value / 60)
          if (fadeEnabled && gainNode && sleepSecsLeft.value <= SLEEP_FADE_SECS) {
            gainNode.gain.value = sleepFadeStartVol * (sleepSecsLeft.value / SLEEP_FADE_SECS)
          }
        }
      }, 1_000)
    }
  }

  async function stop() {
    if (seekSyncTimer) { clearTimeout(seekSyncTimer); seekSyncTimer = null }
    _stopSync()
    _clearSleepTimers()
    if (session.value) { await _doSync(); await closeSession(session.value.id).catch(() => {}) }
    audio?.pause()
    audio = null
    session.value     = null
    currentItem.value = null
    isPlaying.value   = false
    currentTime.value = 0
    duration.value    = 0
    sleepMinsLeft.value  = null
    sleepSecsLeft.value  = null
    sleepTotalSecs.value = null
    timeListenedAccum = 0
    try { localStorage.removeItem('abs_last_item') } catch {}
  }

  return {
    currentItem, session, isPlaying, currentTime, duration, queue, recentItems,
    playbackRate, volume, isLoading, error, sleepMinsLeft, sleepSecsLeft, sleepTotalSecs, sleepEndOfChapter,
    currentChapter, currentTrackIndex, progress,
    play, togglePlay, seek, skipBack, skipForward, setRate, setVolume, setSleepTimer, stop,
    addToQueue: (item: LibraryItem) => { queue.value.push(item) },
    clearQueue: () => { queue.value = [] },
    removeFromQueue: (idx: number) => { queue.value.splice(idx, 1) },
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startPlaySession, syncSession, closeSession } from '@/api/player'
import type { LibraryItem, PlaybackSession, AudioTrack, Chapter } from '@/api/types'

const SYNC_INTERVAL_MS = 15_000

export const usePlayerStore = defineStore('player', () => {
  const currentItem   = ref<LibraryItem | null>(null)
  const session       = ref<PlaybackSession | null>(null)
  const isPlaying     = ref(false)
  const currentTime   = ref(0)
  const duration      = ref(0)
  const playbackRate  = ref<number>(parseFloat(localStorage.getItem('abs_playback_rate') ?? '1'))
  const isLoading     = ref(false)
  const error         = ref<string | null>(null)
  const sleepMinsLeft      = ref<number | null>(null)
  const sleepEndOfChapter  = ref(false)

  let audio: HTMLAudioElement | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let sleepTimer: ReturnType<typeof setTimeout> | null = null
  let syncedAt = 0
  let timeListenedAccum = 0
  let trackStartOffset = 0

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
    const url   = track.contentUrl.startsWith('http') ? track.contentUrl : `${base}${track.contentUrl}`
    return `${url}?token=${encodeURIComponent(token)}`
  }

  function _updateMediaSession() {
    if (!('mediaSession' in navigator) || !currentItem.value) return
    const meta = currentItem.value.media.metadata
    const base = localStorage.getItem('abs_base_url') ?? ''
    const token = localStorage.getItem('abs_token') ?? ''
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  meta.title,
      artist: (meta.authors ?? []).map((a: { name: string }) => a.name).join(', ') || '',
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
    })
    audio.addEventListener('pause', () => {
      isPlaying.value = false
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
      }
    }
  }

  function _onTrackEnded() {
    const tracks = session.value?.audioTracks ?? []
    const next = currentTrackIndex.value + 1
    if (next < tracks.length) {
      _loadTrack(next)
      audio?.play()
    } else {
      isPlaying.value = false
      _doSync()
    }
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

      audio = new Audio()
      audio.playbackRate = playbackRate.value
      _attachListeners()

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
    if (!audio) return
    if (isPlaying.value) audio.pause()
    else audio.play()
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
  }

  function skipBack(secs = 30) { seek(Math.max(0, currentTime.value - secs)) }
  function skipForward(secs = 30) { seek(Math.min(duration.value, currentTime.value + secs)) }

  function setRate(rate: number) {
    playbackRate.value = rate
    localStorage.setItem('abs_playback_rate', String(rate))
    if (audio) audio.playbackRate = rate
  }

  function setSleepTimer(mins: number | null, endOfChapter = false) {
    if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null }
    sleepEndOfChapter.value = false
    if (endOfChapter) {
      sleepEndOfChapter.value = true
      sleepMinsLeft.value     = null
      return
    }
    sleepMinsLeft.value = mins
    if (mins && mins > 0) {
      sleepTimer = setTimeout(() => {
        audio?.pause()
        sleepMinsLeft.value = null
      }, mins * 60 * 1000)
    }
  }

  async function stop() {
    _stopSync()
    if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null }
    if (session.value) { await _doSync(); await closeSession(session.value.id).catch(() => {}) }
    audio?.pause()
    audio = null
    session.value     = null
    currentItem.value = null
    isPlaying.value   = false
    currentTime.value = 0
    duration.value    = 0
    sleepMinsLeft.value = null
    timeListenedAccum = 0
  }

  return {
    currentItem, session, isPlaying, currentTime, duration,
    playbackRate, isLoading, error, sleepMinsLeft, sleepEndOfChapter,
    currentChapter, currentTrackIndex, progress,
    play, togglePlay, seek, skipBack, skipForward, setRate, setSleepTimer, stop,
  }
})

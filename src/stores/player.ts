import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startPlaySession, syncSession, closeSession } from '@/api/player'
import { getPodcastItem } from '@/api/browse'
import { getItemsInProgress } from '@/api/items'
import { api } from '@/api/client'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'
import { useEqualizerStore } from '@/stores/equalizer'
import type { LibraryItem, PlaybackSession, AudioTrack, Chapter } from '@/api/types'

export interface QueueEntry { item: LibraryItem; episodeId?: string }

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
  const sleepEndOfChapter      = ref(false)
  const chapterBarrierPaused   = ref(false)
  const queue                  = ref<QueueEntry[]>([])
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
  let _shakeLastAt = 0
  const SHAKE_THRESHOLDS: Record<string, number> = { veryLow: 8, low: 11, medium: 15, high: 20, veryHigh: 28 }
  const SHAKE_COOLDOWN  = 3000 // ms between triggers
  let chimePlayed = false
  let syncedAt = 0
  let _lastChapterIdx = -1
  let timeListenedAccum = 0
  let trackStartOffset = 0
  let pausedAt: number | null = null
  let _wasPlayingBeforeHide = false
  // True only when the USER explicitly paused (togglePlay or MediaSession pause action).
  // iOS auto-pauses the audio element BEFORE visibilitychange fires, so isPlaying.value
  // is already false at capture time — we can't use it to distinguish user vs system pauses.
  let _userPaused = false

  const _isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  function _ensureAudioGraph() {
    if (!audio) return
    if (_isIOS) {
      // On iOS, skip routing audio through AudioContext — AudioContext suspends when page
      // goes to background, killing audio. Instead use the native audio element path.
      // EQ is bypassed on iOS in exchange for reliable background playback.
      audio.volume = Math.min(1, volume.value)
      return
    }
    const eq = useEqualizerStore()
    if (!audioCtx) {
      audioCtx = new AudioContext()
      gainNode = audioCtx.createGain()
      const { output: eqOut } = eq.buildChain(audioCtx)
      eqOut.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      audioCtx.addEventListener('statechange', () => {
        if (audioCtx?.state === 'running' && isPlaying.value && audio?.paused) {
          audio?.play().catch(() => {})
        }
      })
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

  function _playChime() {
    if (!audioCtx) return
    const ctx = audioCtx
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const g    = ctx.createGain()
    osc1.connect(g); osc2.connect(g)
    g.connect(ctx.destination)
    osc1.type = 'sine'; osc2.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.8)
    osc2.frequency.setValueAtTime(1108, ctx.currentTime + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.9)
    const vol = parseFloat(localStorage.getItem('abs_sleep_chime_vol') ?? '0.4')
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4)
    osc1.start(); osc2.start(ctx.currentTime + 0.15)
    osc1.stop(ctx.currentTime + 1.4); osc2.stop(ctx.currentTime + 1.4)
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
      title:  session.value?.displayTitle || meta.title,
      artist: session.value?.displayAuthor || (meta.authors ?? []).map((a: { name: string }) => a.name).join(', ') || (meta as Record<string, unknown>).authorName as string || '',
      album:  (meta.series ?? []).map((s: { name: string }) => s.name).join(', ') || '',
      artwork: [{ src: `${base}/api/items/${currentItem.value.id}/cover?token=${encodeURIComponent(token)}`, sizes: '512x512', type: 'image/jpeg' }],
    })
    navigator.mediaSession.setActionHandler('play',           () => { _userPaused = false; audio?.play() })
    navigator.mediaSession.setActionHandler('pause',          () => { _userPaused = true;  audio?.pause() })
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
          const t = Math.min((pausedSecs - 3) / (3600 - 3), 1)
          const rewind = 1 + (maxSecs - 1) * t
          seek(Math.max(0, currentTime.value - rewind))
        }
      }
      // Restart sleep countdown if it was paused on audio pause
      if (localStorage.getItem('abs_sleep_reset_on_pause') === 'true' && sleepSecsLeft.value !== null && !sleepCountdown) {
        _startSleepCountdown()
      }
    })
    audio.addEventListener('pause', () => {
      isPlaying.value = false
      pausedAt = Date.now()
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
      // Pause sleep countdown while audio is paused
      if (localStorage.getItem('abs_sleep_reset_on_pause') === 'true' && sleepCountdown) {
        clearInterval(sleepCountdown)
        sleepCountdown = null
      }
    })
    audio.addEventListener('error', () => { error.value = 'Playback error' })
  }

  let _posStateTimer = 0
  function _onTimeUpdate() {
    if (!audio || !session.value) return
    currentTime.value = trackStartOffset + audio.currentTime
    // Update Media Session position every 5 seconds
    const now = Date.now()
    if ('mediaSession' in navigator && now - _posStateTimer > 5000 && duration.value > 0) {
      _posStateTimer = now
      try {
        navigator.mediaSession.setPositionState({
          duration: duration.value,
          position: Math.min(currentTime.value, duration.value),
          playbackRate: playbackRate.value,
        })
      } catch {}
    }
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

    // Chapter barrier: pause at chapter boundaries
    const chapters = (currentItem.value?.media as Record<string, unknown>)?.chapters as { start: number; end: number }[] | undefined
    if (chapters?.length && useSettingsStore().chapterBarrierEnabled) {
      let idx = -1
      for (let i = 0; i < chapters.length; i++) {
        if (currentTime.value >= chapters[i].start && currentTime.value < chapters[i].end) { idx = i; break }
      }
      if (idx >= 0 && _lastChapterIdx >= 0 && idx !== _lastChapterIdx && idx > _lastChapterIdx) {
        audio.currentTime = Math.max(0, chapters[idx].start - trackStartOffset)
        currentTime.value = chapters[idx].start
        audio.pause()
        chapterBarrierPaused.value = true
      }
      if (idx >= 0) _lastChapterIdx = idx
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
        const next = queue.value.shift()!
        setTimeout(() => play(next.item, next.episodeId), 500)
      } else if (currentItem.value?.mediaType === 'podcast' && useSettingsStore().podcastAutoAdvance) {
        await _autoAdvancePodcast()
      } else if (currentItem.value?.mediaType === 'book' && useSettingsStore().bookAutoAdvance) {
        await _autoAdvanceBook()
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

  async function _autoAdvanceBook() {
    const item = currentItem.value
    if (!item) return
    const seriesList = item.media.metadata.series
    if (!seriesList?.length) return
    const s = seriesList[0]
    const seq = parseFloat(s.sequence ?? '0')
    if (!s.id || isNaN(seq)) return
    try {
      const res = await api.get(`/libraries/${item.libraryId}/series/${s.id}`)
      const books: LibraryItem[] = res.data?.books ?? res.data?.items ?? []
      const sorted = books
        .map(b => ({ book: b, seq: parseFloat((b.media.metadata.series?.find((x: any) => x.id === s.id)?.sequence) ?? '0') }))
        .filter(x => !isNaN(x.seq) && x.seq > seq)
        .sort((a, b) => a.seq - b.seq)
      if (sorted.length) setTimeout(() => play(sorted[0].book), 800)
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

    // Persist item immediately after stop() clears the old one — before the API call.
    // This ensures currentItem and abs_last_item survive even if startPlaySession fails
    // (e.g. ABS mid-redeploy), so the user's Now Playing doesn't disappear on a network hiccup.
    currentItem.value = item
    try { localStorage.setItem('abs_last_item', JSON.stringify(item)) } catch {}
    const recent = recentItems.value.filter(r => r.id !== item.id)
    recent.unshift(item)
    recentItems.value = recent.slice(0, 10)
    _saveRecentItems(recentItems.value)

    isLoading.value = true
    error.value = null
    _lastChapterIdx = -1
    chapterBarrierPaused.value = false
    try {
      const s = await startPlaySession(item.id, episodeId)
      session.value     = s
      duration.value    = s.duration
      currentTime.value = s.currentTime

      // Apply default speed for new items (different from what was just playing)
      const defSpeed = useSettingsStore().defaultSpeed
      if (defSpeed !== 1) {
        playbackRate.value = defSpeed
        localStorage.setItem('abs_playback_rate', String(defSpeed))
      }

      // Remove any previously injected audio element
      document.getElementById('__abs_audio__')?.remove()
      audio = new Audio()
      audio.id = '__abs_audio__'
      if (_isIOS) {
        // iOS requires the audio element to be in the DOM for the audio session
        // to register properly and keep playing when the app goes to background.
        audio.setAttribute('playsinline', '')
        document.body.appendChild(audio)
      }
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

      // Restore per-item speed if saved
      if (localStorage.getItem('abs_per_item_speed') !== 'false') {
        const saved = localStorage.getItem(`abs_speed_${item.id}`)
        if (saved) {
          const r = parseFloat(saved)
          if (!isNaN(r) && r !== playbackRate.value) {
            playbackRate.value = r
            audio.playbackRate = r
          }
        }
      }

      _userPaused = false
      await audio.play()
      _updateMediaSession()
      _startSync()
      _checkAutoSleep()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to start playback'
    } finally {
      isLoading.value = false
    }
  }

  function _checkAutoSleep() {
    if (localStorage.getItem('abs_auto_sleep') !== 'true') return
    if (sleepMinsLeft.value !== null || sleepEndOfChapter.value) return
    const now = new Date()
    const h = now.getHours()
    const start = parseInt(localStorage.getItem('abs_auto_sleep_start') ?? '22')
    const end   = parseInt(localStorage.getItem('abs_auto_sleep_end')   ?? '6')
    const inWindow = start <= end
      ? (h >= start && h < end)
      : (h >= start || h < end)
    if (inWindow) {
      const mins = parseInt(localStorage.getItem('abs_auto_sleep_mins') ?? '30')
      setSleepTimer(mins)
    }
  }

  function togglePlay() {
    if (!audio) {
      // audio is null when currentItem was restored from localStorage after a page reload/redeploy
      if (currentItem.value) play(currentItem.value)
      return
    }
    if (isPlaying.value) {
      _userPaused = true
      audio.pause()
    } else {
      _userPaused = false
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
    // Save per-item speed if per-item memory is enabled
    if (localStorage.getItem('abs_per_item_speed') !== 'false' && currentItem.value) {
      try { localStorage.setItem(`abs_speed_${currentItem.value.id}`, String(rate)) } catch {}
    }
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
    chimePlayed = false
    _stopShakeDetection()
  }

  function _startSleepCountdown() {
    if (sleepCountdown) return
    const fadeEnabled = localStorage.getItem('abs_sleep_fade') !== 'false'
    const fadeSecs = parseInt(localStorage.getItem('abs_sleep_fade_secs') ?? '30')
    sleepCountdown = setInterval(() => {
      if (sleepSecsLeft.value !== null && sleepSecsLeft.value > 0) {
        sleepSecsLeft.value--
        sleepMinsLeft.value = Math.ceil(sleepSecsLeft.value / 60)
        if (fadeEnabled && gainNode && sleepSecsLeft.value <= fadeSecs) {
          gainNode.gain.value = sleepFadeStartVol * (sleepSecsLeft.value / fadeSecs)
        }
        const chimeEnabled = localStorage.getItem('abs_sleep_chime') !== 'false'
        if (chimeEnabled && !chimePlayed && sleepSecsLeft.value <= 30 && sleepSecsLeft.value > 28) {
          chimePlayed = true
          _playChime()
        }
      }
    }, 1_000)
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
      _startSleepCountdown()
      _startShakeDetection()
    }
  }

  function _onShake(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity
    if (!a) return
    const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2)
    const now = Date.now()
    const sensitivity = localStorage.getItem('abs_shake_sensitivity') ?? 'medium'
    const threshold = SHAKE_THRESHOLDS[sensitivity] ?? 15
    if (mag < threshold || now - _shakeLastAt < SHAKE_COOLDOWN) return
    _shakeLastAt = now
    const mode = localStorage.getItem('abs_shake_mode') ?? 'off'
    if (mode === 'addTime' && sleepMinsLeft.value !== null) {
      const addMins = parseInt(localStorage.getItem('abs_shake_add_mins') ?? '5')
      setSleepTimer(sleepMinsLeft.value + addMins)
      useNotificationStore().show(`+${addMins} min added`, 'success')
    } else if (mode === 'reset' && sleepTotalSecs.value !== null) {
      setSleepTimer(Math.round(sleepTotalSecs.value / 60))
      useNotificationStore().show('Sleep timer reset', 'info')
    }
  }

  function _startShakeDetection() {
    const mode = localStorage.getItem('abs_shake_mode') ?? 'off'
    if (mode === 'off') return
    // iOS requires permission
    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof dme.requestPermission === 'function') {
      dme.requestPermission().then((state: string) => {
        if (state === 'granted') window.addEventListener('devicemotion', _onShake)
      }).catch(() => {})
    } else {
      window.addEventListener('devicemotion', _onShake)
    }
  }

  function _stopShakeDetection() {
    window.removeEventListener('devicemotion', _onShake)
  }

  function _onVisibilityChange() {
    if (document.hidden) {
      // On iOS, audio 'pause' fires BEFORE visibilitychange, so audio.paused and
      // isPlaying are both already false here. Use _userPaused: it is only ever set
      // true by an explicit user tap — system-driven pauses leave it false.
      _wasPlayingBeforeHide = !_userPaused && !!currentItem.value
      // Belt-and-suspenders: the 'pause' event handler already sets this, but iOS
      // may suspend the WebView before that update reaches the lock screen.
      if (_wasPlayingBeforeHide && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
      if (session.value) _doSync()
    } else {
      if (_wasPlayingBeforeHide && !_userPaused && audio?.paused) {
        if (!_isIOS && audioCtx?.state === 'suspended') {
          audioCtx.resume().then(() => audio?.play()).catch(() => {})
        } else {
          // On iOS: if the audio session is still alive (quick foreground return),
          // play() succeeds silently. If iOS revoked the activation token, play()
          // throws NotAllowedError — catch it and let the user tap play or use the
          // lock-screen/Control-Center MediaSession controls (which carry a gesture).
          audio.play().catch(() => {})
        }
      }
      _wasPlayingBeforeHide = false
    }
  }

  function _onPageHide() {
    if (session.value) _doSync()
  }

  document.addEventListener('visibilitychange', _onVisibilityChange)
  window.addEventListener('pagehide', _onPageHide)

  async function stop() {
    if (seekSyncTimer) { clearTimeout(seekSyncTimer); seekSyncTimer = null }
    _stopSync()
    _clearSleepTimers()
    if (session.value) { await _doSync(); await closeSession(session.value.id).catch(() => {}) }
    _userPaused = false
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

  async function hydrateRecentItems() {
    if (recentItems.value.length > 0) return
    try {
      const items = await getItemsInProgress()
      if (items.length > 0) {
        recentItems.value = items.slice(0, 10)
        _saveRecentItems(recentItems.value)
      }
    } catch { /* silent — localStorage state is used as-is */ }
  }

  return {
    currentItem, session, isPlaying, currentTime, duration, queue, recentItems,
    playbackRate, volume, isLoading, error, sleepMinsLeft, sleepSecsLeft, sleepTotalSecs, sleepEndOfChapter,
    currentChapter, currentTrackIndex, progress, chapterBarrierPaused,
    play, togglePlay, seek, skipBack, skipForward, setRate, setVolume, setSleepTimer, stop, hydrateRecentItems,
    resumeFromBarrier: () => { chapterBarrierPaused.value = false; audio?.play() },
    addToQueue: (item: LibraryItem, episodeId?: string) => { queue.value.push({ item, episodeId }) },
    addToFrontOfQueue: (item: LibraryItem, episodeId?: string) => { queue.value.unshift({ item, episodeId }) },
    clearQueue: () => { queue.value = [] },
    removeFromQueue: (idx: number) => { queue.value.splice(idx, 1) },
    removeFromRecent: (id: string) => {
      recentItems.value = recentItems.value.filter(r => r.id !== id)
      _saveRecentItems(recentItems.value)
    },
    reorderQueue: (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= queue.value.length || to >= queue.value.length) return
      const [entry] = queue.value.splice(from, 1)
      queue.value.splice(to, 0, entry)
    },
  }
})

export interface NowPlayingData {
  title: string
  author: string
  series?: string
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  itemId: string
}

export interface LiveActivityData {
  title: string
  author: string
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
}

export interface RemoteCommand {
  action: 'remotePlay' | 'remotePause' | 'remoteToggle' | 'remoteSkipBack' | 'remoteSkipForward' | 'remoteSeek'
  position?: number
}

type RemoteCommandHandler = (cmd: RemoteCommand) => void
const _handlers: RemoteCommandHandler[] = []

function _post(msg: Record<string, unknown>): void {
  const w = window as any
  if (!w.webkit?.messageHandlers?.mediaBridge) return
  w.webkit.messageHandlers.mediaBridge.postMessage(JSON.stringify(msg))
}

export function setupMediaBridge(): void {
  ;(window as any).__mediaBridge = {
    _onRemoteCommand(cmd: RemoteCommand) {
      _handlers.forEach(h => h(cmd))
    },
  }
}

export function onRemoteCommand(handler: RemoteCommandHandler): void {
  _handlers.push(handler)
}

export function storeCredentials(token: string, host: string): void {
  _post({ action: 'storeCredentials', token, host })
}

export function updateNowPlaying(data: NowPlayingData): void {
  _post({ action: 'updateNowPlaying', ...data })
}

export function clearNowPlaying(): void {
  _post({ action: 'clearNowPlaying' })
}

export function requestNotificationPermission(): void {
  _post({ action: 'requestNotificationPermission' })
}

export function startLiveActivity(data: LiveActivityData): void {
  _post({ action: 'startLiveActivity', ...data })
}

export function updateLiveActivity(data: LiveActivityData): void {
  _post({ action: 'updateLiveActivity', ...data })
}

export function endLiveActivity(): void {
  _post({ action: 'endLiveActivity' })
}

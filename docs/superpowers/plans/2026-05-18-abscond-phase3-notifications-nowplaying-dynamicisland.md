# Phase 3: Push Notifications, Now Playing & Dynamic Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add background library polling (BGAppRefreshTask + local notifications for new books), lock screen / Control Center playback controls (MPNowPlayingInfoCenter + MPRemoteCommandCenter), and Live Activities Dynamic Island (ActivityKit + Widget Extension + AppIntents for interactive play/pause/skip) to the Abscond iOS Capacitor app — no Apple Developer account, sideloaded via Feather.

**Architecture:** A new `MediaBridge.swift` Swift class handles all JS→native communication via a `WKScriptMessageHandler` named `mediaBridge`, covering credential storage, Now Playing updates, notification permission, and Live Activity lifecycle. Remote command events (lock screen button taps) flow native→JS via `evaluateJavaScript`. A separate `BackgroundRefresh.swift` handles BGAppRefreshTask polling using credentials stored in `UserDefaults.standard` (not WKWebView localStorage, which is inaccessible from native code). Live Activities use a `AbscondWidget` Widget Extension target added programmatically via the `xcodeproj` Ruby gem; AppIntents buttons write commands to App Group UserDefaults (`group.org.elabx.abscond`) which MediaBridge polls at 500ms intervals and routes to JS.

**Tech Stack:** Swift 5.0, MediaPlayer framework, UserNotifications framework, BackgroundTasks framework, ActivityKit (iOS 16.2+), WidgetKit, AppIntents (iOS 16.0+), xcodeproj Ruby gem, TypeScript/Vue 3/Pinia (`abs-ui`), Capacitor 7 (`abscond-mobile`)

**Constraints:**
- Sideloaded — no APNs push, no paid Developer account.
- Live Activities and App Group entitlements require Feather to inject `com.apple.developer.live-activity` and `com.apple.security.application-groups`. Without these, Live Activity and Widget commands gracefully no-op.
- BGAppRefreshTask minimum interval is set by iOS (~15–60 min); not suitable for real-time. It is a best-effort background poll.
- Widget Extension requires iOS 16.2+ device for Live Activities.

---

## File Map

**`abscond-mobile` — new files:**
- `ios/App/App/MediaBridge.swift` — WKScriptMessageHandler for `mediaBridge` channel; MPNowPlayingInfoCenter + MPRemoteCommandCenter setup; notification permission; credential storage; ActivityKit Live Activity management; polls App Group UserDefaults for Widget button commands
- `ios/App/App/BackgroundRefresh.swift` — BGAppRefreshTask registration, ABS library polling, UNUserNotificationCenter local notifications
- `ios/App/App/AbscondActivityAttributes.swift` — ActivityKit `AbscondPlayerAttributes` struct (main app target)
- `ios/App/App/App.entitlements` — App Group + Live Activity entitlements
- `ios/App/AbscondWidget/AbscondWidgetBundle.swift` — Widget Extension `@main` entry point
- `ios/App/AbscondWidget/AbscondActivityAttributes.swift` — identical copy of attributes for Widget target
- `ios/App/AbscondWidget/AbscondLiveActivity.swift` — Dynamic Island compact/expanded + lock screen views
- `ios/App/AbscondWidget/PlayerIntents.swift` — AppIntents for toggle/skip-back/skip-forward
- `ios/App/AbscondWidget/Info.plist` — Widget Extension Info.plist
- `scripts/add_widget_extension.rb` — Ruby xcodeproj script to add Widget target to `project.pbxproj`

**`abscond-mobile` — modified:**
- `ios/App/App/ViewController.swift` — register `mediaBridge` message handler
- `ios/App/App/AppDelegate.swift` — register + schedule BGAppRefreshTask
- `ios/App/App/Info.plist` — add `BGTaskSchedulerPermittedIdentifiers`, `NSUserNotificationsUsageDescription`, `fetch` to `UIBackgroundModes`
- `.github/workflows/build-ipa.yml` — add `gem install xcodeproj` + run `add_widget_extension.rb` before `pod install`

**`abs-ui` — new files:**
- `src/plugins/media-bridge.ts` — JS bridge: `setupMediaBridge()`, `storeCredentials()`, `updateNowPlaying()`, `clearNowPlaying()`, `requestNotificationPermission()`, `startLiveActivity()`, `updateLiveActivity()`, `endLiveActivity()`; exposes `window.__mediaBridge._onRemoteCommand()` callback

**`abs-ui` — modified:**
- `src/main.ts` — call `setupMediaBridge()` after `setupHapticsBridge()`
- `src/stores/auth.ts` — call `storeCredentials(token, host)` in `setSession`; `storeCredentials('', '')` in `logout`
- `src/stores/socket.ts` — call `requestNotificationPermission()` when socket first connects
- `src/stores/player.ts` — call `updateNowPlaying()` on play/pause/seek; `clearNowPlaying()` on stop; `startLiveActivity()`/`updateLiveActivity()`/`endLiveActivity()` at play/pause/stop

---

## Task 1: media-bridge.ts (JS side of MediaBridge)

**Files:**
- Create: `abs-ui/src/plugins/media-bridge.ts`

- [ ] **Step 1: Write the failing test**

Create `abs-ui/src/plugins/media-bridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('media-bridge', () => {
  let postMessage: ReturnType<typeof vi.fn>

  beforeEach(() => {
    postMessage = vi.fn()
    ;(window as any).webkit = { messageHandlers: { mediaBridge: { postMessage } } }
    ;(window as any).__mediaBridge = undefined
    vi.resetModules()
  })

  afterEach(() => {
    delete (window as any).webkit
    delete (window as any).__mediaBridge
  })

  it('setupMediaBridge registers __mediaBridge on window', async () => {
    const { setupMediaBridge } = await import('./media-bridge')
    setupMediaBridge()
    expect((window as any).__mediaBridge).toBeDefined()
  })

  it('storeCredentials posts correct message', async () => {
    const { setupMediaBridge, storeCredentials } = await import('./media-bridge')
    setupMediaBridge()
    storeCredentials('tok123', 'http://myserver:3000')
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'storeCredentials', token: 'tok123', host: 'http://myserver:3000' })
    )
  })

  it('updateNowPlaying posts correct message', async () => {
    const { setupMediaBridge, updateNowPlaying } = await import('./media-bridge')
    setupMediaBridge()
    updateNowPlaying({ title: 'Book', author: 'Author', currentTime: 10, duration: 3600, isPlaying: true, playbackRate: 1, itemId: 'item1' })
    const msg = JSON.parse(postMessage.mock.calls[0][0])
    expect(msg.action).toBe('updateNowPlaying')
    expect(msg.title).toBe('Book')
    expect(msg.isPlaying).toBe(true)
  })

  it('requestNotificationPermission posts correct message', async () => {
    const { setupMediaBridge, requestNotificationPermission } = await import('./media-bridge')
    setupMediaBridge()
    requestNotificationPermission()
    const msg = JSON.parse(postMessage.mock.calls[0][0])
    expect(msg.action).toBe('requestNotificationPermission')
  })

  it('remote command callback is called when __mediaBridge._onRemoteCommand is invoked', async () => {
    const { setupMediaBridge, onRemoteCommand } = await import('./media-bridge')
    setupMediaBridge()
    const handler = vi.fn()
    onRemoteCommand(handler)
    ;(window as any).__mediaBridge._onRemoteCommand({ action: 'remotePlay' })
    expect(handler).toHaveBeenCalledWith({ action: 'remotePlay' })
  })

  it('does nothing when webkit bridge is absent (browser)', async () => {
    delete (window as any).webkit
    const { setupMediaBridge, storeCredentials } = await import('./media-bridge')
    setupMediaBridge()
    expect(() => storeCredentials('tok', 'http://host')).not.toThrow()
    expect(postMessage).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/plugins/media-bridge.test.ts 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module './media-bridge'`

- [ ] **Step 3: Write the implementation**

Create `abs-ui/src/plugins/media-bridge.ts`:

```typescript
import { isNativeApp } from '@/api/client'

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
  if (!isNativeApp()) return
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/plugins/media-bridge.test.ts 2>&1 | tail -10
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/plugins/media-bridge.ts src/plugins/media-bridge.test.ts && git commit -m "feat(plugins): add media-bridge plugin for NowPlaying and Live Activity"
```

---

## Task 2: Wire media-bridge into app lifecycle (main.ts, auth.ts, socket.ts)

**Files:**
- Modify: `abs-ui/src/main.ts`
- Modify: `abs-ui/src/stores/auth.ts`
- Modify: `abs-ui/src/stores/socket.ts`

- [ ] **Step 1: Write tests for auth.ts credential sync**

Add to `abs-ui/src/stores/auth.test.ts` (create if not exists):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as mediaBridge from '@/plugins/media-bridge'

vi.mock('@/plugins/media-bridge', () => ({
  storeCredentials: vi.fn(),
}))

describe('auth store — media bridge sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('storeCredentials called with token and host on setSession', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    store.setSession('tok', { id: '1', username: 'u', isAdminOrUp: false })
    expect(mediaBridge.storeCredentials).toHaveBeenCalledWith('tok', expect.any(String))
  })

  it('storeCredentials cleared on logout', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    store.setSession('tok', { id: '1', username: 'u', isAdminOrUp: false })
    store.logout()
    expect(mediaBridge.storeCredentials).toHaveBeenLastCalledWith('', '')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/auth.test.ts 2>&1 | tail -10
```

Expected: FAIL — `storeCredentials not called`

- [ ] **Step 3: Wire up main.ts**

Edit `abs-ui/src/main.ts`:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setupHapticsBridge } from './plugins/haptics-bridge'
import { setupMediaBridge, storeCredentials } from './plugins/media-bridge'
import { isNativeApp, getBaseUrl } from './api/client'

setupHapticsBridge()
setupMediaBridge()

// Sync stored credentials to native layer on startup so BGAppRefreshTask can use them
if (isNativeApp()) {
  getBaseUrl().then(host => {
    const token = localStorage.getItem('abs_token') ?? ''
    if (token && host) storeCredentials(token, host)
  })
}

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .mount('#app')
```

- [ ] **Step 4: Wire up auth.ts**

Edit `abs-ui/src/stores/auth.ts`. Replace the `setSession` and `logout` functions:

```typescript
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storeCredentials } from '@/plugins/media-bridge'
import { getBaseUrl } from '@/api/client'

export interface AbsUser {
  id: string
  username: string
  isAdminOrUp: boolean
  token?: string
}

const STORAGE_KEY = 'abscond_auth'

function loadFromStorage(): { token: string | null; user: AbsUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = loadFromStorage()
  const token = ref<string | null>(stored.token)
  const user = ref<AbsUser | null>(stored.user)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdminOrUp ?? false)

  function setSession(newToken: string, newUser: AbsUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }))
    localStorage.setItem('abs_token', newToken)
    getBaseUrl().then(host => storeCredentials(newToken, host ?? ''))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('abs_token')
    storeCredentials('', '')
  }

  // Sync token for player on store init
  if (stored.token) localStorage.setItem('abs_token', stored.token)

  return { token, user, isLoggedIn, isAdmin, setSession, logout }
})
```

- [ ] **Step 5: Wire up socket.ts — request notification permission on first connect**

In `abs-ui/src/stores/socket.ts`, find the `sock.on('connect', ...)` handler and add the notification permission call. The relevant section currently reads:

```typescript
sock.on('connect',    () => { connected.value = true })
```

Replace with:

```typescript
let _notifPermRequested = false
sock.on('connect', () => {
  connected.value = true
  if (!_notifPermRequested) {
    _notifPermRequested = true
    import('@/plugins/media-bridge').then(({ requestNotificationPermission }) => {
      requestNotificationPermission()
    })
  }
})
```

- [ ] **Step 6: Run tests**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/auth.test.ts 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/main.ts src/stores/auth.ts src/stores/socket.ts src/stores/auth.test.ts && git commit -m "feat(stores): sync credentials to native layer and request notification permission"
```

---

## Task 3: player.ts — updateNowPlaying + Live Activity integration

**Files:**
- Modify: `abs-ui/src/stores/player.ts`

The player already calls `_updateMediaSession()` (Web MediaSession API). We add parallel native MediaBridge calls alongside these. Key integration points:
- After `play()` starts: `startLiveActivity()` + `updateNowPlaying()`
- On `audio.play` event (isPlaying becomes true): `updateNowPlaying()` + `updateLiveActivity()`
- On `audio.pause` event (isPlaying becomes false): `updateNowPlaying()` + `updateLiveActivity()`
- On `stop()` / session end: `endLiveActivity()` + `clearNowPlaying()`
- `_onTimeUpdate` every 5s: `updateNowPlaying()` with current time
- Remote commands from native → call appropriate player methods

- [ ] **Step 1: Write test for remote command routing**

In `abs-ui/src/stores/player.test.ts` (add to existing or create):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as mediaBridge from '@/plugins/media-bridge'

vi.mock('@/plugins/media-bridge', () => ({
  onRemoteCommand: vi.fn(),
  updateNowPlaying: vi.fn(),
  clearNowPlaying: vi.fn(),
  startLiveActivity: vi.fn(),
  updateLiveActivity: vi.fn(),
  endLiveActivity: vi.fn(),
  setupMediaBridge: vi.fn(),
  storeCredentials: vi.fn(),
  requestNotificationPermission: vi.fn(),
}))

describe('player store — native media bridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('registers remote command handler on store init', async () => {
    await import('@/stores/player')
    expect(mediaBridge.onRemoteCommand).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/player.test.ts 2>&1 | tail -10
```

Expected: FAIL — `onRemoteCommand not called`

- [ ] **Step 3: Add native bridge integration to player.ts**

At the top of `abs-ui/src/stores/player.ts`, add the import after existing imports:

```typescript
import { isNativeApp } from '@/api/client'
import {
  onRemoteCommand, updateNowPlaying as nativeUpdateNowPlaying,
  clearNowPlaying, startLiveActivity, updateLiveActivity, endLiveActivity,
} from '@/plugins/media-bridge'
```

Add this helper function after the `_isIOS` declaration:

```typescript
function _buildNowPlayingPayload(playing: boolean) {
  if (!currentItem.value || !session.value) return null
  const meta = currentItem.value.media.metadata
  const token = localStorage.getItem('abs_token') ?? ''
  return {
    title:       session.value.displayTitle || meta.title,
    author:      session.value.displayAuthor || (meta.authors ?? []).map((a: { name: string }) => a.name).join(', ') || (meta as Record<string, unknown>).authorName as string || '',
    series:      (meta.series ?? []).map((s: { name: string }) => s.name).join(', ') || '',
    currentTime: currentTime.value,
    duration:    duration.value,
    isPlaying:   playing,
    playbackRate: playbackRate.value,
    itemId:      currentItem.value.id,
  }
}

let _liveActivityStarted = false
let _nativeTimeTimer = 0

function _syncNativeNowPlaying(playing: boolean) {
  if (!isNativeApp()) return
  const payload = _buildNowPlayingPayload(playing)
  if (!payload) return
  nativeUpdateNowPlaying(payload)
  if (playing && !_liveActivityStarted) {
    _liveActivityStarted = true
    startLiveActivity(payload)
  } else if (_liveActivityStarted) {
    updateLiveActivity(payload)
  }
}
```

In the `_attachListeners` function, add native sync calls after the existing MediaSession calls inside the `play` and `pause` event handlers:

In the `audio.addEventListener('play', ...)` handler, add after `navigator.mediaSession.playbackState = 'playing'`:

```typescript
      _syncNativeNowPlaying(true)
```

In the `audio.addEventListener('pause', ...)` handler, add after `navigator.mediaSession.playbackState = 'paused'`:

```typescript
      _syncNativeNowPlaying(false)
```

In `_onTimeUpdate`, after the existing 5s MediaSession setPositionState block, add:

```typescript
    if (isNativeApp() && now - _nativeTimeTimer > 5000 && _liveActivityStarted) {
      _nativeTimeTimer = now
      _syncNativeNowPlaying(isPlaying.value)
    }
```

In the `stop` / session-close code (find where `closeSession` is called), after it, add:

```typescript
    if (isNativeApp() && _liveActivityStarted) {
      _liveActivityStarted = false
      endLiveActivity()
      clearNowPlaying()
    }
```

At the bottom of the `defineStore` callback, before `return`, register remote command handling:

```typescript
  // Wire native remote commands to player actions (iOS lock screen / Control Center)
  onRemoteCommand((cmd) => {
    switch (cmd.action) {
      case 'remotePlay':    audio?.play(); break
      case 'remotePause':   audio?.pause(); break
      case 'remoteToggle':  togglePlay(); break
      case 'remoteSkipBack': skipBack(10); break
      case 'remoteSkipForward': skipForward(30); break
      case 'remoteSeek':   if (cmd.position != null) seek(cmd.position); break
    }
  })
```

Also update `_updateMediaSession` to also call `_syncNativeNowPlaying` (call it from the same place `_updateMediaSession` is called — after play starts):

After the `_updateMediaSession()` call on line ~407 in the `play()` function, add:

```typescript
      _syncNativeNowPlaying(true)
```

- [ ] **Step 4: Run test**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/player.test.ts 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /config/workspace/gh/abs-ui && git add src/stores/player.ts src/stores/player.test.ts && git commit -m "feat(player): sync Now Playing and Live Activity to native iOS layer"
```

---

## Task 4: MediaBridge.swift — NowPlaying + RemoteCommands + Notifications

**Files:**
- Create: `abscond-mobile/ios/App/App/MediaBridge.swift`

This is pure Swift — no test file. Manual verification: build + run on device/simulator.

- [ ] **Step 1: Create MediaBridge.swift**

```swift
import UIKit
import MediaPlayer
import UserNotifications
import WebKit

final class MediaBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private var coverFetchTask: URLSessionDataTask?
    private var cmdPollTimer: Timer?
    private var lastWidgetCmdTs: Double = 0

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
        setupRemoteCommands()
        startWidgetCommandPolling()
    }

    // MARK: - Remote Commands → JS

    private func setupRemoteCommands() {
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.isEnabled = true
        c.pauseCommand.isEnabled = true
        c.togglePlayPauseCommand.isEnabled = true
        c.skipBackwardCommand.isEnabled = true
        c.skipBackwardCommand.preferredIntervals = [10]
        c.skipForwardCommand.isEnabled = true
        c.skipForwardCommand.preferredIntervals = [30]
        c.changePlaybackPositionCommand.isEnabled = true

        c.playCommand.addTarget             { [weak self] _ in self?.emit("remotePlay");         return .success }
        c.pauseCommand.addTarget            { [weak self] _ in self?.emit("remotePause");        return .success }
        c.togglePlayPauseCommand.addTarget  { [weak self] _ in self?.emit("remoteToggle");       return .success }
        c.skipBackwardCommand.addTarget     { [weak self] _ in self?.emit("remoteSkipBack");     return .success }
        c.skipForwardCommand.addTarget      { [weak self] _ in self?.emit("remoteSkipForward");  return .success }
        c.changePlaybackPositionCommand.addTarget { [weak self] event in
            if let e = event as? MPChangePlaybackPositionCommandEvent {
                self?.emit("remoteSeek", extra: ["position": e.positionTime])
            }
            return .success
        }
    }

    private func emit(_ action: String, extra: [String: Any] = [:]) {
        var payload: [String: Any] = ["action": action]
        payload.merge(extra) { _, new in new }
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: .fragmentsAllowed),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.__mediaBridge?._onRemoteCommand(\(json))", completionHandler: nil)
        }
    }

    // MARK: - Widget Command Polling (App Group → JS)

    private func startWidgetCommandPolling() {
        cmdPollTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkWidgetCommands()
        }
    }

    private func checkWidgetCommands() {
        guard let defaults = UserDefaults(suiteName: "group.org.elabx.abscond") else { return }
        guard let raw = defaults.string(forKey: "abs_cmd"), !raw.isEmpty else { return }
        let parts = raw.split(separator: ":").map(String.init)
        guard parts.count == 2, let ts = Double(parts[1]), ts > lastWidgetCmdTs else { return }
        lastWidgetCmdTs = ts
        let action = parts[0]
        switch action {
        case "toggle":      emit("remoteToggle")
        case "skipBack":    emit("remoteSkipBack")
        case "skipForward": emit("remoteSkipForward")
        default: break
        }
    }

    // MARK: - WKScriptMessageHandler (JS → native)

    func userContentController(_ userContentController: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard let body = message.body as? String,
              let data = body.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let action = json["action"] as? String else { return }

        switch action {
        case "storeCredentials":
            UserDefaults.standard.set(json["token"] as? String ?? "", forKey: "abs_native_token")
            UserDefaults.standard.set(json["host"]  as? String ?? "", forKey: "abs_native_host")

        case "updateNowPlaying":
            updateNowPlaying(json)

        case "clearNowPlaying":
            coverFetchTask?.cancel()
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil

        case "requestNotificationPermission":
            UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge]) { _, _ in }

        case "startLiveActivity":
            if #available(iOS 16.2, *) { startLiveActivity(json) }

        case "updateLiveActivity":
            if #available(iOS 16.2, *) { updateLiveActivity(json) }

        case "endLiveActivity":
            if #available(iOS 16.2, *) { endAllLiveActivities() }

        default: break
        }
    }

    // MARK: - Now Playing Info

    private func updateNowPlaying(_ json: [String: Any]) {
        let isPlaying    = json["isPlaying"]    as? Bool   ?? false
        let rate         = json["playbackRate"] as? Double ?? 1.0
        let currentTime  = json["currentTime"]  as? Double ?? 0
        let dur          = json["duration"]     as? Double ?? 0

        var info: [String: Any] = [
            MPMediaItemPropertyTitle:                          json["title"]  as? String ?? "",
            MPMediaItemPropertyArtist:                         json["author"] as? String ?? "",
            MPMediaItemPropertyAlbumTitle:                     json["series"] as? String ?? "",
            MPNowPlayingInfoPropertyElapsedPlaybackTime:       currentTime,
            MPMediaItemPropertyPlaybackDuration:               dur,
            MPNowPlayingInfoPropertyPlaybackRate:              isPlaying ? rate : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate:       rate,
            MPNowPlayingInfoPropertyMediaType:                 MPNowPlayingInfoMediaType.audio.rawValue,
        ]
        // Preserve existing artwork while async fetch is in-flight
        if let art = MPNowPlayingInfoCenter.default().nowPlayingInfo?[MPMediaItemPropertyArtwork] {
            info[MPMediaItemPropertyArtwork] = art
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        if let itemId = json["itemId"] as? String,
           let host   = UserDefaults.standard.string(forKey: "abs_native_host"), !host.isEmpty,
           let token  = UserDefaults.standard.string(forKey: "abs_native_token"), !token.isEmpty,
           let url    = URL(string: "\(host)/api/items/\(itemId)/cover?token=\(token)") {
            fetchArtwork(url)
        }
    }

    private func fetchArtwork(_ url: URL) {
        coverFetchTask?.cancel()
        coverFetchTask = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data = data, let image = UIImage(data: data) else { return }
            let size = CGSize(width: 300, height: 300)
            let art  = MPMediaItemArtwork(boundsSize: size) { _ in image }
            DispatchQueue.main.async {
                var nowPlaying = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                nowPlaying[MPMediaItemPropertyArtwork] = art
                MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlaying
            }
        }
        coverFetchTask?.resume()
    }

    // MARK: - Live Activities (iOS 16.2+)

    @available(iOS 16.2, *)
    private func startLiveActivity(_ json: [String: Any]) {
        // End any existing activities first
        Task {
            for activity in Activity<AbscondPlayerAttributes>.activities {
                await activity.end(using: nil, dismissalPolicy: .immediate)
            }
            let attrs = AbscondPlayerAttributes()
            let state = makeContentState(from: json)
            _ = try? Activity.request(attributes: attrs, contentState: state, pushType: nil)
        }
    }

    @available(iOS 16.2, *)
    private func updateLiveActivity(_ json: [String: Any]) {
        let state = makeContentState(from: json)
        Task {
            for activity in Activity<AbscondPlayerAttributes>.activities {
                await activity.update(using: state)
            }
        }
    }

    @available(iOS 16.2, *)
    private func endAllLiveActivities() {
        Task {
            for activity in Activity<AbscondPlayerAttributes>.activities {
                await activity.end(using: nil, dismissalPolicy: .immediate)
            }
        }
    }

    @available(iOS 16.2, *)
    private func makeContentState(from json: [String: Any]) -> AbscondPlayerAttributes.ContentState {
        let isPlaying   = json["isPlaying"]    as? Bool   ?? false
        let currentTime = json["currentTime"]  as? Double ?? 0
        let duration    = json["duration"]     as? Double ?? 0
        let rate        = json["playbackRate"] as? Double ?? 1.0
        let title       = json["title"]        as? String ?? ""
        let author      = json["author"]       as? String ?? ""
        // startTime: when playing, set to (now - currentTime/rate) so Dynamic Island timer auto-advances
        let startTime: Date? = isPlaying
            ? Date().addingTimeInterval(-(currentTime / rate))
            : nil
        return AbscondPlayerAttributes.ContentState(
            startTime:    startTime,
            startOffset:  currentTime,
            duration:     duration,
            playbackRate: rate,
            isPlaying:    isPlaying,
            title:        title,
            author:       author
        )
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /config/workspace/gh/abscond-mobile && xcodebuild -workspace ios/App/App.xcworkspace -scheme App -destination "generic/platform=iOS Simulator" -configuration Debug build CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" 2>&1 | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED" | tail -5
```

Expected: Error about `AbscondPlayerAttributes` not found — that's Task 8.

- [ ] **Step 3: Commit partial**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/App/MediaBridge.swift && git commit -m "feat(ios): add MediaBridge for NowPlaying, RemoteCommands, and LiveActivity"
```

---

## Task 5: ViewController.swift + Info.plist + AppDelegate.swift

**Files:**
- Modify: `abscond-mobile/ios/App/App/ViewController.swift`
- Modify: `abscond-mobile/ios/App/App/Info.plist`
- Modify: `abscond-mobile/ios/App/App/AppDelegate.swift`

- [ ] **Step 1: Update ViewController.swift to register mediaBridge**

Replace the full contents of `ios/App/App/ViewController.swift`:

```swift
import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    private var mediaBridge: MediaBridge?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HapticsBridgePlugin())
        if let wv = bridge?.webView {
            mediaBridge = MediaBridge(webView: wv)
            wv.configuration.userContentController.add(mediaBridge!, name: "mediaBridge")
        }
    }
}
```

- [ ] **Step 2: Update Info.plist — add BGTask identifier, notification usage string, background-fetch**

The current `UIBackgroundModes` array has `audio`. Add `fetch`. Also add `BGTaskSchedulerPermittedIdentifiers` and `NSUserNotificationsUsageDescription`.

Open `ios/App/App/Info.plist` and add before the closing `</dict>`:

```xml
	<key>BGTaskSchedulerPermittedIdentifiers</key>
	<array>
		<string>org.elabx.abscond.library_poll</string>
	</array>
	<key>NSUserNotificationsUsageDescription</key>
	<string>Get notified when new books are added to your library.</string>
```

Also change the `UIBackgroundModes` array from:

```xml
	<key>UIBackgroundModes</key>
	<array>
		<string>audio</string>
	</array>
```

to:

```xml
	<key>UIBackgroundModes</key>
	<array>
		<string>audio</string>
		<string>fetch</string>
		<string>processing</string>
	</array>
```

- [ ] **Step 3: Update AppDelegate.swift — register + schedule BGAppRefreshTask**

Add import at top and registration call in `didFinishLaunchingWithOptions`. Replace `AppDelegate.swift` content:

```swift
import UIKit
import Capacitor
import AVFoundation
import BackgroundTasks

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        NSSetUncaughtExceptionHandler { exception in
            let msg = "UNCAUGHT \(exception.name.rawValue): \(exception.reason ?? "no reason") | \(exception.callStackSymbols.prefix(5).joined(separator: " | "))"
            var log = UserDefaults.standard.stringArray(forKey: "abs_debug_log") ?? []
            log.append(msg)
            if log.count > 200 { log = Array(log.suffix(200)) }
            UserDefaults.standard.set(log, forKey: "abs_debug_log")
            UserDefaults.standard.synchronize()
        }

        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback, mode: .spokenAudio,
                options: [.allowBluetooth, .allowBluetoothA2DP])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AVAudioSession setup failed: \(error)")
        }

        BackgroundRefresh.register()
        BackgroundRefresh.schedule()

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {
        BackgroundRefresh.schedule()
    }
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/App/ViewController.swift ios/App/App/Info.plist ios/App/App/AppDelegate.swift && git commit -m "feat(ios): register MediaBridge handler, BGTask, and notification usage"
```

---

## Task 6: BackgroundRefresh.swift

**Files:**
- Create: `abscond-mobile/ios/App/App/BackgroundRefresh.swift`

- [ ] **Step 1: Create BackgroundRefresh.swift**

```swift
import Foundation
import BackgroundTasks
import UserNotifications

struct BackgroundRefresh {
    static let taskId = "org.elabx.abscond.library_poll"

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskId, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            handleTask(refreshTask)
        }
    }

    static func schedule() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskId)
        let request = BGAppRefreshTaskRequest(identifier: taskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func handleTask(_ task: BGAppRefreshTask) {
        schedule()

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        let token = UserDefaults.standard.string(forKey: "abs_native_token") ?? ""
        let host  = UserDefaults.standard.string(forKey: "abs_native_host") ?? ""

        guard !token.isEmpty, !host.isEmpty else {
            task.setTaskCompleted(success: true)
            return
        }

        fetchNewItems(host: host, token: token) { newTitles in
            for title in newTitles {
                postLocalNotification(title: "New audiobook added", body: title)
            }
            task.setTaskCompleted(success: true)
        }
    }

    private static func fetchNewItems(host: String, token: String, completion: @escaping ([String]) -> Void) {
        guard let url = URL(string: "\(host)/api/libraries") else { completion([]); return }
        var req = URLRequest(url: url, timeoutInterval: 20)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let libraries = json["libraries"] as? [[String: Any]],
                  let firstId = libraries.first?["id"] as? String else {
                completion([]); return
            }
            fetchRecentItems(host: host, token: token, libraryId: firstId, completion: completion)
        }.resume()
    }

    private static func fetchRecentItems(host: String, token: String, libraryId: String, completion: @escaping ([String]) -> Void) {
        guard let url = URL(string: "\(host)/api/libraries/\(libraryId)/items?sort=addedAt&desc=1&limit=20") else {
            completion([]); return
        }
        var req = URLRequest(url: url, timeoutInterval: 20)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let results = json["results"] as? [[String: Any]] else {
                completion([]); return
            }

            let lastSeenAt = UserDefaults.standard.double(forKey: "abs_bg_last_seen_at")
            var newTitles: [String] = []
            var maxAt = lastSeenAt

            for item in results {
                let addedAt = item["addedAt"] as? Double ?? 0
                guard addedAt > lastSeenAt else { continue }
                let meta = (item["media"] as? [String: Any])?["metadata"] as? [String: Any]
                let title = meta?["title"] as? String ?? "Unknown"
                newTitles.append(title)
                maxAt = max(maxAt, addedAt)
            }

            if maxAt > lastSeenAt {
                UserDefaults.standard.set(maxAt, forKey: "abs_bg_last_seen_at")
            }
            completion(newTitles)
        }.resume()
    }

    private static func postLocalNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body  = body
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )
        UNUserNotificationCenter.current().add(request)
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/App/BackgroundRefresh.swift && git commit -m "feat(ios): add BGAppRefreshTask library poll with local notifications"
```

---

## Task 7: AbscondActivityAttributes.swift (main app target)

**Files:**
- Create: `abscond-mobile/ios/App/App/AbscondActivityAttributes.swift`

This resolves the compilation error introduced in Task 4 (MediaBridge references this type).

- [ ] **Step 1: Create AbscondActivityAttributes.swift**

```swift
import Foundation
#if canImport(ActivityKit)
import ActivityKit

struct AbscondPlayerAttributes: ActivityAttributes {
    // Static attributes (don't change during activity lifetime)
    // None needed — title/author are in ContentState for easy updates

    public struct ContentState: Codable, Hashable {
        // When isPlaying=true: startTime = Date() - (startOffset / playbackRate)
        // Dynamic Island timer counts down automatically without requiring updates
        var startTime: Date?
        var startOffset: Double
        var duration: Double
        var playbackRate: Double
        var isPlaying: Bool
        var title: String
        var author: String
    }
}
#endif
```

- [ ] **Step 2: Verify build succeeds**

```bash
cd /config/workspace/gh/abscond-mobile && xcodebuild -workspace ios/App/App.xcworkspace -scheme App -destination "generic/platform=iOS Simulator" -configuration Debug build CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" 2>&1 | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED" | tail -5
```

Expected: `BUILD SUCCEEDED`

- [ ] **Step 3: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/App/AbscondActivityAttributes.swift && git commit -m "feat(ios): add AbscondPlayerAttributes for ActivityKit Live Activities"
```

---

## Task 8: App.entitlements

**Files:**
- Create: `abscond-mobile/ios/App/App/App.entitlements`
- Modify: `abscond-mobile/ios/App/App.xcodeproj/project.pbxproj` (set CODE_SIGN_ENTITLEMENTS)

- [ ] **Step 1: Create App.entitlements**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.org.elabx.abscond</string>
	</array>
	<key>com.apple.developer.live-activity</key>
	<true/>
</dict>
</plist>
```

- [ ] **Step 2: Add CODE_SIGN_ENTITLEMENTS to project.pbxproj build settings**

Find all instances of `DEVELOPMENT_TEAM = "";` in `ios/App/App.xcodeproj/project.pbxproj` for the App target's Debug and Release configurations, and add `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;` in the same config blocks.

Run:

```bash
cd /config/workspace/gh/abscond-mobile
# Show context around DEVELOPMENT_TEAM lines to find right location
grep -n "DEVELOPMENT_TEAM\|CODE_SIGN_ENTITLEMENTS" ios/App/App.xcodeproj/project.pbxproj | head -20
```

Then use Edit to add `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;` in both the Debug and Release build setting blocks for the App target. Place it adjacent to the existing `DEVELOPMENT_TEAM = "";` lines.

- [ ] **Step 3: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/App/App.entitlements ios/App/App.xcodeproj/project.pbxproj && git commit -m "feat(ios): add App.entitlements for App Group and Live Activity"
```

---

## Task 9: Widget Extension source files

**Files:**
- Create: `abscond-mobile/ios/App/AbscondWidget/AbscondWidgetBundle.swift`
- Create: `abscond-mobile/ios/App/AbscondWidget/AbscondActivityAttributes.swift`
- Create: `abscond-mobile/ios/App/AbscondWidget/AbscondLiveActivity.swift`
- Create: `abscond-mobile/ios/App/AbscondWidget/PlayerIntents.swift`
- Create: `abscond-mobile/ios/App/AbscondWidget/Info.plist`

- [ ] **Step 1: Create directory**

```bash
mkdir -p /config/workspace/gh/abscond-mobile/ios/App/AbscondWidget
```

- [ ] **Step 2: Create AbscondWidgetBundle.swift**

```swift
import WidgetKit
import SwiftUI

@main
struct AbscondWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            AbscondLiveActivityWidget()
        }
    }
}
```

- [ ] **Step 3: Create AbscondActivityAttributes.swift (Widget target copy)**

Identical to the main app copy:

```swift
import Foundation
#if canImport(ActivityKit)
import ActivityKit

struct AbscondPlayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var startTime: Date?
        var startOffset: Double
        var duration: Double
        var playbackRate: Double
        var isPlaying: Bool
        var title: String
        var author: String
    }
}
#endif
```

- [ ] **Step 4: Create AbscondLiveActivity.swift**

```swift
import SwiftUI
import WidgetKit
#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.2, *)
struct AbscondLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AbscondPlayerAttributes.self) { context in
            LockScreenLiveActivityView(context: context)
                .activityBackgroundTint(Color(red: 0.055, green: 0.055, blue: 0.055))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "book.fill")
                            .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))
                            .font(.subheadline)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.state.title)
                                .font(.caption.weight(.semibold))
                                .lineLimit(1)
                            Text(context.state.author)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    IslandControlsView(context: context)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandProgressView(context: context)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 6)
                }
            } compactLeading: {
                Image(systemName: context.state.isPlaying ? "waveform" : "book.fill")
                    .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))
                    .font(.caption2)
                    .symbolEffect(.variableColor.iterative, isActive: context.state.isPlaying)
            } compactTrailing: {
                IslandCompactTrailing(context: context)
            } minimal: {
                Image(systemName: context.state.isPlaying ? "waveform" : "book.fill")
                    .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))
                    .font(.caption2)
            }
            .widgetURL(URL(string: "abscond://player"))
        }
    }
}

// MARK: - Sub-views

@available(iOS 16.2, *)
private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<AbscondPlayerAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "book.fill")
                .font(.title2)
                .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))

            VStack(alignment: .leading, spacing: 3) {
                Text(context.state.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(context.state.author)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            IslandControlsView(context: context)
        }
        .padding(14)
    }
}

@available(iOS 16.2, *)
private struct IslandControlsView: View {
    let context: ActivityViewContext<AbscondPlayerAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Button(intent: SkipBackIntent()) {
                Image(systemName: "gobackward.10").font(.callout)
            }
            .buttonStyle(.plain)
            .foregroundColor(.white)

            Button(intent: TogglePlaybackIntent()) {
                Image(systemName: context.state.isPlaying ? "pause.fill" : "play.fill")
                    .font(.title3)
            }
            .buttonStyle(.plain)
            .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))

            Button(intent: SkipForwardIntent()) {
                Image(systemName: "goforward.30").font(.callout)
            }
            .buttonStyle(.plain)
            .foregroundColor(.white)
        }
    }
}

@available(iOS 16.2, *)
private struct IslandCompactTrailing: View {
    let context: ActivityViewContext<AbscondPlayerAttributes>

    var body: some View {
        if let startTime = context.state.startTime, context.state.isPlaying,
           context.state.duration > 0 {
            let remaining = context.state.duration - context.state.startOffset
            let endDate = startTime.addingTimeInterval(remaining / context.state.playbackRate)
            Text(timerInterval: Date.now...endDate, countsDown: true)
                .font(.caption2.monospacedDigit())
                .foregroundColor(Color(red: 0.525, green: 0.231, blue: 1.0))
                .frame(width: 44)
        } else {
            Text(formatSeconds(context.state.startOffset))
                .font(.caption2.monospacedDigit())
                .foregroundColor(.secondary)
        }
    }
}

@available(iOS 16.2, *)
private struct IslandProgressView: View {
    let context: ActivityViewContext<AbscondPlayerAttributes>

    var progress: Double {
        guard context.state.duration > 0 else { return 0 }
        return min(1.0, context.state.startOffset / context.state.duration)
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.12))
                    .frame(height: 3)
                Capsule()
                    .fill(Color(red: 0.525, green: 0.231, blue: 1.0))
                    .frame(width: geo.size.width * progress, height: 3)
            }
        }
        .frame(height: 3)
    }
}

private func formatSeconds(_ s: Double) -> String {
    let total = Int(s)
    let h = total / 3600; let m = (total % 3600) / 60; let sec = total % 60
    return h > 0
        ? String(format: "%d:%02d:%02d", h, m, sec)
        : String(format: "%d:%02d", m, sec)
}
#endif
```

- [ ] **Step 5: Create PlayerIntents.swift**

The AppIntents write to App Group UserDefaults. The main app's MediaBridge polls these at 500ms. If `UserDefaults(suiteName:)` returns nil (no App Group entitlement), the write is silently skipped.

```swift
import Foundation
import AppIntents

@available(iOS 16.0, *)
struct TogglePlaybackIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Playback"
    static var description = IntentDescription("Play or pause the current audiobook.")

    func perform() async throws -> some IntentResult {
        writeCommand("toggle")
        return .result()
    }
}

@available(iOS 16.0, *)
struct SkipBackIntent: AppIntent {
    static var title: LocalizedStringResource = "Skip Back 10s"
    static var description = IntentDescription("Skip back 10 seconds.")

    func perform() async throws -> some IntentResult {
        writeCommand("skipBack")
        return .result()
    }
}

@available(iOS 16.0, *)
struct SkipForwardIntent: AppIntent {
    static var title: LocalizedStringResource = "Skip Forward 30s"
    static var description = IntentDescription("Skip forward 30 seconds.")

    func perform() async throws -> some IntentResult {
        writeCommand("skipForward")
        return .result()
    }
}

// Writes to App Group defaults so the main app's MediaBridge can pick it up via polling
private func writeCommand(_ name: String) {
    let defaults = UserDefaults(suiteName: "group.org.elabx.abscond")
    defaults?.set("\(name):\(Date().timeIntervalSince1970)", forKey: "abs_cmd")
}
```

- [ ] **Step 6: Create Info.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>AbscondWidget</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>XPC!</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>
```

- [ ] **Step 7: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add ios/App/AbscondWidget/ && git commit -m "feat(ios): add AbscondWidget extension source files for Dynamic Island"
```

---

## Task 10: scripts/add_widget_extension.rb (xcodeproj setup)

**Files:**
- Create: `abscond-mobile/scripts/add_widget_extension.rb`

This script is run in CI (and locally) to add the Widget Extension target to `project.pbxproj` without requiring Xcode GUI. Run with `ruby scripts/add_widget_extension.rb` from the repo root.

- [ ] **Step 1: Create scripts/add_widget_extension.rb**

```ruby
#!/usr/bin/env ruby
# Adds the AbscondWidget extension target to App.xcodeproj.
# Run from repo root: ruby scripts/add_widget_extension.rb
# Idempotent — skips gracefully if target already exists.

require 'xcodeproj'
require 'fileutils'

PROJECT_PATH   = File.expand_path('../ios/App/App.xcodeproj', __dir__)
WIDGET_DIR_REL = 'AbscondWidget'
WIDGET_NAME    = 'AbscondWidget'
BUNDLE_ID      = 'org.elabx.abscond.widget'
DEPLOY_TARGET  = '16.2'
SOURCE_FILES   = %w[AbscondWidgetBundle.swift AbscondActivityAttributes.swift AbscondLiveActivity.swift PlayerIntents.swift].freeze

project = Xcodeproj::Project.open(PROJECT_PATH)

if project.targets.any? { |t| t.name == WIDGET_NAME }
  puts "#{WIDGET_NAME} target already exists — skipping."
  exit 0
end

# --- Create target ---
widget_target = project.new_target(:app_extension, WIDGET_NAME, :ios, DEPLOY_TARGET)
widget_target.product_type = 'com.apple.product-type.app-extension.widgetkit-extension'

%w[Debug Release].each do |cfg|
  settings = widget_target.build_configuration_list.build_settings(cfg)
  settings['PRODUCT_BUNDLE_IDENTIFIER']           = BUNDLE_ID
  settings['SWIFT_VERSION']                        = '5.0'
  settings['IPHONEOS_DEPLOYMENT_TARGET']           = DEPLOY_TARGET
  settings['INFOPLIST_FILE']                       = "#{WIDGET_DIR_REL}/Info.plist"
  settings['LD_RUNPATH_SEARCH_PATHS']              = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  settings['SKIP_INSTALL']                         = 'YES'
  settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'NO'
  settings['MARKETING_VERSION']                    = '$(inherited)'
  settings['CURRENT_PROJECT_VERSION']              = '$(inherited)'
  settings['CODE_SIGNING_REQUIRED']                = 'NO'
  settings['CODE_SIGN_IDENTITY']                   = ''
  settings['CODE_SIGN_ENTITLEMENTS']               = "#{WIDGET_DIR_REL}/AbscondWidget.entitlements"
end

# --- File group ---
group = project.main_group.find_subpath(WIDGET_DIR_REL, true)
group.set_source_tree('<group>')
group.set_path(WIDGET_DIR_REL)

SOURCE_FILES.each do |fname|
  ref = group.new_file(fname)
  widget_target.source_build_phase.add_file_reference(ref)
end
# Info.plist as resource reference (not compiled)
group.new_file('Info.plist')

# --- Embed in App target ---
app_target = project.targets.find { |t| t.name == 'App' }
raise 'App target not found' unless app_target

embed_phase = app_target.build_phases.find do |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
    p.name == 'Embed Foundation Extensions'
end
unless embed_phase
  embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed_phase.name = 'Embed Foundation Extensions'
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
  app_target.build_phases << embed_phase
end

# Add widget product reference to app's embed phase
widget_product = widget_target.product_reference
build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
build_file.file_ref = widget_product
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
embed_phase.files << build_file

# Add target dependency
app_target.add_dependency(widget_target)

project.save
puts "#{WIDGET_NAME} target added to #{PROJECT_PATH}"
```

- [ ] **Step 2: Create Widget entitlements file**

Create `abscond-mobile/ios/App/AbscondWidget/AbscondWidget.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.org.elabx.abscond</string>
	</array>
</dict>
</plist>
```

- [ ] **Step 3: Test the script locally**

```bash
cd /config/workspace/gh/abscond-mobile
gem install xcodeproj --no-document 2>&1 | tail -3
ruby scripts/add_widget_extension.rb
```

Expected output: `AbscondWidget target added to .../App.xcodeproj`

Run again to verify idempotency:

```bash
ruby scripts/add_widget_extension.rb
```

Expected: `AbscondWidget target already exists — skipping.`

- [ ] **Step 4: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add scripts/add_widget_extension.rb ios/App/AbscondWidget/AbscondWidget.entitlements ios/App/App.xcodeproj/project.pbxproj && git commit -m "feat(ios): add xcodeproj script to add AbscondWidget extension target"
```

---

## Task 11: Update CI workflow (.github/workflows/build-ipa.yml)

**Files:**
- Modify: `abscond-mobile/.github/workflows/build-ipa.yml`

CI needs to: install xcodeproj gem, run the setup script (idempotent), then `pod install`.

- [ ] **Step 1: Update build-ipa.yml**

Replace the workflow content:

```yaml
name: Build IPA

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-15
    timeout-minutes: 60

    steps:
      - name: Checkout (with submodules)
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: abs-ui/package-lock.json

      - name: Install Capacitor CLI deps
        run: npm ci

      - name: Build Vue app
        run: cd abs-ui && npm ci && npm run build

      - name: Sync web assets into iOS project
        run: npx cap copy ios

      - name: Install xcodeproj gem and add Widget Extension target
        run: |
          gem install xcodeproj --no-document
          ruby scripts/add_widget_extension.rb

      - name: Install CocoaPods dependencies
        run: cd ios/App && pod install

      - name: Install xcpretty
        run: gem install xcpretty --no-document

      - name: Build archive (unsigned)
        run: |
          set -o pipefail
          VERSION="${GITHUB_REF_NAME#v}"
          BUILD="${VERSION##*.}"
          xcodebuild archive \
            -workspace ios/App/App.xcworkspace \
            -scheme App \
            -configuration Release \
            -destination "generic/platform=iOS" \
            -archivePath "$RUNNER_TEMP/Abscond.xcarchive" \
            CODE_SIGNING_REQUIRED=NO \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_ALLOWED=YES \
            DEVELOPMENT_TEAM="" \
            MARKETING_VERSION="$VERSION" \
            CURRENT_PROJECT_VERSION="$BUILD" \
            | xcpretty

      - name: Package IPA
        run: |
          TAG="${GITHUB_REF_NAME}"
          APP=$(find "$RUNNER_TEMP/Abscond.xcarchive/Products/Applications" -name "*.app" | head -1)
          mkdir -p "$RUNNER_TEMP/Payload"
          cp -r "$APP" "$RUNNER_TEMP/Payload/"
          cd "$RUNNER_TEMP"
          zip -qr "Abscond-${TAG}.ipa" Payload/
          echo "IPA_PATH=$RUNNER_TEMP/Abscond-${TAG}.ipa" >> "$GITHUB_ENV"
          echo "TAG=${TAG}" >> "$GITHUB_ENV"

      - name: Create GitHub Release and attach IPA
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create "$TAG" \
            "$IPA_PATH" \
            --title "Abscond $TAG" \
            --generate-notes \
            --repo "$GITHUB_REPOSITORY"
```

- [ ] **Step 2: Commit**

```bash
cd /config/workspace/gh/abscond-mobile && git add .github/workflows/build-ipa.yml && git commit -m "ci: install xcodeproj gem and run widget extension setup before pod install"
```

---

## Task 12: Sub-module sync + tag release

**Files:** Both repos

This final task ensures `abscond-mobile`'s submodule pointer is updated to the latest `abs-ui` commit before tagging.

- [ ] **Step 1: Verify abs-ui builds**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -5
```

Expected: build succeeds

- [ ] **Step 2: Update submodule ref in abscond-mobile**

```bash
cd /config/workspace/gh/abscond-mobile && git -C abs-ui pull origin main && git add abs-ui && git diff --cached --stat
```

Expected: `abs-ui` submodule ref updated

- [ ] **Step 3: Final commit in abscond-mobile**

```bash
cd /config/workspace/gh/abscond-mobile && git commit -m "chore: update abs-ui submodule to phase 3 (NowPlaying + notifications + Dynamic Island)"
```

- [ ] **Step 4: Push and tag**

```bash
cd /config/workspace/gh/abscond-mobile && git push origin main && git tag v0.1.23 && git push origin v0.1.23
```

Expected: CI triggers, builds IPA, creates GitHub Release `v0.1.23`

---

## Manual Verification Checklist

After installing the v0.1.23 IPA via Feather:

**Now Playing / Lock Screen:**
- [ ] Start playing a book → lock screen shows title, author, cover art
- [ ] Lock screen skip-back 10s button works
- [ ] Lock screen skip-forward 30s button works  
- [ ] Lock screen play/pause button works
- [ ] Control Center shows current book with controls

**Dynamic Island (iOS 16.2+ device only):**
- [ ] Start playing → Dynamic Island shows waveform (compact leading) + countdown timer (compact trailing)
- [ ] Tap expanded area → shows title, author, skip+play+skip buttons
- [ ] Tap play/pause button in expanded Island → pauses without opening app (requires App Group entitlement)
- [ ] Stop player → Live Activity ends

**Background Notifications:**
- [ ] Notification permission prompt appears after first login
- [ ] Adding a book to ABS → notification arrives within the next BGTask window (up to 60 min; use Xcode "Simulate Background Task" to force earlier)

**Credential persistence:**
- [ ] Force-quit app → reopen → lock screen controls still work (credentials stored natively)

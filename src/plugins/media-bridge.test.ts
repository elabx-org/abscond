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

  it('onRemoteCommand returns an unsubscribe function that removes the handler', async () => {
    const { setupMediaBridge, onRemoteCommand } = await import('./media-bridge')
    setupMediaBridge()
    const handler = vi.fn()
    const off = onRemoteCommand(handler)
    off()
    ;(window as any).__mediaBridge._onRemoteCommand({ action: 'remotePlay' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does nothing when webkit bridge is absent (browser)', async () => {
    delete (window as any).webkit
    const { setupMediaBridge, storeCredentials } = await import('./media-bridge')
    setupMediaBridge()
    expect(() => storeCredentials('tok', 'http://host')).not.toThrow()
    expect(postMessage).not.toHaveBeenCalled()
  })
})

import { isNativeApp } from '@/api/client'

type Callbacks = Record<number, { res: (v: string) => void; rej: (e: { message: string }) => void }>

let callId = 0
const cbs: Callbacks = {}

export function setupHapticsBridge(): void {
  if (!isNativeApp()) return
  const w = window as any

  w.__hapticsBridge = {
    openAuth: (url: string, verifier: string, state: string): Promise<string> =>
      new Promise((res, rej) => {
        const id = ++callId
        cbs[id] = { res, rej }
        w.webkit.messageHandlers.hapticsBridge.postMessage(
          JSON.stringify({ action: 'openAuth', id, url, verifier, state }),
        )
      }),
    _resolve: (id: number, val: string) => {
      const cb = cbs[id]
      if (cb) { delete cbs[id]; cb.res(val) }
    },
    _reject: (id: number, msg: string) => {
      const cb = cbs[id]
      if (cb) { delete cbs[id]; cb.rej({ message: msg }) }
    },
  }

  ;(navigator as any).vibrate = (): boolean => {
    w.webkit.messageHandlers.hapticsBridge.postMessage(
      JSON.stringify({ action: 'impact', style: 'light' }),
    )
    return true
  }
}

/**
 * Run the native OIDC flow. Swift handles pre-flight cookie capture, the
 * ASWebAuthenticationSession popup, and the /auth/openid/callback exchange,
 * then resolves with the JSON body returned by ABS (same shape as /login).
 * JS is responsible only for generating the PKCE verifier+state and parsing
 * the resolved JSON.
 */
export function openNativeAuth(url: string, verifier: string, state: string): Promise<string> {
  return (window as any).__hapticsBridge.openAuth(url, verifier, state)
}

export function getDebugLog(): Promise<string> {
  if (!isNativeApp()) return Promise.resolve('')
  const w = window as any
  return new Promise((res, rej) => {
    const id = ++callId
    cbs[id] = { res, rej }
    w.webkit.messageHandlers.hapticsBridge.postMessage(
      JSON.stringify({ action: 'getDebugLog', id }),
    )
  })
}

export function clearDebugLog(): void {
  if (!isNativeApp()) return
  const w = window as any
  w.webkit.messageHandlers.hapticsBridge.postMessage(
    JSON.stringify({ action: 'clearDebugLog' }),
  )
}

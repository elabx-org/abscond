import { isNativeApp } from '@/api/client'

type Callbacks = Record<number, { res: (v: string) => void; rej: (e: { message: string }) => void }>

let callId = 0
const cbs: Callbacks = {}

export function setupHapticsBridge(): void {
  if (!isNativeApp()) return
  const w = window as any

  w.__hapticsBridge = {
    openAuth: (url: string): Promise<string> =>
      new Promise((res, rej) => {
        const id = ++callId
        cbs[id] = { res, rej }
        w.webkit.messageHandlers.hapticsBridge.postMessage(
          JSON.stringify({ action: 'openAuth', id, url }),
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

export function openNativeAuth(url: string): Promise<string> {
  return (window as any).__hapticsBridge.openAuth(url)
}

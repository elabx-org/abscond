// Uses the existing HapticsBridgePlugin WKScriptMessageHandler.
// Falls back silently on web/desktop where the handler is absent.
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        hapticsBridge?: { postMessage: (msg: string) => void }
      }
    }
  }
}

function impact(style: 'light' | 'medium' | 'heavy'): void {
  try {
    window.webkit?.messageHandlers?.hapticsBridge?.postMessage(
      JSON.stringify({ action: 'impact', style })
    )
  } catch { /* non-iOS */ }
}

export const haptics = {
  light:  () => impact('light'),
  medium: () => impact('medium'),
  heavy:  () => impact('heavy'),
}

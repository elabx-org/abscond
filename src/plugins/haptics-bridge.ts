import { registerPlugin } from '@capacitor/core'

export interface HapticsBridgePlugin {
  openAuth(options: { url: string }): Promise<{ callbackUrl: string }>
  impact(options: { style?: 'light' | 'medium' | 'heavy' }): Promise<void>
  notification(options: { type?: 'success' | 'warning' | 'error' }): Promise<void>
}

export const HapticsBridge = registerPlugin<HapticsBridgePlugin>('HapticsBridge')

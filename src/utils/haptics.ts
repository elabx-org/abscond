import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

async function safe<T>(fn: () => Promise<T>): Promise<void> {
  try { await fn() } catch { /* not available on web/desktop */ }
}

export const haptics = {
  light:   () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium:  () => safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy:   () => safe(() => Haptics.impact({ style: ImpactStyle.Heavy })),
  success: () => safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  error:   () => safe(() => Haptics.notification({ type: NotificationType.Error })),
  select:  () => safe(() => Haptics.selectionStart()),
}

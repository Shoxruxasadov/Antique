import * as Haptics from 'expo-haptics';

/**
 * Trigger light impact haptic if vibration is enabled in app settings.
 * Use for capture button, tab presses, etc.
 * @param {boolean} vibrationEnabled - from useAppSettingsStore((s) => s.vibration)
 */
export function triggerHaptic(vibrationEnabled) {
  if (!vibrationEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (_) {}
}

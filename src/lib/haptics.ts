import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticIntent =
  | 'tapSubtle'
  | 'selection'
  | 'confirm'
  | 'insert'
  | 'destructive'
  | 'complete';

async function safelyRun(operation: () => Promise<void>) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await operation();
  } catch {
    // Ignore haptic failures so UI interactions never break.
  }
}

export function tapSubtle() {
  return safelyRun(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

export function selectionChange() {
  return safelyRun(() => Haptics.selectionAsync());
}

export function confirm() {
  return safelyRun(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

export function insert() {
  return safelyRun(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
}

export function destructive() {
  return safelyRun(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}

export function complete() {
  return safelyRun(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}

export function triggerHaptic(intent: HapticIntent) {
  switch (intent) {
    case 'tapSubtle':
      return tapSubtle();
    case 'selection':
      return selectionChange();
    case 'confirm':
      return confirm();
    case 'insert':
      return insert();
    case 'destructive':
      return destructive();
    case 'complete':
      return complete();
    default:
      return Promise.resolve();
  }
}

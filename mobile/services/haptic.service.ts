/**
 * Haptic Feedback Service
 * 
 * Provides tactile feedback for user interactions
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback types
 */
export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

/**
 * Trigger haptic feedback
 */
export async function haptic(type: HapticType = 'light'): Promise<void> {
  // Haptics are only available on iOS and Android
  if (Platform.OS === 'web') {
    return;
  }

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (error) {
    // Silently fail - haptics are non-critical
    console.debug('Haptic feedback failed:', error);
  }
}

/**
 * Convenience functions for common haptic patterns
 */
export const HapticFeedback = {
  /** Light tap - for minor interactions */
  light: () => haptic('light'),
  
  /** Medium tap - for button presses */
  medium: () => haptic('medium'),
  
  /** Heavy tap - for significant actions */
  heavy: () => haptic('heavy'),
  
  /** Success feedback - for completed actions */
  success: () => haptic('success'),
  
  /** Warning feedback - for caution situations */
  warning: () => haptic('warning'),
  
  /** Error feedback - for failed actions */
  error: () => haptic('error'),
  
  /** Selection feedback - for picker/selection changes */
  selection: () => haptic('selection'),

  /** Check-in action */
  checkIn: () => haptic('success'),

  /** Check-out action */
  checkOut: () => haptic('success'),

  /** Save action */
  save: () => haptic('medium'),

  /** Delete action */
  delete: () => haptic('heavy'),

  /** Navigate action */
  navigate: () => haptic('light'),

  /** Pull to refresh */
  refresh: () => haptic('light'),

  /** Toggle switch */
  toggle: () => haptic('selection'),
};

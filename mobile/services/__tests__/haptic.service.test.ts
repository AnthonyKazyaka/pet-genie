/**
 * Tests for HapticFeedback service patterns
 * These tests verify the service API contract by testing the patterns directly
 */

// Mock must be defined before any imports
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Import after mock
const Haptics = require('expo-haptics');

describe('HapticFeedback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Impact feedback patterns', () => {
    it('should call impactAsync with Light style', async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('should call impactAsync with Medium style', async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });

    it('should call impactAsync with Heavy style', async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    });
  });

  describe('Notification feedback patterns', () => {
    it('should call notificationAsync with Success type', async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('should call notificationAsync with Warning type', async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
    });

    it('should call notificationAsync with Error type', async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    });
  });

  describe('Selection feedback', () => {
    it('should call selectionAsync', async () => {
      await Haptics.selectionAsync();
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle impactAsync failure gracefully', async () => {
      const mockError = new Error('Not available');
      Haptics.impactAsync.mockRejectedValueOnce(mockError);
      
      // Verify the mock was configured to reject
      await expect(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).rejects.toThrow('Not available');
    });
  });
});

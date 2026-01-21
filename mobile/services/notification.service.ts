/**
 * Push Notification Service
 * 
 * Handles push notifications for visit reminders using expo-notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CalendarEvent } from '@/models';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PUSH_TOKEN_KEY = 'push_notification_token';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';

export interface ScheduledNotification {
  id: string;
  eventId: string;
  triggerTime: string;
  type: 'reminder' | 'checkin' | 'checkout';
}

/**
 * Notification Service Class
 */
class NotificationServiceClass {
  private pushToken: string | null = null;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  constructor() {
    this.loadScheduledNotifications();
  }

  /**
   * Initialize notification permissions
   */
  async initialize(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications require a physical device');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync();
      this.pushToken = token.data;
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, this.pushToken);

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('visits', {
          name: 'Visit Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Workload Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#FF9800',
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Get the push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Load scheduled notifications from storage
   */
  private async loadScheduledNotifications(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        const notifications: ScheduledNotification[] = JSON.parse(stored);
        this.scheduledNotifications = new Map(
          notifications.map((n) => [n.id, n])
        );
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  /**
   * Save scheduled notifications to storage
   */
  private async saveScheduledNotifications(): Promise<void> {
    try {
      const notifications = Array.from(this.scheduledNotifications.values());
      await SecureStore.setItemAsync(
        SCHEDULED_NOTIFICATIONS_KEY,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  /**
   * Schedule a visit reminder notification
   */
  async scheduleVisitReminder(
    event: CalendarEvent,
    minutesBefore: number = 30
  ): Promise<string | null> {
    try {
      const eventStart = new Date(event.start);
      const triggerTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);

      // Don't schedule if trigger time is in the past
      if (triggerTime <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐾 Upcoming Visit',
          body: `${event.title}${event.clientName ? ` - ${event.clientName}` : ''} starts in ${minutesBefore} minutes`,
          data: {
            eventId: event.id,
            calendarId: event.calendarId,
            type: 'reminder',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: triggerTime,
          channelId: 'visits',
        },
      });

      // Store scheduled notification
      const scheduled: ScheduledNotification = {
        id: notificationId,
        eventId: event.id,
        triggerTime: triggerTime.toISOString(),
        type: 'reminder',
      };
      this.scheduledNotifications.set(notificationId, scheduled);
      await this.saveScheduledNotifications();

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      return null;
    }
  }

  /**
   * Schedule check-in reminder
   */
  async scheduleCheckinReminder(
    event: CalendarEvent,
    minutesAfter: number = 5
  ): Promise<string | null> {
    try {
      const eventStart = new Date(event.start);
      const triggerTime = new Date(eventStart.getTime() + minutesAfter * 60 * 1000);

      // Don't schedule if trigger time is in the past
      if (triggerTime <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Check-in Reminder',
          body: `Don't forget to check in for ${event.title}`,
          data: {
            eventId: event.id,
            calendarId: event.calendarId,
            type: 'checkin',
          },
          sound: true,
        },
        trigger: {
          date: triggerTime,
          channelId: 'visits',
        },
      });

      const scheduled: ScheduledNotification = {
        id: notificationId,
        eventId: event.id,
        triggerTime: triggerTime.toISOString(),
        type: 'checkin',
      };
      this.scheduledNotifications.set(notificationId, scheduled);
      await this.saveScheduledNotifications();

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule check-in reminder:', error);
      return null;
    }
  }

  /**
   * Schedule check-out reminder
   */
  async scheduleCheckoutReminder(
    event: CalendarEvent,
    minutesBefore: number = 5
  ): Promise<string | null> {
    try {
      const eventEnd = new Date(event.end);
      const triggerTime = new Date(eventEnd.getTime() - minutesBefore * 60 * 1000);

      // Don't schedule if trigger time is in the past
      if (triggerTime <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Check-out Reminder',
          body: `Visit for ${event.title} is ending soon`,
          data: {
            eventId: event.id,
            calendarId: event.calendarId,
            type: 'checkout',
          },
          sound: true,
        },
        trigger: {
          date: triggerTime,
          channelId: 'visits',
        },
      });

      const scheduled: ScheduledNotification = {
        id: notificationId,
        eventId: event.id,
        triggerTime: triggerTime.toISOString(),
        type: 'checkout',
      };
      this.scheduledNotifications.set(notificationId, scheduled);
      await this.saveScheduledNotifications();

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule check-out reminder:', error);
      return null;
    }
  }

  /**
   * Schedule all reminders for an event based on settings
   */
  async scheduleEventReminders(
    event: CalendarEvent,
    settings: {
      reminderMinutes?: number;
      enableCheckinReminder?: boolean;
      enableCheckoutReminder?: boolean;
    }
  ): Promise<void> {
    const { reminderMinutes = 30, enableCheckinReminder = true, enableCheckoutReminder = true } = settings;

    // Schedule main reminder
    await this.scheduleVisitReminder(event, reminderMinutes);

    // Schedule check-in reminder
    if (enableCheckinReminder) {
      await this.scheduleCheckinReminder(event, 5);
    }

    // Schedule check-out reminder
    if (enableCheckoutReminder) {
      await this.scheduleCheckoutReminder(event, 5);
    }
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      this.scheduledNotifications.delete(notificationId);
      await this.saveScheduledNotifications();
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications for an event
   */
  async cancelEventNotifications(eventId: string): Promise<void> {
    const toCancel: string[] = [];
    
    this.scheduledNotifications.forEach((notification, id) => {
      if (notification.eventId === eventId) {
        toCancel.push(id);
      }
    });

    await Promise.all(toCancel.map((id) => this.cancelNotification(id)));
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
      await this.saveScheduledNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Send a workload alert notification
   */
  async sendWorkloadAlert(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Failed to send workload alert:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Add listener for notification received while app is foregrounded
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for notification response (user tapped notification)
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();

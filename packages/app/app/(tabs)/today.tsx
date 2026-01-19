import React, { useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { View, Text, EventCard, EmptyState, Button } from '@/components';
import { Colors, WorkloadColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useEventsStore, useAuthStore, useSettingsStore } from '@/stores';
import {
  calculateDailyMetrics,
  getWorkloadLabel,
  formatHours,
  startOfDay,
  endOfDay,
} from '@pet-genie/core';
import { router } from 'expo-router';
import { format } from 'date-fns';

export default function TodayScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  const { events, isLoading, getEventsForDate } = useEventsStore();
  const { isSignedIn } = useAuthStore();
  const { settings } = useSettingsStore();
  
  const today = new Date();
  const todayEvents = useMemo(() => {
    return getEventsForDate(today)
      .filter((e) => e.isWorkEvent)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, today]);
  
  const metrics = useMemo(() => {
    return calculateDailyMetrics(today, events, {
      includeTravelTime: settings.includeTravelTime,
      thresholds: settings.thresholds,
      travelBuffer: settings.defaultTravelBuffer,
    });
  }, [events, settings, today]);

  const onRefresh = async () => {
    // TODO: Implement refresh from Google Calendar
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="log-in-outline"
          title="Connect Your Calendar"
          message="Sign in with Google to see today's schedule."
          actionLabel="Go to Settings"
          onAction={() => router.push('/settings')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      {/* Header with date and summary */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{format(today, 'EEEE, MMMM d')}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {formatHours(metrics.totalTime / 60)} scheduled
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.levelDot,
                { backgroundColor: WorkloadColors[metrics.level] },
              ]}
            />
            <Text style={[styles.summaryText, { color: WorkloadColors[metrics.level] }]}>
              {getWorkloadLabel(metrics.level)}
            </Text>
          </View>
        </View>
      </View>

      {/* Events list */}
      {todayEvents.length === 0 ? (
        <EmptyState
          icon="sunny-outline"
          title="No Visits Today"
          message="You have no pet sitting appointments scheduled for today. Enjoy your day off!"
        />
      ) : (
        <View style={styles.eventsList}>
          {todayEvents.map((event, index) => (
            <View key={event.id}>
              {/* Time indicator */}
              <View style={styles.timeIndicator}>
                <Text style={[styles.timeText, { color: colors.tint }]}>
                  {format(event.start, 'h:mm a')}
                </Text>
                <View style={[styles.timeLine, { backgroundColor: colors.border }]} />
              </View>
              <EventCard event={event} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventsList: {
    gap: 4,
  },
  timeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeLine: {
    flex: 1,
    height: 1,
  },
});

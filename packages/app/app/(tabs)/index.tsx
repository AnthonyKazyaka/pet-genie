import React, { useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { View, Text, Card, StatCard, EventCard, EmptyState, Button } from '@/components';
import { Colors, WorkloadColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useEventsStore, useAuthStore, useSettingsStore } from '@/stores';
import {
  getWorkloadSummary,
  getWorkloadLabel,
  formatHours,
  formatDateRelative,
  startOfDay,
  addDays,
} from '@pet-genie/core';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  const { events, isLoading, getWorkEvents } = useEventsStore();
  const { isSignedIn } = useAuthStore();
  const { settings } = useSettingsStore();
  
  const workEvents = getWorkEvents();
  
  // Calculate stats
  const todayStats = useMemo(() => {
    const summary = getWorkloadSummary('daily', workEvents, {
      referenceDate: new Date(),
      includeTravelTime: settings.includeTravelTime,
      thresholds: settings.thresholds,
      travelBuffer: settings.defaultTravelBuffer,
    });
    return summary;
  }, [workEvents, settings]);
  
  const weekStats = useMemo(() => {
    const summary = getWorkloadSummary('weekly', workEvents, {
      referenceDate: new Date(),
      includeTravelTime: settings.includeTravelTime,
      thresholds: settings.thresholds,
      travelBuffer: settings.defaultTravelBuffer,
    });
    return summary;
  }, [workEvents, settings]);
  
  // Get upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    
    return workEvents
      .filter((e) => e.start >= now && e.start <= weekFromNow)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10);
  }, [workEvents]);
  
  // Group upcoming events by day
  const groupedEvents = useMemo(() => {
    const groups: { label: string; events: typeof upcomingEvents }[] = [];
    
    upcomingEvents.forEach((event) => {
      const label = formatDateRelative(event.start);
      const existingGroup = groups.find((g) => g.label === label);
      
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ label, events: [event] });
      }
    });
    
    return groups;
  }, [upcomingEvents]);

  const onRefresh = async () => {
    // TODO: Implement refresh from Google Calendar
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="log-in-outline"
          title="Welcome to Pet Genie"
          message="Connect your Google Calendar to get started with managing your pet sitting appointments."
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
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          title="Today"
          value={formatHours(todayStats.totalWorkHours + todayStats.totalTravelHours)}
          subtitle={`${todayStats.eventCount} visits`}
          workloadLevel={todayStats.level}
          icon={<Ionicons name="today" size={18} color={WorkloadColors[todayStats.level]} />}
          style={styles.statCard}
        />
        <StatCard
          title="This Week"
          value={formatHours(weekStats.totalWorkHours + weekStats.totalTravelHours)}
          subtitle={getWorkloadLabel(weekStats.level)}
          workloadLevel={weekStats.level}
          icon={<Ionicons name="calendar" size={18} color={WorkloadColors[weekStats.level]} />}
          style={styles.statCard}
        />
      </View>

      {/* Quick Actions */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Button
            title="Today's Schedule"
            variant="outline"
            size="small"
            onPress={() => router.push('/today')}
            icon={<Ionicons name="list" size={16} color={colors.tint} />}
            style={styles.actionButton}
          />
          <Button
            title="Add Client"
            variant="outline"
            size="small"
            onPress={() => router.push('/clients')}
            icon={<Ionicons name="person-add" size={16} color={colors.tint} />}
            style={styles.actionButton}
          />
        </View>
      </Card>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Visits</Text>
        
        {groupedEvents.length === 0 ? (
          <Card>
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No upcoming visits scheduled
              </Text>
            </View>
          </Card>
        ) : (
          groupedEvents.map((group) => (
            <View key={group.label} style={styles.eventGroup}>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                {group.label}
              </Text>
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          ))
        )}
      </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  eventGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});

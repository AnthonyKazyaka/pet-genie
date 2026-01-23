import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { LoadingState } from '@/components/EmptyState';
import { DashboardCard } from '@/components/DashboardCard';
import { SetupProgress } from '@/components/SetupProgress';
import { BurnoutWarning } from '@/components/BurnoutWarning';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { useVisitRecords, useAnalytics, useSettings, useAuth, useCalendarEvents, useTemplates, useRulesEngine } from '@/hooks';
import { HapticFeedback } from '@/services';
import {
  CalendarEvent,
  WorkloadLevel,
  WORKLOAD_COLORS,
  WORKLOAD_COLORS_DARK,
  getWorkloadLevel,
  calculateDayWorkHours,
  filterWorkEvents,
} from '@/models';

/**
 * Get greeting based on time of day
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format date for section headers
 */
function formatSectionDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calendar Connect Prompt
 */
function CalendarConnectPrompt({
  onConnect,
  isLoading,
  isDark,
}: {
  onConnect: () => void;
  isLoading: boolean;
  isDark: boolean;
}) {
  return (
    <View style={[styles.connectPrompt, isDark && styles.connectPromptDark]}>
      <View style={[styles.connectIconContainer, isDark && styles.connectIconContainerDark]}>
        <FontAwesome name="calendar" size={48} color={isDark ? '#60A5FA' : '#2563EB'} />
      </View>
      <Text style={[styles.connectTitle, isDark && styles.connectTitleDark]}>
        Connect Your Calendar
      </Text>
      <Text style={[styles.connectDescription, isDark && styles.connectDescriptionDark]}>
        Link your Google Calendar to see your pet-sitting visits and track your schedule.
      </Text>
      <TouchableOpacity
        style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
        onPress={() => {
          HapticFeedback.selection();
          onConnect();
        }}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <FontAwesome name="google" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Dashboard Screen - Main hub with quick stats, setup progress, and upcoming events
 */
export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;

  const { isSignedIn, isLoading: authLoading, signIn, userEmail } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  
  // Create date range for this week
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);
  
  // Fetch events for this week
  const { events, loading: eventsLoading, refresh } = useCalendarEvents({ start: weekStart, end: weekEnd });
  
  const { templates, loading: templatesLoading } = useTemplates();
  const { visitRecords } = useVisitRecords();
  const { computeAnalytics, checkWorkloadWarnings } = useAnalytics();
  const { evaluateRules, burnoutRisk, violations } = useRulesEngine(settings);

  const [refreshing, setRefreshing] = useState(false);

  // Filter work events
  const workEvents = useMemo(() => {
    if (!events?.length) return [];
    return filterWorkEvents(events);
  }, [events]);

  // Today's events
  const todayEvents = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    return workEvents.filter(e => e.start.split('T')[0] === todayStr);
  }, [workEvents, today]);

  // This week's hours
  const weeklyHours = useMemo(() => {
    return workEvents
      .filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= weekStart && eventDate <= weekEnd;
      })
      .reduce((sum, e) => {
        const start = new Date(e.start).getTime();
        const end = new Date(e.end).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0);
  }, [workEvents, weekStart, weekEnd]);

  // Today's hours
  const todayHours = useMemo(() => {
    return calculateDayWorkHours(workEvents, today);
  }, [workEvents, today]);

  // Workload level
  const workloadLevel = useMemo(() => {
    return getWorkloadLevel(todayHours, 'daily', {
      daily: {
        comfortable: settings.maxHoursPerDay * 0.5,
        busy: settings.maxHoursPerDay * 0.75,
        high: settings.maxHoursPerDay * 0.9,
      },
      weekly: {
        comfortable: settings.maxHoursPerWeek * 0.5,
        busy: settings.maxHoursPerWeek * 0.75,
        high: settings.maxHoursPerWeek * 0.9,
      },
    });
  }, [todayHours, settings]);

  // Upcoming events (next 7 days, grouped by day)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return workEvents
      .filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= now && eventDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [workEvents]);

  // Setup progress
  const setupProgress = useMemo(() => {
    const steps = [
      { id: 'calendar', label: 'Connect Calendar', completed: isSignedIn && settings.selectedCalendars.length > 0 },
      { id: 'thresholds', label: 'Set Workload Limits', completed: settings.maxHoursPerDay !== 10 || settings.maxHoursPerWeek !== 45 },
      { id: 'templates', label: 'Create Templates', completed: templates.length > 0 },
    ];
    return steps;
  }, [isSignedIn, settings, templates]);

  const setupComplete = setupProgress.every(s => s.completed);

  // Evaluate rules when events change
  useEffect(() => {
    if (workEvents.length > 0) {
      evaluateRules(workEvents, { start: weekStart, end: weekEnd });
    }
  }, [workEvents, weekStart, weekEnd, evaluateRules]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    HapticFeedback.selection();
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Navigation handlers
  const handleNavigateToVisits = useCallback(() => {
    HapticFeedback.selection();
    router.push('/(tabs)');
  }, [router]);

  const handleNavigateToSettings = useCallback(() => {
    HapticFeedback.selection();
    router.push('/(tabs)/settings');
  }, [router]);

  const handleNavigateToTemplates = useCallback(() => {
    HapticFeedback.selection();
    router.push('/templates');
  }, [router]);

  const handleNavigateToCalendar = useCallback(() => {
    HapticFeedback.selection();
    router.push('/(tabs)/calendar');
  }, [router]);

  const handleNavigateToAnalytics = useCallback(() => {
    HapticFeedback.selection();
    router.push('/(tabs)/analytics');
  }, [router]);

  const handleEventPress = useCallback((event: CalendarEvent) => {
    HapticFeedback.selection();
    router.push({
      pathname: '/visit/[id]',
      params: { id: event.id, calendarId: event.calendarId },
    });
  }, [router]);

  // Loading state
  const isLoading = authLoading || (isSignedIn && eventsLoading) || settingsLoading;

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading dashboard..." type="skeleton-today" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, isDark && styles.greetingDark]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.dateText, isDark && styles.dateTextDark]}>
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Calendar Connect Prompt (if not authenticated) */}
        {!isSignedIn && (
          <CalendarConnectPrompt
            onConnect={signIn}
            isLoading={authLoading}
            isDark={isDark}
          />
        )}

        {/* Setup Progress (if not complete) */}
        {isSignedIn && !setupComplete && (
          <SetupProgress
            steps={setupProgress}
            onStepPress={(stepId) => {
              HapticFeedback.selection();
              if (stepId === 'calendar') handleNavigateToSettings();
              else if (stepId === 'thresholds') handleNavigateToSettings();
              else if (stepId === 'templates') handleNavigateToTemplates();
            }}
            isDark={isDark}
          />
        )}

        {/* Burnout Warning */}
        {isSignedIn && burnoutRisk.level !== 'low' && (
          <BurnoutWarning
            risk={burnoutRisk}
            violations={violations}
            onPress={handleNavigateToAnalytics}
            isDark={isDark}
          />
        )}

        {/* Quick Stats */}
        {isSignedIn && (
          <View style={styles.statsRow}>
            <DashboardCard
              icon="calendar-check-o"
              label="Today"
              value={todayEvents.length.toString()}
              subtitle={`${todayHours.toFixed(1)}h scheduled`}
              color={colors[workloadLevel].solid}
              onPress={handleNavigateToVisits}
              isDark={isDark}
            />
            <DashboardCard
              icon="clock-o"
              label="This Week"
              value={`${weeklyHours.toFixed(1)}h`}
              subtitle={`of ${settings.maxHoursPerWeek}h limit`}
              color={weeklyHours > settings.maxHoursPerWeek * 0.8 ? colors.high.solid : colors.comfortable.solid}
              onPress={handleNavigateToAnalytics}
              isDark={isDark}
            />
          </View>
        )}

        {/* Quick Actions */}
        {isSignedIn && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, isDark && styles.quickActionDark]}
              onPress={handleNavigateToVisits}
              activeOpacity={0.7}
            >
              <FontAwesome name="list" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>
                Today's Visits
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, isDark && styles.quickActionDark]}
              onPress={handleNavigateToCalendar}
              activeOpacity={0.7}
            >
              <FontAwesome name="calendar" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>
                Calendar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, isDark && styles.quickActionDark]}
              onPress={handleNavigateToTemplates}
              activeOpacity={0.7}
            >
              <FontAwesome name="file-text-o" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>
                Templates
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Events */}
        {isSignedIn && upcomingEvents.length > 0 && (
          <UpcomingEvents
            events={upcomingEvents}
            onEventPress={handleEventPress}
            onViewAll={handleNavigateToCalendar}
            isDark={isDark}
          />
        )}

        {/* Empty state when no upcoming events */}
        {isSignedIn && upcomingEvents.length === 0 && (
          <View style={[styles.emptyUpcoming, isDark && styles.emptyUpcomingDark]}>
            <FontAwesome
              name="calendar-o"
              size={40}
              color={isDark ? '#4B5563' : '#D1D5DB'}
            />
            <Text style={[styles.emptyUpcomingTitle, isDark && styles.emptyUpcomingTitleDark]}>
              No upcoming visits
            </Text>
            <Text style={[styles.emptyUpcomingText, isDark && styles.emptyUpcomingTextDark]}>
              Your schedule is clear for the next 7 days
            </Text>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  greetingDark: {
    color: '#F3F4F6',
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  dateTextDark: {
    color: '#9CA3AF',
  },
  connectPrompt: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  connectPromptDark: {
    backgroundColor: '#1F2937',
  },
  connectIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectIconContainerDark: {
    backgroundColor: '#1E3A5F',
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  connectTitleDark: {
    color: '#F3F4F6',
  },
  connectDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  connectDescriptionDark: {
    color: '#9CA3AF',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  quickActionDark: {
    backgroundColor: '#1E3A5F',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  quickActionTextDark: {
    color: '#60A5FA',
  },
  emptyUpcoming: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  emptyUpcomingDark: {
    backgroundColor: '#1F2937',
  },
  emptyUpcomingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyUpcomingTitleDark: {
    color: '#E5E7EB',
  },
  emptyUpcomingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyUpcomingTextDark: {
    color: '#9CA3AF',
  },
});

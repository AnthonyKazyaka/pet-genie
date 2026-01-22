import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { SwipeableVisitCard } from '@/components/SwipeableVisitCard';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useAnalytics, useSettings, useAuth, useCalendarEvents } from '@/hooks';
import { HapticFeedback } from '@/services';
import {
  CalendarEvent,
  VisitEvent,
  VisitStatus,
  WorkloadWarning,
  WorkloadLevel,
  WORKLOAD_COLORS,
  WORKLOAD_COLORS_DARK,
  getWorkloadLevel,
  calculateDayWorkHours,
  DEFAULT_THRESHOLDS,
} from '@/models';

/**
 * Format time from ISO string
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format the date header
 */
function formatDateHeader(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today's Visits";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow's Visits";
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Prompt to connect Google Calendar when not authenticated
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
        Link your Google Calendar to see your pet-sitting visits, track check-ins, and manage your schedule.
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
 * Warning Banner Component
 */
function WarningBanner({ warnings, onPress }: { warnings: WorkloadWarning[]; onPress: () => void }) {
  if (warnings.length === 0) return null;
  
  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const isCritical = criticalWarnings.length > 0;
  
  return (
    <TouchableOpacity
      style={[styles.warningBanner, isCritical && styles.warningBannerHigh]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <FontAwesome name="exclamation-triangle" size={16} color={isCritical ? '#C62828' : '#E65100'} />
      <View style={styles.warningContent}>
        <Text style={[styles.warningTitle, isCritical && styles.warningTitleHigh]}>
          {isCritical ? 'Workload Alert' : 'Workload Notice'}
        </Text>
        <Text style={styles.warningText} numberOfLines={1}>
          {warnings[0].message}
          {warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ''}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#999" />
    </TouchableOpacity>
  );
}

/**
 * Today's Workload Summary Component
 */
function TodayWorkloadSummary({
  events,
  isDark,
}: {
  events: CalendarEvent[];
  isDark: boolean;
}) {
  const today = new Date();
  const hours = calculateDayWorkHours(events, today);
  const level = getWorkloadLevel(hours, 'daily', DEFAULT_THRESHOLDS);
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
  const workloadColor = colors[level];

  // Calculate week totals for context
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const remainingThisWeek = Math.max(0, DEFAULT_THRESHOLDS.weekly.comfortable - hours);
  
  return (
    <View
      style={[
        styles.workloadSummary,
        { backgroundColor: workloadColor.background },
        isDark && styles.workloadSummaryDark,
      ]}
    >
      <View style={styles.workloadSummaryRow}>
        <View style={[styles.workloadIndicatorDot, { backgroundColor: workloadColor.solid }]} />
        <View style={styles.workloadSummaryInfo}>
          <Text style={[styles.workloadSummaryTitle, isDark && styles.workloadSummaryTitleDark]}>
            Today's Workload
          </Text>
          <Text style={[styles.workloadSummarySubtitle, { color: workloadColor.text }]}>
            {hours.toFixed(1)}h scheduled • {workloadColor.label}
          </Text>
        </View>
        <View style={[styles.workloadPill, { backgroundColor: workloadColor.solid }]}>
          <Text style={styles.workloadPillText}>
            {events.length} {events.length === 1 ? 'visit' : 'visits'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { visitRecords, getByEventKey, getOrCreate, checkIn, checkOut, update } = useVisitRecords();
  const { checkWorkloadWarnings } = useAnalytics();
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  
  // Auth state for Google Calendar
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();
  
  // Get today's date range for calendar events
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, []);
  
  // Fetch calendar events for today
  const { events: calendarEvents, loading: eventsLoading, refresh: refreshEvents } = useCalendarEvents(dateRange);
  
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [warnings, setWarnings] = useState<WorkloadWarning[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Merge calendar events with visit records
  useEffect(() => {
    if ((!isSignedIn && !isDemoMode) || !calendarEvents) {
      setVisits([]);
      return;
    }
    
    const mergedVisits: VisitEvent[] = calendarEvents.map(event => {
      const record = getByEventKey(event.id, event.calendarId);
      return {
        ...event,
        visitRecord: record
          ? {
              id: record.id,
              status: record.status,
              notes: record.notes,
              checkInAt: record.checkInAt,
              checkOutAt: record.checkOutAt,
            }
          : undefined,
      };
    });

    // Sort by start time
    mergedVisits.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    setVisits(mergedVisits);
  }, [isSignedIn, isDemoMode, calendarEvents, getByEventKey, visitRecords]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  /**
   * Navigate to visit detail
   */
  const handleVisitPress = async (visit: VisitEvent) => {
    HapticFeedback.selection();
    // Ensure visit record exists
    const record = await getOrCreate({
      eventId: visit.id,
      calendarId: visit.calendarId,
    });

    router.push(
      `/visit/${record.id}?eventId=${visit.id}&calendarId=${visit.calendarId}` as any
    );
  };

  /**
   * Handle check-in action
   */
  const handleCheckIn = async (visit: VisitEvent) => {
    try {
      // Ensure visit record exists first
      const record = await getOrCreate({
        eventId: visit.id,
        calendarId: visit.calendarId,
      });
      
      // Check in using the record ID
      await checkIn(record.id);
      
      // Refresh the visits
      await refreshEvents();
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
    }
  };

  /**
   * Handle check-out action
   */
  const handleCheckOut = async (visit: VisitEvent) => {
    try {
      const record = await getOrCreate({
        eventId: visit.id,
        calendarId: visit.calendarId,
      });
      
      // Check out using the record ID
      await checkOut(record.id);
      
      // Refresh the visits
      await refreshEvents();
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out. Please try again.');
    }
  };

  /**
   * Handle cancel visit action
   */
  const handleCancelVisit = (visit: VisitEvent) => {
    Alert.alert(
      'Cancel Visit',
      `Are you sure you want to cancel this visit for ${visit.clientName || visit.title}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const record = await getOrCreate({
                eventId: visit.id,
                calendarId: visit.calendarId,
              });
              await update({
                id: record.id,
                status: 'cancelled',
              });
              await refreshEvents();
            } catch (error) {
              console.error('Error cancelling visit:', error);
              Alert.alert('Error', 'Failed to cancel visit. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Get status for display
   */
  const getVisitStatus = (visit: VisitEvent): VisitStatus => {
    return visit.visitRecord?.status || 'scheduled';
  };

  // Check workload warnings when visits or settings change
  useEffect(() => {
    if ((!isSignedIn && !isDemoMode) || !calendarEvents) {
      setWarnings([]);
      return;
    }
    const workloadWarnings = checkWorkloadWarnings(
      visitRecords,
      calendarEvents,
      settings
    );
    setWarnings(workloadWarnings);
  }, [isSignedIn, isDemoMode, calendarEvents, visitRecords, settings, checkWorkloadWarnings]);

  // Stats calculation
  const completedCount = visits.filter(
    v => v.visitRecord?.status === 'completed'
  ).length;
  const inProgressCount = visits.filter(
    v => v.visitRecord?.status === 'in-progress'
  ).length;
  const scheduledCount = visits.filter(
    v => !v.visitRecord || v.visitRecord.status === 'scheduled'
  ).length;

  // Navigate to analytics when warning is tapped
  const handleWarningPress = () => {
    HapticFeedback.selection();
    router.push('/(tabs)/analytics' as any);
  };

  // Show loading state
  const loading = authLoading || eventsLoading;
  
  if (loading && !refreshing) {
    return <LoadingState type="skeleton-today" />;
  }
  
  // Show connect prompt if not signed in and not in demo mode
  if (!isSignedIn && !isDemoMode) {
    return (
      <ThemedView style={styles.container}>
        <CalendarConnectPrompt
          onConnect={signIn}
          isLoading={authLoading}
          isDark={isDark}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header Stats */}
      {/* Workload Warning Banner */}
      <WarningBanner warnings={warnings} onPress={handleWarningPress} />
      
      {/* Today's Workload Summary */}
      <TodayWorkloadSummary events={visits} isDark={isDark} />

      <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{scheduledCount}</Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Upcoming</Text>
        </View>
        <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#E65100' }]}>
            {inProgressCount}
          </Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>In Progress</Text>
        </View>
        <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#2E7D32' }]}>
            {completedCount}
          </Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Completed</Text>
        </View>
      </View>

      {/* Date Header */}
      <View style={styles.dateHeader}>
        <Text style={[styles.dateText, isDark && styles.dateTextDark]}>
          {formatDateHeader(dateRange.start)}
        </Text>
      </View>

      {/* Visits List */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {visits.length === 0 ? (
            <EmptyState
              title="No visits today"
              message="Your schedule is clear for today. Enjoy your day off!"
              icon={<FontAwesome name="calendar-o" size={48} color="#ccc" />}
            />
          ) : (
            visits.map(visit => (
              <SwipeableVisitCard
                key={visit.id}
                time={formatTime(visit.start)}
                clientName={visit.clientName || visit.title}
                serviceType={visit.serviceInfo?.type}
                status={getVisitStatus(visit)}
                location={visit.location}
                onPress={() => handleVisitPress(visit)}
                onCheckIn={() => handleCheckIn(visit)}
                onCheckOut={() => handleCheckOut(visit)}
                onEdit={() => handleVisitPress(visit)}
                onCancel={() => handleCancelVisit(visit)}
              />
            ))
          )}
        </ScrollView>
      </GestureHandlerRootView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workloadSummary: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  workloadSummaryDark: {
    backgroundColor: '#1e1e1e',
  },
  workloadSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workloadIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  workloadSummaryInfo: {
    flex: 1,
  },
  workloadSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  workloadSummaryTitleDark: {
    color: '#e0e0e0',
  },
  workloadSummarySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  workloadPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  workloadPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statsContainerDark: {
    backgroundColor: '#1e1e1e',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statLabelDark: {
    color: '#999',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  statDividerDark: {
    backgroundColor: '#333',
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dateTextDark: {
    color: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
    gap: 10,
  },
  warningBannerHigh: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#C62828',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  warningTitleHigh: {
    color: '#C62828',
  },
  warningText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Calendar Connect Prompt styles
  connectPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f5',
  },
  connectPromptDark: {
    backgroundColor: '#121212',
  },
  connectIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  connectIconContainerDark: {
    backgroundColor: '#1e3a5f',
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  connectTitleDark: {
    color: '#fff',
  },
  connectDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  connectDescriptionDark: {
    color: '#aaa',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

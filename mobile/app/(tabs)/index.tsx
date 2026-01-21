import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { VisitCard } from '@/components/VisitCard';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useAnalytics, useSettings } from '@/hooks';
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
 * Generate mock visits for demonstration
 * In production, this would fetch from Google Calendar API
 */
function generateMockVisits(): CalendarEvent[] {
  const today = new Date();
  const baseDate = today.toISOString().split('T')[0];

  return [
    {
      id: 'mock_1',
      calendarId: 'work',
      title: 'Morning Drop-in - Max & Bella',
      clientName: 'Johnson Family',
      location: '123 Oak Street',
      start: `${baseDate}T08:00:00`,
      end: `${baseDate}T08:30:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: {
        type: 'drop-in',
        duration: 30,
        petName: 'Max & Bella',
      },
    },
    {
      id: 'mock_2',
      calendarId: 'work',
      title: 'Walk - Luna',
      clientName: 'Smith Residence',
      location: '456 Maple Ave',
      start: `${baseDate}T10:00:00`,
      end: `${baseDate}T11:00:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: {
        type: 'walk',
        duration: 60,
        petName: 'Luna',
      },
    },
    {
      id: 'mock_3',
      calendarId: 'work',
      title: 'Afternoon Drop-in - Whiskers',
      clientName: 'Garcia Home',
      location: '789 Pine Lane',
      start: `${baseDate}T14:00:00`,
      end: `${baseDate}T14:30:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: {
        type: 'drop-in',
        duration: 30,
        petName: 'Whiskers',
      },
    },
    {
      id: 'mock_4',
      calendarId: 'work',
      title: 'Evening Visit - Charlie',
      clientName: 'Williams Family',
      location: '321 Elm Court',
      start: `${baseDate}T18:00:00`,
      end: `${baseDate}T19:00:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: {
        type: 'drop-in',
        duration: 60,
        petName: 'Charlie',
      },
    },
  ];
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
  const { visitRecords, getByEventKey, getOrCreate } = useVisitRecords();
  const { checkWorkloadWarnings } = useAnalytics();
  const { settings } = useSettings();
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [warnings, setWarnings] = useState<WorkloadWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate] = useState(new Date());

  /**
   * Load visits and merge with visit records
   */
  const loadVisits = useCallback(async () => {
    try {
      // In production, this would fetch from Google Calendar
      const events = generateMockVisits();

      // Merge events with visit records
      const mergedVisits: VisitEvent[] = events.map(event => {
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
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getByEventKey]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisits();
  }, [loadVisits]);

  /**
   * Navigate to visit detail
   */
  const handleVisitPress = async (visit: VisitEvent) => {
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
   * Get status for display
   */
  const getVisitStatus = (visit: VisitEvent): VisitStatus => {
    return visit.visitRecord?.status || 'scheduled';
  };

  // Load visits on mount
  useEffect(() => {
    loadVisits();
  }, [loadVisits, visitRecords]);

  // Check workload warnings when visits or settings change
  useEffect(() => {
    const events = generateMockVisits();
    const workloadWarnings = checkWorkloadWarnings(
      visitRecords,
      events,
      settings
    );
    setWarnings(workloadWarnings);
  }, [visitRecords, settings, checkWorkloadWarnings]);

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
    router.push('/(tabs)/analytics' as any);
  };

  if (loading) {
    return <LoadingState type="skeleton-today" />;
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
          {formatDateHeader(currentDate)}
        </Text>
      </View>

      {/* Visits List */}
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
            <VisitCard
              key={visit.id}
              time={formatTime(visit.start)}
              clientName={visit.clientName || visit.title}
              serviceType={visit.serviceInfo?.type}
              status={getVisitStatus(visit)}
              location={visit.location}
              onPress={() => handleVisitPress(visit)}
            />
          ))
        )}
      </ScrollView>
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
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useAnalytics, useSettings } from '@/hooks';
import { CalendarEvent, AnalyticsSummary, WorkloadWarning } from '@/models';

const { width } = Dimensions.get('window');

/**
 * Generate mock events for demo (same as Today screen)
 */
function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();

  // Generate events for the past 7 days and next 7 days
  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    // Skip some days randomly for variety
    if (dayOffset !== 0 && Math.random() > 0.7) continue;

    // Add 2-4 events per day
    const eventCount = Math.floor(Math.random() * 3) + 2;
    const services: Array<{ type: string; duration: number }> = [
      { type: 'drop-in', duration: 30 },
      { type: 'walk', duration: 60 },
      { type: 'drop-in', duration: 30 },
      { type: 'overnight', duration: 720 },
    ];
    const clients = ['Johnson Family', 'Smith Residence', 'Garcia Home', 'Williams Family', 'Brown House'];
    const pets = ['Max & Bella', 'Luna', 'Whiskers', 'Charlie', 'Buddy'];

    const hours = [8, 10, 14, 16, 18];

    for (let i = 0; i < eventCount && i < hours.length; i++) {
      const service = services[i % services.length];
      const client = clients[i % clients.length];
      const pet = pets[i % pets.length];

      events.push({
        id: `event_${dateStr}_${i}`,
        calendarId: 'work',
        title: `${service.type === 'walk' ? 'Walk' : 'Drop-in'} - ${pet}`,
        clientName: client,
        location: `${100 + i} Main Street`,
        start: `${dateStr}T${String(hours[i]).padStart(2, '0')}:00:00`,
        end: `${dateStr}T${String(hours[i] + Math.floor(service.duration / 60)).padStart(2, '0')}:${String(service.duration % 60).padStart(2, '0')}:00`,
        allDay: false,
        status: 'confirmed',
        isWorkEvent: true,
        serviceInfo: {
          type: service.type as any,
          duration: service.duration,
          petName: pet,
        },
      });
    }
  }

  return events;
}

/**
 * Format hours for display
 */
function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Warning Banner Component
 */
function WarningBanner({ warnings }: { warnings: WorkloadWarning[] }) {
  if (warnings.length === 0) return null;

  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const otherWarnings = warnings.filter(w => w.severity !== 'critical');

  return (
    <View style={styles.warningContainer}>
      {criticalWarnings.map((warning, index) => (
        <View key={`critical-${index}`} style={[styles.warningBanner, styles.criticalBanner]}>
          <FontAwesome name="exclamation-triangle" size={16} color="#fff" />
          <Text style={styles.warningText}>{warning.message}</Text>
        </View>
      ))}
      {otherWarnings.map((warning, index) => (
        <View key={`warning-${index}`} style={[styles.warningBanner, styles.warningBannerYellow]}>
          <FontAwesome name="exclamation-circle" size={16} color="#856404" />
          <Text style={styles.warningTextDark}>{warning.message}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  icon,
  label,
  value,
  subValue,
  color = '#2196F3',
}: {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <FontAwesome name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  );
}

/**
 * Progress Bar Component
 */
function ProgressBar({
  label,
  current,
  max,
  color = '#2196F3',
}: {
  label: string;
  current: number;
  max: number;
  color?: string;
}) {
  const percentage = Math.min((current / max) * 100, 100);
  const isOverLimit = current > max;

  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, isOverLimit && styles.overLimitText]}>
          {typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current} / {max}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: isOverLimit ? '#F44336' : color },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Breakdown List Component
 */
function BreakdownList({
  title,
  items,
  icon,
}: {
  title: string;
  items: Array<{ label: string; value: number; percentage: number }>;
  icon: string;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <FontAwesome name={icon as any} size={18} color="#2196F3" />
        <Text style={styles.breakdownTitle}>{title}</Text>
      </View>
      {items.slice(0, 5).map((item, index) => (
        <View key={index} style={styles.breakdownItem}>
          <View style={styles.breakdownLabelContainer}>
            <Text style={styles.breakdownLabel}>{item.label}</Text>
            <Text style={styles.breakdownValue}>{item.value} visits</Text>
          </View>
          <View style={styles.breakdownBarContainer}>
            <View
              style={[styles.breakdownBar, { width: `${item.percentage}%` }]}
            />
          </View>
          <Text style={styles.breakdownPercentage}>{item.percentage}%</Text>
        </View>
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { visitRecords } = useVisitRecords();
  const { settings } = useSettings();
  const { computeAnalytics, checkWorkloadWarnings } = useAnalytics();

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [warnings, setWarnings] = useState<WorkloadWarning[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load analytics data
   */
  const loadAnalytics = useCallback(async () => {
    try {
      // Generate mock events (in production, fetch from calendar)
      const mockEvents = generateMockEvents();
      setEvents(mockEvents);

      // Compute analytics for last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const summary = computeAnalytics(startDate, endDate, visitRecords, mockEvents);
      setAnalytics(summary);

      // Check for workload warnings
      const workloadWarnings = checkWorkloadWarnings(visitRecords, mockEvents, settings);
      setWarnings(workloadWarnings);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [visitRecords, settings, computeAnalytics, checkWorkloadWarnings]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <LoadingState message="Loading analytics..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Warning Banners */}
        <WarningBanner warnings={warnings} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Last 7 days</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-check-o"
            label="Total Visits"
            value={analytics?.totalVisits || 0}
            color="#4CAF50"
          />
          <StatCard
            icon="clock-o"
            label="Hours Worked"
            value={formatHours(analytics?.totalScheduledHours || 0)}
            color="#2196F3"
          />
          <StatCard
            icon="line-chart"
            label="Avg/Day"
            value={analytics?.averageVisitsPerDay || 0}
            subValue="visits"
            color="#9C27B0"
          />
        </View>

        {/* This Week Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="calendar" size={18} color="#2196F3" />
            <Text style={styles.cardTitle}>This Week's Progress</Text>
          </View>

          <ProgressBar
            label="Daily Visits"
            current={analytics?.currentWeekVisits || 0}
            max={settings.maxVisitsPerDay * 7}
            color="#4CAF50"
          />

          <ProgressBar
            label="Weekly Hours"
            current={analytics?.currentWeekHours || 0}
            max={settings.maxHoursPerWeek}
            color="#2196F3"
          />
        </View>

        {/* Visit Status Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="pie-chart" size={18} color="#2196F3" />
            <Text style={styles.cardTitle}>Visit Status</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusCount}>{analytics?.completedVisits || 0}</Text>
              <Text style={styles.statusLabel}>Completed</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statusCount}>{analytics?.inProgressVisits || 0}</Text>
              <Text style={styles.statusLabel}>In Progress</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statusCount}>{analytics?.scheduledVisits || 0}</Text>
              <Text style={styles.statusLabel}>Scheduled</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={styles.statusCount}>{analytics?.cancelledVisits || 0}</Text>
              <Text style={styles.statusLabel}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Service Breakdown */}
        {analytics?.serviceBreakdown && analytics.serviceBreakdown.length > 0 && (
          <BreakdownList
            title="By Service Type"
            icon="tags"
            items={analytics.serviceBreakdown.map(s => ({
              label: s.serviceType.charAt(0).toUpperCase() + s.serviceType.slice(1),
              value: s.count,
              percentage: s.percentage,
            }))}
          />
        )}

        {/* Client Breakdown */}
        {analytics?.clientBreakdown && analytics.clientBreakdown.length > 0 && (
          <BreakdownList
            title="By Client"
            icon="users"
            items={analytics.clientBreakdown.map(c => ({
              label: c.clientName,
              value: c.visitCount,
              percentage: c.percentage,
            }))}
          />
        )}

        {/* Peak Day */}
        {analytics?.peakDay && analytics.peakDay.date && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="trophy" size={18} color="#FF9800" />
              <Text style={styles.cardTitle}>Busiest Day</Text>
            </View>
            <View style={styles.peakDayContent}>
              <Text style={styles.peakDayDate}>
                {new Date(analytics.peakDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.peakDayStats}>
                {analytics.peakDay.visits} visits • {formatHours(analytics.peakDay.hours)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  warningContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  criticalBanner: {
    backgroundColor: '#F44336',
  },
  warningBannerYellow: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  warningTextDark: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  overLimitText: {
    color: '#F44336',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  breakdownLabelContainer: {
    width: 100,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  breakdownValue: {
    fontSize: 11,
    color: '#666',
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  breakdownPercentage: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    color: '#666',
  },
  peakDayContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  peakDayDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  peakDayStats: {
    fontSize: 14,
    color: '#666',
  },
  bottomPadding: {
    height: 40,
  },
});

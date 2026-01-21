import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useSettings, useRulesEngine } from '@/hooks';
import { CalendarEvent } from '@/models';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 48) / 7; // Account for padding

/**
 * Get start of month
 */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get all days to display in month view (including padding days)
 */
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill first week
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Add all days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Add days from next month to complete last week
  const endDayOfWeek = lastDay.getDay();
  for (let i = 1; i < 7 - endDayOfWeek; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Format month/year header
 */
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Check if two dates are the same day
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Generate mock events for the calendar
 */
function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();

  // Generate events for the month
  for (let dayOffset = -15; dayOffset <= 15; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    // Skip some days randomly
    if (Math.random() > 0.6) continue;

    const dateStr = date.toISOString().split('T')[0];
    const eventCount = Math.floor(Math.random() * 4) + 1;

    const services = ['drop-in', 'walk', 'overnight'];
    const clients = ['Johnson Family', 'Smith Residence', 'Garcia Home', 'Williams Family'];
    const hours = [8, 10, 14, 16, 18];

    for (let i = 0; i < eventCount && i < hours.length; i++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const client = clients[Math.floor(Math.random() * clients.length)];
      const duration = service === 'walk' ? 60 : 30;

      events.push({
        id: `event_${dateStr}_${i}`,
        calendarId: 'work',
        title: `${service === 'walk' ? 'Walk' : 'Drop-in'} - ${client}`,
        clientName: client,
        location: `${100 + i} Main Street`,
        start: `${dateStr}T${String(hours[i]).padStart(2, '0')}:00:00`,
        end: `${dateStr}T${String(hours[i]).padStart(2, '0')}:${String(duration).padStart(2, '0')}:00`,
        allDay: false,
        status: 'confirmed',
        isWorkEvent: true,
        serviceInfo: {
          type: service as any,
          duration,
        },
      });
    }
  }

  return events;
}

/**
 * Day Cell Component
 */
function DayCell({
  date,
  events,
  isCurrentMonth,
  onPress,
}: {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  onPress: () => void;
}) {
  const dayNumber = date.getDate();
  const today = isToday(date);
  const eventCount = events.length;

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        !isCurrentMonth && styles.otherMonthDay,
        today && styles.todayCell,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayNumber,
          !isCurrentMonth && styles.otherMonthDayNumber,
          today && styles.todayNumber,
        ]}
      >
        {dayNumber}
      </Text>
      {eventCount > 0 && (
        <View style={styles.eventDots}>
          {eventCount <= 3 ? (
            events.slice(0, 3).map((_, idx) => (
              <View key={idx} style={[styles.eventDot, { backgroundColor: '#2196F3' }]} />
            ))
          ) : (
            <>
              <View style={[styles.eventDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.moreEvents}>+{eventCount - 1}</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Week Row Component
 */
function WeekRow({
  days,
  events,
  currentMonth,
  onDayPress,
}: {
  days: Date[];
  events: CalendarEvent[];
  currentMonth: number;
  onDayPress: (date: Date) => void;
}) {
  return (
    <View style={styles.weekRow}>
      {days.map((date, idx) => {
        const dayEvents = events.filter((e) =>
          isSameDay(new Date(e.start), date)
        );
        return (
          <DayCell
            key={idx}
            date={date}
            events={dayEvents}
            isCurrentMonth={date.getMonth() === currentMonth}
            onPress={() => onDayPress(date)}
          />
        );
      })}
    </View>
  );
}

/**
 * Day Detail Modal Content
 */
function DayDetail({
  date,
  events,
  onEventPress,
  onClose,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.dayDetail}>
      <View style={styles.dayDetailHeader}>
        <Text style={styles.dayDetailTitle}>{dateStr}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome name="times" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.noEvents}>
          <FontAwesome name="calendar-o" size={32} color="#ccc" />
          <Text style={styles.noEventsText}>No visits scheduled</Text>
        </View>
      ) : (
        <ScrollView style={styles.eventsList}>
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventItem}
              onPress={() => onEventPress(event)}
              activeOpacity={0.7}
            >
              <View style={styles.eventTime}>
                <Text style={styles.eventTimeText}>
                  {new Date(event.start).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.clientName && (
                  <Text style={styles.eventClient}>{event.clientName}</Text>
                )}
                {event.location && (
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    <FontAwesome name="map-marker" size={12} color="#999" />{' '}
                    {event.location}
                  </Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={14} color="#ccc" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Calendar Screen
 */
export default function CalendarScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { getBurnoutIndicators } = useRulesEngine(settings);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate mock events (in production, fetch from calendar)
  const events = useMemo(() => generateMockEvents(), []);

  // Get burnout indicators
  const burnoutIndicators = useMemo(
    () => getBurnoutIndicators(events),
    [events, getBurnoutIndicators]
  );

  // Get days for current month view
  const monthDays = useMemo(() => {
    return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Split days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7));
    }
    return result;
  }, [monthDays]);

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => isSameDay(new Date(e.start), selectedDate));
  }, [selectedDate, events]);

  /**
   * Navigate to previous month
   */
  const goToPrevMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDate(null);
  }, []);

  /**
   * Navigate to next month
   */
  const goToNextMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDate(null);
  }, []);

  /**
   * Go to today
   */
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  /**
   * Handle day press
   */
  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  /**
   * Handle event press - navigate to visit detail
   */
  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      // Find or create visit record and navigate
      router.push(`/visit/${event.id}` as any);
    },
    [router]
  );

  /**
   * Refresh handler
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // In production, refetch calendar events
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  if (loading) {
    return <LoadingState message="Loading calendar..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Workload Indicator */}
        {burnoutIndicators.isHighLoad && (
          <View
            style={[
              styles.workloadBanner,
              { backgroundColor: burnoutIndicators.color },
            ]}
          >
            <FontAwesome name="exclamation-triangle" size={16} color="#fff" />
            <Text style={styles.workloadText}>
              {burnoutIndicators.weeklyHours.toFixed(1)}h this week •{' '}
              {burnoutIndicators.message}
            </Text>
          </View>
        )}

        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthTitle}>{formatMonthYear(currentDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Day of Week Headers */}
        <View style={styles.weekDaysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekDayLabel}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, idx) => (
            <WeekRow
              key={idx}
              days={week}
              events={events}
              currentMonth={currentDate.getMonth()}
              onDayPress={handleDayPress}
            />
          ))}
        </View>

        {/* Selected Day Detail */}
        {selectedDate && (
          <DayDetail
            date={selectedDate}
            events={selectedDayEvents}
            onEventPress={handleEventPress}
            onClose={() => setSelectedDate(null)}
          />
        )}

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {events.filter((e) => {
                  const d = new Date(e.start);
                  return (
                    d.getMonth() === currentDate.getMonth() &&
                    d.getFullYear() === currentDate.getFullYear()
                  );
                }).length}
              </Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(
                  events
                    .filter((e) => {
                      const d = new Date(e.start);
                      return (
                        d.getMonth() === currentDate.getMonth() &&
                        d.getFullYear() === currentDate.getFullYear()
                      );
                    })
                    .reduce((sum, e) => {
                      const start = new Date(e.start);
                      const end = new Date(e.end);
                      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    }, 0)
                )}h
              </Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {
                  new Set(
                    events
                      .filter((e) => {
                        const d = new Date(e.start);
                        return (
                          d.getMonth() === currentDate.getMonth() &&
                          d.getFullYear() === currentDate.getFullYear()
                        );
                      })
                      .map((e) => e.clientName)
                      .filter(Boolean)
                  ).size
                }
              </Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  workloadText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekDayLabel: {
    width: DAY_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  calendarGrid: {
    paddingHorizontal: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 8,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  otherMonthDayNumber: {
    color: '#999',
  },
  todayNumber: {
    color: '#2196F3',
    fontWeight: '700',
  },
  eventDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreEvents: {
    fontSize: 10,
    color: '#666',
  },
  dayDetail: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  noEvents: {
    alignItems: 'center',
    padding: 32,
  },
  noEventsText: {
    marginTop: 8,
    color: '#999',
  },
  eventsList: {
    maxHeight: 300,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventTime: {
    width: 70,
  },
  eventTimeText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventClient: {
    fontSize: 13,
    color: '#666',
  },
  eventLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { LoadingState } from '@/components/EmptyState';
import { WeekView } from '@/components/WeekView';
import { useSettings, useRulesEngine, useAuth, useCalendarEvents } from '@/hooks';
import { HapticFeedback } from '@/services';
import {
  CalendarEvent,
  WorkloadLevel,
  WORKLOAD_COLORS,
  WORKLOAD_COLORS_DARK,
  getWorkloadLevel,
  calculateDayWorkHours,
  DEFAULT_THRESHOLDS,
  calculateMonthlyMetrics,
  calculateWeeklyHours,
  filterWorkEvents,
} from '@/models';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 48) / 7; // Account for padding

type ViewMode = 'month' | 'week';

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
        Link your Google Calendar to view and manage your pet-sitting schedule.
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
 * Workload Legend Component
 */
function WorkloadLegend({ isDark }: { isDark: boolean }) {
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
  const levels: WorkloadLevel[] = ['comfortable', 'busy', 'high', 'burnout'];

  return (
    <View style={styles.legendContainer}>
      <Text style={[styles.legendTitle, isDark && styles.legendTitleDark]}>Workload:</Text>
      {levels.map((level) => (
        <View key={level} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors[level].solid }]} />
          <Text style={[styles.legendText, isDark && styles.legendTextDark]}>
            {colors[level].label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Day Cell Component with Workload Indicator
 */
function DayCell({
  date,
  events,
  isCurrentMonth,
  workloadLevel,
  workloadHours,
  onPress,
  isDark,
}: {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  workloadLevel: WorkloadLevel;
  workloadHours: number;
  onPress: () => void;
  isDark: boolean;
}) {
  const dayNumber = date.getDate();
  const today = isToday(date);
  const eventCount = events.length;
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
  const workloadColor = colors[workloadLevel];

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        !isCurrentMonth && styles.otherMonthDay,
        today && styles.todayCell,
        workloadLevel !== 'none' && { backgroundColor: workloadColor.background },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Day Number */}
      <View style={[styles.dayNumberContainer, today && styles.todayNumberContainer]}>
        <Text
          style={[
            styles.dayNumber,
            !isCurrentMonth && styles.otherMonthDayNumber,
            today && styles.todayNumber,
            isDark && !today && styles.dayNumberDark,
          ]}
        >
          {dayNumber}
        </Text>
      </View>

      {/* Workload Indicator Dot */}
      {workloadLevel !== 'none' && (
        <View style={[styles.workloadDot, { backgroundColor: workloadColor.solid }]} />
      )}

      {/* Event Count / Hours */}
      {eventCount > 0 && (
        <View style={styles.eventInfo}>
          <Text style={[styles.eventCount, { color: workloadColor.text }]}>
            {eventCount}
          </Text>
          {workloadHours >= 1 && (
            <Text style={[styles.hoursText, isDark && styles.hoursTextDark]}>
              {workloadHours.toFixed(0)}h
            </Text>
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
  isDark,
}: {
  days: Date[];
  events: CalendarEvent[];
  currentMonth: number;
  onDayPress: (date: Date) => void;
  isDark: boolean;
}) {
  return (
    <View style={styles.weekRow}>
      {days.map((date, idx) => {
        const dayEvents = events.filter((e) =>
          isSameDay(new Date(e.start), date)
        );
        const workloadHours = calculateDayWorkHours(dayEvents, date);
        const workloadLevel = getWorkloadLevel(workloadHours, 'daily', DEFAULT_THRESHOLDS);

        return (
          <DayCell
            key={idx}
            date={date}
            events={dayEvents}
            isCurrentMonth={date.getMonth() === currentMonth}
            workloadLevel={workloadLevel}
            workloadHours={workloadHours}
            onPress={() => onDayPress(date)}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

/**
 * Day Detail Panel with Workload
 */
function DayDetail({
  date,
  events,
  workloadLevel,
  workloadHours,
  onEventPress,
  onClose,
  isDark,
}: {
  date: Date;
  events: CalendarEvent[];
  workloadLevel: WorkloadLevel;
  workloadHours: number;
  onEventPress: (event: CalendarEvent) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
  const workloadColor = colors[workloadLevel];
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.dayDetail, isDark && styles.dayDetailDark]}>
      <View style={[styles.dayDetailHeader, isDark && styles.dayDetailHeaderDark]}>
        <View>
          <Text style={[styles.dayDetailTitle, isDark && styles.dayDetailTitleDark]}>
            {dateStr}
          </Text>
          {/* Workload Summary */}
          <View style={styles.workloadSummary}>
            <View style={[styles.workloadBadge, { backgroundColor: workloadColor.background }]}>
              <View style={[styles.workloadBadgeDot, { backgroundColor: workloadColor.solid }]} />
              <Text style={[styles.workloadBadgeText, { color: workloadColor.text }]}>
                {workloadColor.label}
                {workloadHours > 0 && ` • ${workloadHours.toFixed(1)}h`}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome name="times" size={20} color={isDark ? '#999' : '#666'} />
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.noEvents}>
          <FontAwesome name="calendar-o" size={32} color={isDark ? '#555' : '#ccc'} />
          <Text style={[styles.noEventsText, isDark && styles.noEventsTextDark]}>
            No visits scheduled
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.eventsList}>
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventItem, isDark && styles.eventItemDark]}
              onPress={() => onEventPress(event)}
              activeOpacity={0.7}
            >
              <View style={styles.eventTime}>
                <Text style={[styles.eventTimeText, isDark && styles.eventTimeTextDark]}>
                  {new Date(event.start).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              <View style={styles.eventInfoContainer}>
                <Text style={[styles.eventTitle, isDark && styles.eventTitleDark]}>
                  {event.title}
                </Text>
                {event.clientName && (
                  <Text style={[styles.eventClient, isDark && styles.eventClientDark]}>
                    {event.clientName}
                  </Text>
                )}
                {event.location && (
                  <Text style={[styles.eventLocation, isDark && styles.eventLocationDark]} numberOfLines={1}>
                    <FontAwesome name="map-marker" size={12} color={isDark ? '#666' : '#999'} />{' '}
                    {event.location}
                  </Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={14} color={isDark ? '#555' : '#ccc'} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Weekly Summary Bar
 */
function WeeklySummary({ events, isDark }: { events: CalendarEvent[]; isDark: boolean }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Use centralized metrics calculation - only counts work events and clamps to week boundaries
  const weekHours = calculateWeeklyHours(events, startOfWeek, endOfWeek);
  const workEvents = filterWorkEvents(events).filter((e) => {
    const eventDate = new Date(e.start);
    return eventDate >= startOfWeek && eventDate <= endOfWeek;
  });

  const weekLevel = getWorkloadLevel(weekHours, 'weekly', DEFAULT_THRESHOLDS);
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;
  const workloadColor = colors[weekLevel];

  return (
    <View style={[styles.weeklySummary, { backgroundColor: workloadColor.background }]}>
      <View style={styles.weeklySummaryContent}>
        <View style={[styles.weeklyDot, { backgroundColor: workloadColor.solid }]} />
        <Text style={[styles.weeklySummaryText, isDark && styles.weeklySummaryTextDark]}>
          This week: <Text style={{ fontWeight: '700' }}>{weekHours.toFixed(1)}h</Text> scheduled
        </Text>
        <View style={[styles.weeklyBadgePill, { backgroundColor: workloadColor.solid }]}>
          <Text style={styles.weeklyBadgePillText}>{workloadColor.label}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Monthly Stats Component
 * Uses centralized metrics calculation for accurate work-event-only stats
 */
function MonthlyStats({
  events,
  currentDate,
  isDark,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  isDark: boolean;
}) {
  const metrics = useMemo(() => {
    return calculateMonthlyMetrics(
      events,
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
  }, [events, currentDate]);

  return (
    <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
      <Text style={[styles.statsTitle, isDark && styles.statsTitleDark]}>This Month</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{metrics.totalVisits}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(metrics.totalHours)}h</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{metrics.uniqueClients}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Calendar Screen
 */
export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  const { getBurnoutIndicators } = useRulesEngine(settings);
  
  // Auth state for Google Calendar
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      // Week view: start from Sunday of current week
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    } else {
      // Month view with buffer
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const rangeStart = new Date(startOfMonth);
      rangeStart.setDate(rangeStart.getDate() - 7);
      const rangeEnd = new Date(endOfMonth);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
      return { start: rangeStart, end: rangeEnd };
    }
  }, [currentDate, viewMode]);

  // Fetch calendar events for the date range
  const { events: calendarEvents, loading: eventsLoading, refresh: refreshEvents } = useCalendarEvents(dateRange);
  
  // Use calendar events if signed in or in demo mode
  const events = useMemo(() => {
    return (isSignedIn || isDemoMode) && calendarEvents ? calendarEvents : [];
  }, [isSignedIn, isDemoMode, calendarEvents]);

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

  // Calculate selected day workload
  const selectedDayWorkload = useMemo(() => {
    if (!selectedDate) return { hours: 0, level: 'none' as WorkloadLevel };
    const hours = calculateDayWorkHours(selectedDayEvents, selectedDate);
    const level = getWorkloadLevel(hours, 'daily', DEFAULT_THRESHOLDS);
    return { hours, level };
  }, [selectedDate, selectedDayEvents]);

  /**
   * Navigate to previous month
   */
  const goToPrevMonth = useCallback(() => {
    HapticFeedback.selection();
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDate(null);
  }, []);

  /**
   * Navigate to next month
   */
  const goToNextMonth = useCallback(() => {
    HapticFeedback.selection();
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDate(null);
  }, []);

  /**
   * Navigate to previous week
   */
  const goToPrevWeek = useCallback(() => {
    HapticFeedback.selection();
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(d.getDate() - 7);
      return newDate;
    });
  }, []);

  /**
   * Navigate to next week
   */
  const goToNextWeek = useCallback(() => {
    HapticFeedback.selection();
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(d.getDate() + 7);
      return newDate;
    });
  }, []);

  /**
   * Go to today
   */
  const goToToday = useCallback(() => {
    HapticFeedback.selection();
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  /**
   * Toggle view mode
   */
  const toggleViewMode = useCallback(() => {
    HapticFeedback.selection();
    setViewMode((mode) => (mode === 'month' ? 'week' : 'month'));
  }, []);

  /**
   * Handle day press
   */
  const handleDayPress = useCallback((date: Date) => {
    HapticFeedback.light();
    setSelectedDate(date);
  }, []);

  /**
   * Handle event press - navigate to visit detail
   */
  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      HapticFeedback.selection();
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
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  // Show loading state
  const loading = authLoading || eventsLoading;
  
  if (loading && !refreshing) {
    return <LoadingState type="skeleton-calendar" />;
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

  // Render the View Mode Toggle component
  const ViewModeToggleComponent = () => {
    const isMonthView = viewMode === 'month';
    const isWeekView = viewMode === 'week';
    
    return (
      <View style={[styles.viewModeToggle, isDark && styles.viewModeToggleDark]}>
        <TouchableOpacity
          style={[styles.viewModeButton, isMonthView && styles.viewModeButtonActive]}
          onPress={toggleViewMode}
        >
          <FontAwesome name="calendar" size={16} color={isMonthView ? '#fff' : '#2196F3'} />
          <Text style={[styles.viewModeText, isMonthView && styles.viewModeTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, isWeekView && styles.viewModeButtonActive]}
          onPress={toggleViewMode}
        >
          <FontAwesome name="list" size={16} color={isWeekView ? '#fff' : '#2196F3'} />
          <Text style={[styles.viewModeText, isWeekView && styles.viewModeTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Week view
  if (viewMode === 'week') {
    return (
      <ThemedView style={styles.container}>
        <ViewModeToggleComponent />
        <WeekView
          events={events}
          startDate={currentDate}
          onEventPress={handleEventPress}
          onNavigatePrev={goToPrevWeek}
          onNavigateNext={goToNextWeek}
          onNavigateToday={goToToday}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ViewModeToggleComponent />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Weekly Summary */}
        <WeeklySummary events={events} isDark={isDark} />

        {/* Month Navigation */}
        <View style={[styles.monthHeader, isDark && styles.monthHeaderDark]}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={[styles.monthTitle, isDark && styles.monthTitleDark]}>
              {formatMonthYear(currentDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Day of Week Headers */}
        <View style={styles.weekDaysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={[styles.weekDayLabel, isDark && styles.weekDayLabelDark]}>
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
              isDark={isDark}
            />
          ))}
        </View>

        {/* Workload Legend */}
        <WorkloadLegend isDark={isDark} />

        {/* Selected Day Detail */}
        {selectedDate && (
          <DayDetail
            date={selectedDate}
            events={selectedDayEvents}
            workloadLevel={selectedDayWorkload.level}
            workloadHours={selectedDayWorkload.hours}
            onEventPress={handleEventPress}
            onClose={() => setSelectedDate(null)}
            isDark={isDark}
          />
        )}

        {/* Stats Summary */}
        <MonthlyStats events={events} currentDate={currentDate} isDark={isDark} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weeklySummary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  weeklySummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  weeklySummaryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  weeklySummaryTextDark: {
    color: '#e0e0e0',
  },
  weeklyBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weeklyBadgePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 4,
  },
  legendTitle: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  legendTitleDark: {
    color: '#999',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  legendTextDark: {
    color: '#999',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  monthHeaderDark: {},
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  monthTitleDark: {
    color: '#fff',
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
  weekDayLabelDark: {
    color: '#999',
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
  todayCell: {},
  dayNumberContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumberContainer: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dayNumberDark: {
    color: '#e0e0e0',
  },
  otherMonthDayNumber: {
    color: '#999',
  },
  todayNumber: {
    color: '#fff',
    fontWeight: '700',
  },
  workloadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  eventInfo: {
    alignItems: 'center',
    marginTop: 2,
  },
  eventCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  hoursText: {
    fontSize: 9,
    color: '#666',
  },
  hoursTextDark: {
    color: '#999',
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
  dayDetailDark: {
    backgroundColor: '#1e1e1e',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayDetailHeaderDark: {
    borderBottomColor: '#333',
  },
  dayDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayDetailTitleDark: {
    color: '#fff',
  },
  workloadSummary: {
    marginTop: 6,
  },
  workloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  workloadBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  workloadBadgeText: {
    fontSize: 12,
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
  noEventsTextDark: {
    color: '#666',
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
  eventItemDark: {
    borderBottomColor: '#333',
  },
  eventTime: {
    width: 70,
  },
  eventTimeText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  eventTimeTextDark: {
    color: '#64B5F6',
  },
  eventInfoContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  eventTitleDark: {
    color: '#fff',
  },
  eventClient: {
    fontSize: 13,
    color: '#666',
  },
  eventClientDark: {
    color: '#999',
  },
  eventLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  eventLocationDark: {
    color: '#666',
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statsContainerDark: {
    backgroundColor: '#1e1e1e',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statsTitleDark: {
    color: '#fff',
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
  statLabelDark: {
    color: '#999',
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
  // View Mode Toggle styles
  viewModeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  viewModeToggleDark: {
    backgroundColor: '#1e1e1e',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  viewModeTextActive: {
    color: '#fff',
  },
});

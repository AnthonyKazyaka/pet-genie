import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { CalendarEvent } from '@/models';
import { HapticFeedback } from '@/services';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 50;
const TIME_COLUMN_WIDTH = 50;
const HOUR_HEIGHT = 60;
const DAY_WIDTH = (SCREEN_WIDTH - TIME_COLUMN_WIDTH) / 7;

// Time slots from 6am to 10pm
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface WeekViewProps {
  events: CalendarEvent[];
  startDate: Date;
  onEventPress?: (event: CalendarEvent) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onNavigateToday?: () => void;
}

/**
 * Format time label (e.g., "6 AM")
 */
function formatTimeLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Format day header (e.g., "Mon 15")
 */
function formatDayHeader(date: Date): { dayName: string; dayNum: string } {
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: date.getDate().toString(),
  };
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
 * Format week range (e.g., "Jan 15 - 21, 2024")
 */
function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Calculate event position and dimensions in the week grid
 */
function calculateEventLayout(
  event: CalendarEvent,
  startOfWeek: Date
): { top: number; height: number; dayIndex: number } | null {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  // Find which day of the week this event falls on
  let dayIndex = -1;
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    if (isSameDay(eventStart, dayDate)) {
      dayIndex = i;
      break;
    }
  }
  
  if (dayIndex === -1) return null;
  
  // Calculate top position based on event start time
  const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
  const top = (startHour - START_HOUR) * HOUR_HEIGHT;
  
  // Calculate height based on duration
  const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
  const height = Math.max(duration * HOUR_HEIGHT, 20); // Min height of 20
  
  return { top, height, dayIndex };
}

/**
 * Event Card in Week View
 */
function WeekEventCard({
  event,
  style,
  onPress,
  isDark,
}: {
  event: CalendarEvent;
  style: { top: number; height: number; left: number; width: number };
  onPress: () => void;
  isDark: boolean;
}) {
  const eventTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  // Different colors based on service type
  const getEventColor = () => {
    const type = event.serviceInfo?.type;
    if (type === 'walk') return '#4CAF50';
    if (type === 'overnight') return '#9C27B0';
    return '#2196F3';
  };
  
  const backgroundColor = getEventColor();
  const isSmall = style.height < 40;

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        {
          position: 'absolute',
          top: style.top,
          left: style.left,
          width: style.width - 4,
          height: style.height - 2,
          backgroundColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {!isSmall && (
        <Text style={styles.eventTime} numberOfLines={1}>
          {eventTime}
        </Text>
      )}
      <Text
        style={[styles.eventTitle, isSmall && styles.eventTitleSmall]}
        numberOfLines={isSmall ? 1 : 2}
      >
        {event.title}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Week View Component
 */
export function WeekView({
  events,
  startDate,
  onEventPress,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
}: WeekViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get the start of the week (Sunday)
  const startOfWeek = useMemo(() => {
    const d = new Date(startDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDate]);

  // Generate array of 7 days for the week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [startOfWeek]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<number, CalendarEvent[]>();
    for (let i = 0; i < 7; i++) {
      grouped.set(i, []);
    }
    
    events.forEach((event) => {
      const layout = calculateEventLayout(event, startOfWeek);
      if (layout) {
        grouped.get(layout.dayIndex)?.push(event);
      }
    });
    
    return grouped;
  }, [events, startOfWeek]);

  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      HapticFeedback.selection();
      onEventPress?.(event);
    },
    [onEventPress]
  );

  const handlePrev = useCallback(() => {
    HapticFeedback.selection();
    onNavigatePrev?.();
  }, [onNavigatePrev]);

  const handleNext = useCallback(() => {
    HapticFeedback.selection();
    onNavigateNext?.();
  }, [onNavigateNext]);

  const handleToday = useCallback(() => {
    HapticFeedback.selection();
    onNavigateToday?.();
  }, [onNavigateToday]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header with week navigation */}
      <View style={[styles.headerNav, isDark && styles.headerNavDark]}>
        <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
          <FontAwesome name="chevron-left" size={18} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToday}>
          <Text style={[styles.weekTitle, isDark && styles.weekTitleDark]}>
            {formatWeekRange(startOfWeek)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.navButton}>
          <FontAwesome name="chevron-right" size={18} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={[styles.dayHeaders, isDark && styles.dayHeadersDark]}>
        <View style={styles.timeColumnHeader} />
        {weekDays.map((day, index) => {
          const { dayName, dayNum } = formatDayHeader(day);
          const today = isToday(day);
          return (
            <View
              key={index}
              style={[styles.dayHeader, today && styles.todayHeader]}
            >
              <Text
                style={[
                  styles.dayName,
                  isDark && styles.dayNameDark,
                  today && styles.todayText,
                ]}
              >
                {dayName}
              </Text>
              <View
                style={[styles.dayNumContainer, today && styles.todayNumContainer]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isDark && styles.dayNumDark,
                    today && styles.todayNum,
                  ]}
                >
                  {dayNum}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Time grid */}
      <ScrollView style={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Time column */}
          <View style={styles.timeColumn}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={[styles.timeLabel, isDark && styles.timeLabelDark]}>
                  {formatTimeLabel(hour)}
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => (
            <View key={dayIndex} style={styles.dayColumn}>
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <View
                  key={hour}
                  style={[styles.hourLine, isDark && styles.hourLineDark]}
                />
              ))}

              {/* Events for this day */}
              {eventsByDay.get(dayIndex)?.map((event) => {
                const layout = calculateEventLayout(event, startOfWeek);
                if (!layout) return null;

                return (
                  <WeekEventCard
                    key={event.id}
                    event={event}
                    style={{
                      top: layout.top,
                      height: layout.height,
                      left: 2,
                      width: DAY_WIDTH - 4,
                    }}
                    onPress={() => handleEventPress(event)}
                    isDark={isDark}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerNavDark: {
    borderBottomColor: '#333',
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weekTitleDark: {
    color: '#fff',
  },
  dayHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  dayHeadersDark: {
    borderBottomColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  timeColumnHeader: {
    width: TIME_COLUMN_WIDTH,
  },
  dayHeader: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayHeader: {
    backgroundColor: '#E3F2FD',
  },
  dayName: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayNameDark: {
    color: '#999',
  },
  dayNumContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumContainer: {
    backgroundColor: '#2196F3',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  dayNumDark: {
    color: '#fff',
  },
  todayText: {
    color: '#2196F3',
  },
  todayNum: {
    color: '#fff',
    fontWeight: '700',
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: -6,
  },
  timeLabelDark: {
    color: '#666',
  },
  dayColumn: {
    width: DAY_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    position: 'relative',
  },
  hourLine: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  hourLineDark: {
    borderTopColor: '#2a2a2a',
  },
  eventCard: {
    borderRadius: 4,
    padding: 4,
    overflow: 'hidden',
  },
  eventTime: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  eventTitleSmall: {
    fontSize: 10,
  },
});

export default WeekView;

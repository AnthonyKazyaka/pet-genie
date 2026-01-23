import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { CalendarEvent, WORKLOAD_COLORS, WORKLOAD_COLORS_DARK, getWorkloadLevel, calculateDayWorkHours, DEFAULT_THRESHOLDS } from '@/models';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOUR_HEIGHT = 60;
const START_HOUR = 6; // 6am
const END_HOUR = 22; // 10pm
const TOTAL_HOURS = END_HOUR - START_HOUR;

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onTimeSlotPress?: (date: Date, hour: number) => void;
  isDark?: boolean;
}

/**
 * Format time for display
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

/**
 * Get event position and height based on time
 */
function getEventPosition(event: CalendarEvent): { top: number; height: number } {
  const start = new Date(event.start);
  const end = new Date(event.end);
  
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  
  // Clamp to visible hours
  const clampedStart = Math.max(startHour, START_HOUR);
  const clampedEnd = Math.min(endHour, END_HOUR);
  
  const top = (clampedStart - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 30); // Minimum height of 30
  
  return { top, height };
}

/**
 * Get service type color
 */
function getServiceColor(type?: string): string {
  switch (type) {
    case 'walk':
      return '#10B981';
    case 'drop-in':
      return '#3B82F6';
    case 'overnight':
      return '#8B5CF6';
    case 'housesit':
      return '#EC4899';
    default:
      return '#6B7280';
  }
}

/**
 * Event block component
 */
function EventBlock({
  event,
  onPress,
  isDark,
  style,
}: {
  event: CalendarEvent;
  onPress: () => void;
  isDark: boolean;
  style?: object;
}) {
  const serviceColor = getServiceColor(event.serviceInfo?.type);
  const startTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = new Date(event.end).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <TouchableOpacity
      style={[
        styles.eventBlock,
        { borderLeftColor: serviceColor, backgroundColor: serviceColor + '15' },
        isDark && styles.eventBlockDark,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.eventTitle, isDark && styles.eventTitleDark]} numberOfLines={1}>
        {event.title || 'Untitled'}
      </Text>
      <Text style={[styles.eventTime, isDark && styles.eventTimeDark]}>
        {startTime} - {endTime}
      </Text>
      {event.clientName && (
        <Text style={[styles.eventClient, isDark && styles.eventClientDark]} numberOfLines={1}>
          <FontAwesome name="user" size={10} color={isDark ? '#9CA3AF' : '#6B7280'} /> {event.clientName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Current time indicator
 */
function CurrentTimeIndicator({ isDark }: { isDark: boolean }) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  
  if (hour < START_HOUR || hour > END_HOUR) return null;
  
  const top = (hour - START_HOUR) * HOUR_HEIGHT;
  
  return (
    <View style={[styles.currentTimeIndicator, { top }]}>
      <View style={styles.currentTimeDot} />
      <View style={styles.currentTimeLine} />
    </View>
  );
}

/**
 * Day View component
 * Shows a detailed hourly view of events for a single day
 */
export function DayView({
  date,
  events,
  onEventPress,
  onTimeSlotPress,
  isDark = false,
}: DayViewProps) {
  const colors = isDark ? WORKLOAD_COLORS_DARK : WORKLOAD_COLORS;

  // Calculate workload for the day
  const workloadHours = useMemo(() => calculateDayWorkHours(events, date), [events, date]);
  const workloadLevel = useMemo(() => getWorkloadLevel(workloadHours, 'daily', DEFAULT_THRESHOLDS), [workloadHours]);
  const workloadColor = colors[workloadLevel];

  // Filter and position events
  const positionedEvents = useMemo(() => {
    return events
      .filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.toDateString() === date.toDateString();
      })
      .map(event => ({
        event,
        ...getEventPosition(event),
      }))
      .sort((a, b) => a.top - b.top);
  }, [events, date]);

  // Check if date is today
  const isToday = date.toDateString() === new Date().toDateString();

  // Generate hour slots
  const hourSlots = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  }, []);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Day Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View>
          <Text style={[styles.dateText, isDark && styles.dateTextDark]}>
            {date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </View>
        
        {/* Workload Summary */}
        <View style={[styles.workloadBadge, { backgroundColor: workloadColor.background }]}>
          <View style={[styles.workloadDot, { backgroundColor: workloadColor.solid }]} />
          <Text style={[styles.workloadText, { color: workloadColor.text }]}>
            {workloadHours > 0 ? `${workloadHours.toFixed(1)}h` : 'Free'}
          </Text>
        </View>
      </View>

      {/* Time Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timeGrid}>
          {/* Hour Labels */}
          <View style={styles.hourLabels}>
            {hourSlots.map(hour => (
              <View key={hour} style={styles.hourLabel}>
                <Text style={[styles.hourText, isDark && styles.hourTextDark]}>
                  {formatHour(hour)}
                </Text>
              </View>
            ))}
          </View>

          {/* Events Area */}
          <View style={styles.eventsArea}>
            {/* Hour Grid Lines */}
            {hourSlots.map(hour => (
              <TouchableOpacity
                key={hour}
                style={[styles.hourSlot, isDark && styles.hourSlotDark]}
                onPress={() => onTimeSlotPress?.(date, hour)}
                activeOpacity={0.5}
              >
                <View style={[styles.hourLine, isDark && styles.hourLineDark]} />
              </TouchableOpacity>
            ))}

            {/* Current Time Indicator */}
            {isToday && <CurrentTimeIndicator isDark={isDark} />}

            {/* Event Blocks */}
            {positionedEvents.map(({ event, top, height }) => (
              <EventBlock
                key={`${event.calendarId}-${event.id}`}
                event={event}
                onPress={() => onEventPress(event)}
                isDark={isDark}
                style={{
                  position: 'absolute',
                  top,
                  left: 4,
                  right: 4,
                  height,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Empty State */}
      {positionedEvents.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
            <FontAwesome name="calendar-o" size={40} color={isDark ? '#4B5563' : '#D1D5DB'} />
            <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
              No visits scheduled
            </Text>
            <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
              Your schedule is clear for this day
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateTextDark: {
    color: '#F3F4F6',
  },
  todayBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  workloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  workloadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  workloadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    minHeight: TOTAL_HOURS * HOUR_HEIGHT + 40,
  },
  timeGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  hourLabels: {
    width: 60,
    paddingTop: 0,
  },
  hourLabel: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingRight: 8,
    paddingTop: 4,
  },
  hourText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  hourTextDark: {
    color: '#6B7280',
  },
  eventsArea: {
    flex: 1,
    position: 'relative',
  },
  hourSlot: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  hourSlotDark: {
    borderTopColor: '#374151',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  hourLineDark: {
    backgroundColor: '#374151',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginLeft: -5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
  },
  eventBlock: {
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 8,
    overflow: 'hidden',
  },
  eventBlockDark: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  eventTitleDark: {
    color: '#F3F4F6',
  },
  eventTime: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  eventTimeDark: {
    color: '#9CA3AF',
  },
  eventClient: {
    fontSize: 11,
    color: '#6B7280',
  },
  eventClientDark: {
    color: '#9CA3AF',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    width: '100%',
  },
  emptyStateDark: {
    backgroundColor: '#1F2937',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyTitleDark: {
    color: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#9CA3AF',
  },
});

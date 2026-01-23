import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { CalendarEvent, WORKLOAD_COLORS, WORKLOAD_COLORS_DARK } from '@/models';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onViewAll?: () => void;
  isDark?: boolean;
  maxEvents?: number;
}

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
 * Format date for section header
 */
function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
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
 * Single event item component
 */
function EventItem({
  event,
  onPress,
  isDark,
}: {
  event: CalendarEvent;
  onPress: () => void;
  isDark: boolean;
}) {
  const serviceColor = getServiceColor(event.serviceInfo?.type);

  return (
    <TouchableOpacity
      style={[styles.eventItem, isDark && styles.eventItemDark]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.serviceIndicator, { backgroundColor: serviceColor }]} />
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, isDark && styles.eventTitleDark]} numberOfLines={1}>
          {event.title || 'Untitled Event'}
        </Text>
        <View style={styles.eventMeta}>
          <FontAwesome name="clock-o" size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <Text style={[styles.eventTime, isDark && styles.eventTimeDark]}>
            {formatTime(event.start)} - {formatTime(event.end)}
          </Text>
          {event.clientName && (
            <>
              <View style={[styles.dot, isDark && styles.dotDark]} />
              <FontAwesome name="user" size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.eventClient, isDark && styles.eventClientDark]} numberOfLines={1}>
                {event.clientName}
              </Text>
            </>
          )}
        </View>
      </View>
      <FontAwesome name="chevron-right" size={14} color={isDark ? '#4B5563' : '#D1D5DB'} />
    </TouchableOpacity>
  );
}

/**
 * Upcoming Events component
 * Shows events grouped by day with a clean list view
 */
export function UpcomingEvents({
  events,
  onEventPress,
  onViewAll,
  isDark = false,
  maxEvents = 10,
}: UpcomingEventsProps) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: CalendarEvent[] }[] = [];
    const displayEvents = events.slice(0, maxEvents);

    displayEvents.forEach(event => {
      const dateStr = event.start.split('T')[0];
      const existingGroup = groups.find(g => g.date === dateStr);
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ date: dateStr, events: [event] });
      }
    });

    return groups;
  }, [events, maxEvents]);

  const hasMore = events.length > maxEvents;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>Upcoming Visits</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {groupedEvents.map((group, groupIndex) => (
        <View key={group.date}>
          <Text style={[styles.dateHeader, isDark && styles.dateHeaderDark]}>
            {formatSectionDate(group.date)}
          </Text>
          {group.events.map((event, eventIndex) => (
            <EventItem
              key={`${event.calendarId}-${event.id}`}
              event={event}
              onPress={() => onEventPress(event)}
              isDark={isDark}
            />
          ))}
        </View>
      ))}

      {hasMore && onViewAll && (
        <TouchableOpacity
          style={[styles.showMoreButton, isDark && styles.showMoreButtonDark]}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.showMoreText}>
            +{events.length - maxEvents} more visits
          </Text>
          <FontAwesome name="arrow-right" size={14} color="#2563EB" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  titleDark: {
    color: '#F3F4F6',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  dateHeaderDark: {
    color: '#9CA3AF',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  eventItemDark: {
    backgroundColor: '#374151',
  },
  serviceIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventTitleDark: {
    color: '#F3F4F6',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  eventTimeDark: {
    color: '#9CA3AF',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  dotDark: {
    backgroundColor: '#4B5563',
  },
  eventClient: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  eventClientDark: {
    color: '#9CA3AF',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  showMoreButtonDark: {
    borderTopColor: '#374151',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});

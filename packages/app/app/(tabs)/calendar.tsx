import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { View, Text, Card, EventCard, EmptyState } from '@/components';
import { Colors, WorkloadColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useEventsStore, useAuthStore, useSettingsStore } from '@/stores';
import {
  calculateDailyMetrics,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from '@pet-genie/core';
import { router } from 'expo-router';

export default function CalendarScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  const { events } = useEventsStore();
  const { isSignedIn } = useAuthStore();
  const { settings } = useSettingsStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: settings.weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: settings.weekStartsOn });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, settings.weekStartsOn]);
  
  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    
    return events
      .filter((e) => isSameDay(e.start, selectedDate) && e.isWorkEvent)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, selectedDate]);
  
  // Calculate workload for each day
  const dayMetrics = useMemo(() => {
    const metrics: Record<string, { level: string; count: number }> = {};
    
    calendarDays.forEach((day) => {
      const dayEvents = events.filter((e) => isSameDay(e.start, day) && e.isWorkEvent);
      if (dayEvents.length > 0) {
        const m = calculateDailyMetrics(day, events, {
          includeTravelTime: settings.includeTravelTime,
          thresholds: settings.thresholds,
        });
        metrics[day.toISOString()] = { level: m.level, count: dayEvents.length };
      }
    });
    
    return metrics;
  }, [calendarDays, events, settings]);
  
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="log-in-outline"
          title="Connect Your Calendar"
          message="Sign in with Google to view your calendar."
          actionLabel="Go to Settings"
          onAction={() => router.push('/settings')}
        />
      </View>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const reorderedWeekDays = [
    ...weekDays.slice(settings.weekStartsOn),
    ...weekDays.slice(0, settings.weekStartsOn),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Week days header */}
      <View style={styles.weekHeader}>
        {reorderedWeekDays.map((day) => (
          <Text
            key={day}
            style={[styles.weekDayText, { color: colors.textSecondary }]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const dayData = dayMetrics[day.toISOString()];
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.tint },
                isToday && !isSelected && { borderWidth: 2, borderColor: colors.tint },
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  !isCurrentMonth && { color: colors.textSecondary, opacity: 0.5 },
                  isSelected && { color: '#FFFFFF' },
                ]}
              >
                {format(day, 'd')}
              </Text>
              {dayData && (
                <View
                  style={[
                    styles.eventIndicator,
                    { backgroundColor: isSelected ? '#FFFFFF' : WorkloadColors[dayData.level as keyof typeof WorkloadColors] },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date events */}
      {selectedDate && (
        <ScrollView style={styles.eventsList}>
          <Text style={styles.selectedDateText}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>
          
          {selectedDateEvents.length === 0 ? (
            <Card>
              <View style={styles.noEvents}>
                <Text style={{ color: colors.textSecondary }}>
                  No visits scheduled
                </Text>
              </View>
            </Card>
          ) : (
            selectedDateEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noEvents: {
    padding: 24,
    alignItems: 'center',
  },
});

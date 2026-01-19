import React from 'react';
import { View, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { Text } from './Themed';
import { Colors, WorkloadColors } from '@/constants/Colors';
import { CalendarEvent, formatDuration, getServiceTypeLabel } from '@pet-genie/core';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface EventCardProps {
  event: CalendarEvent;
  onPress?: () => void;
  showDate?: boolean;
}

export function EventCard({ event, onPress, showDate = false }: EventCardProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const getStatusColor = () => {
    if (event.isOvernightEvent) return WorkloadColors.high;
    if (event.isWorkEvent) return colors.tint;
    return colors.textSecondary;
  };

  const durationMinutes = Math.round(
    (event.end.getTime() - event.start.getTime()) / (1000 * 60)
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {event.clientName || event.title}
          </Text>
          {event.serviceInfo && (
            <View style={[styles.badge, { backgroundColor: `${colors.tint}20` }]}>
              <Text style={[styles.badgeText, { color: colors.tint }]}>
                {getServiceTypeLabel(event.serviceInfo.type)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              {' • '}
              {formatDuration(durationMinutes)}
            </Text>
          </View>
          
          {showDate && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {format(event.start, 'EEEE, MMMM d')}
              </Text>
            </View>
          )}
          
          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {event.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  indicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
});

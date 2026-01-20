import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from './Themed';
import { VisitStatus } from '../models';

interface StatusBadgeProps {
  status: VisitStatus;
  style?: ViewStyle;
}

const statusColors: Record<VisitStatus, { bg: string; text: string }> = {
  scheduled: { bg: '#E3F2FD', text: '#1565C0' },
  'in-progress': { bg: '#FFF3E0', text: '#E65100' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
};

const statusLabels: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const colors = statusColors[status];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {statusLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';

interface DashboardCardProps {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  isDark?: boolean;
}

/**
 * Dashboard stat card component
 * Displays a metric with icon, value, and optional subtitle
 */
export function DashboardCard({
  icon,
  label,
  value,
  subtitle,
  color = '#2563EB',
  onPress,
  isDark = false,
}: DashboardCardProps) {
  const content = (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <FontAwesome name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      </View>
      <Text style={[styles.value, isDark && styles.valueDark, { color }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  labelDark: {
    color: '#9CA3AF',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  valueDark: {
    color: '#F3F4F6',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subtitleDark: {
    color: '#6B7280',
  },
});

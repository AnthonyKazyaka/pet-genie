import React from 'react';
import { StyleSheet, View, ActivityIndicator, useColorScheme } from 'react-native';
import { Text } from './Themed';
import { SkeletonTodayScreen, SkeletonCalendar, SkeletonChart } from './Skeleton';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
      {message && <Text style={[styles.message, isDark && styles.messageDark]}>{message}</Text>}
    </View>
  );
}

interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton-today' | 'skeleton-calendar' | 'skeleton-chart';
}

export function LoadingState({ message = 'Loading...', type = 'spinner' }: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Render skeleton loading based on type
  if (type === 'skeleton-today') {
    return <SkeletonTodayScreen />;
  }
  if (type === 'skeleton-calendar') {
    return <SkeletonCalendar />;
  }
  if (type === 'skeleton-chart') {
    return <SkeletonChart />;
  }

  // Default spinner
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleDark: {
    color: '#e0e0e0',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messageDark: {
    color: '#999',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  loadingTextDark: {
    color: '#999',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  useColorScheme,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Individual skeleton element with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const baseColor = isDark ? '#2a2a2a' : '#e0e0e0';
  const shimmerColor = isDark ? '#3a3a3a' : '#f5f5f5';

  return (
    <View
      style={[
        {
          width: typeof width === 'number' ? width : width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}
      >
        <View
          style={{
            width: SCREEN_WIDTH,
            height: '100%',
            backgroundColor: shimmerColor,
            opacity: 0.5,
          }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Skeleton card layout for visit cards
 */
export function SkeletonCard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <View style={styles.cardContent}>
        <Skeleton width={60} height={18} borderRadius={4} />
        <View style={styles.cardBody}>
          <Skeleton width="70%" height={16} borderRadius={4} />
          <View style={styles.cardSubRow}>
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton width={100} height={14} borderRadius={4} />
          </View>
        </View>
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
}

/**
 * Skeleton for stats display
 */
export function SkeletonStats() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
      <View style={styles.statItem}>
        <Skeleton width={40} height={28} borderRadius={4} />
        <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
      <View style={styles.statItem}>
        <Skeleton width={40} height={28} borderRadius={4} />
        <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
      <View style={styles.statItem}>
        <Skeleton width={40} height={28} borderRadius={4} />
        <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton for calendar day cells
 */
export function SkeletonCalendarRow() {
  return (
    <View style={styles.calendarRow}>
      {[...Array(7)].map((_, i) => (
        <View key={i} style={styles.calendarDay}>
          <Skeleton width={24} height={24} borderRadius={12} />
          <Skeleton width={20} height={6} borderRadius={3} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

/**
 * Full calendar skeleton
 */
export function SkeletonCalendar() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.calendarContainer, isDark && styles.calendarContainerDark]}>
      {/* Month header */}
      <View style={styles.calendarHeader}>
        <Skeleton width={30} height={30} borderRadius={4} />
        <Skeleton width={150} height={24} borderRadius={4} />
        <Skeleton width={30} height={30} borderRadius={4} />
      </View>
      {/* Day headers */}
      <View style={styles.weekdayRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, i) => (
          <View key={i} style={styles.weekdayItem}>
            <Skeleton width={20} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
      {/* Calendar rows */}
      {[...Array(5)].map((_, i) => (
        <SkeletonCalendarRow key={i} />
      ))}
    </View>
  );
}

/**
 * Skeleton for today's visits list
 */
export function SkeletonTodayScreen() {
  return (
    <View style={styles.todayContainer}>
      {/* Workload summary */}
      <Skeleton
        width="100%"
        height={50}
        borderRadius={10}
        style={{ marginHorizontal: 16, marginTop: 8 }}
      />
      {/* Stats */}
      <SkeletonStats />
      {/* Date header */}
      <Skeleton
        width={180}
        height={20}
        borderRadius={4}
        style={{ marginHorizontal: 16, marginVertical: 12 }}
      />
      {/* Visit cards */}
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

/**
 * Skeleton for analytics charts
 */
export function SkeletonChart() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.chartContainer, isDark && styles.chartContainerDark]}>
      <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
      <View style={styles.chartBars}>
        {[...Array(7)].map((_, i) => (
          <View key={i} style={styles.chartBarContainer}>
            <Skeleton
              width={24}
              height={Math.random() * 80 + 40}
              borderRadius={4}
            />
            <Skeleton
              width={20}
              height={10}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  cardContent: {
    flex: 1,
    gap: 10,
  },
  cardBody: {
    gap: 8,
  },
  cardSubRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  statsContainerDark: {
    backgroundColor: '#1e1e1e',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  statDividerDark: {
    backgroundColor: '#333',
  },
  calendarContainer: {
    padding: 16,
  },
  calendarContainerDark: {},
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayItem: {
    flex: 1,
    alignItems: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayContainer: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  chartContainerDark: {
    backgroundColor: '#1e1e1e',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBarContainer: {
    alignItems: 'center',
  },
});

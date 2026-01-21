import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { StatusBadge } from './StatusBadge';
import { VisitStatus } from '../models';
import { HapticFeedback } from '@/services';

interface SwipeableVisitCardProps {
  time: string;
  clientName: string;
  serviceType?: string;
  status: VisitStatus;
  location?: string;
  onPress?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}

/**
 * Swipeable Visit Card Component
 * 
 * Swipe left to reveal: Check In/Out, Edit
 * Swipe right to reveal: Cancel
 */
export function SwipeableVisitCard({
  time,
  clientName,
  serviceType,
  status,
  location,
  onPress,
  onCheckIn,
  onCheckOut,
  onEdit,
  onCancel,
}: SwipeableVisitCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const swipeableRef = useRef<Swipeable>(null);

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const handleCheckIn = () => {
    HapticFeedback.checkIn();
    closeSwipeable();
    onCheckIn?.();
  };

  const handleCheckOut = () => {
    HapticFeedback.checkOut();
    closeSwipeable();
    onCheckOut?.();
  };

  const handleEdit = () => {
    HapticFeedback.selection();
    closeSwipeable();
    onEdit?.();
  };

  const handleCancel = () => {
    HapticFeedback.warning();
    closeSwipeable();
    onCancel?.();
  };

  /**
   * Render right swipe actions (Check In/Out, Edit)
   */
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const showCheckIn = status === 'scheduled';
    const showCheckOut = status === 'in-progress';

    // Action widths
    const actionWidth = 75;
    const totalWidth = (showCheckIn || showCheckOut ? actionWidth : 0) + actionWidth;

    return (
      <View style={styles.rightActionsContainer}>
        {(showCheckIn || showCheckOut) && (
          <Animated.View
            style={[
              styles.actionButton,
              showCheckIn ? styles.checkInButton : styles.checkOutButton,
              {
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [totalWidth, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionTouchable}
              onPress={showCheckIn ? handleCheckIn : handleCheckOut}
            >
              <FontAwesome
                name={showCheckIn ? 'sign-in' : 'sign-out'}
                size={20}
                color="#fff"
              />
              <Text style={styles.actionText}>
                {showCheckIn ? 'Check In' : 'Check Out'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.actionButton,
            styles.editButton,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [actionWidth, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.actionTouchable} onPress={handleEdit}>
            <FontAwesome name="pencil" size={20} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  /**
   * Render left swipe actions (Cancel)
   */
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    // Only show cancel for scheduled or in-progress visits
    if (status === 'completed' || status === 'cancelled') {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.actionButton,
          styles.cancelButton,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-75, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity style={styles.actionTouchable} onPress={handleCancel}>
          <FontAwesome name="times" size={20} color="#fff" />
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={40}
      leftThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      onSwipeableOpen={() => HapticFeedback.light()}
    >
      <TouchableOpacity
        style={[styles.card, isDark && styles.cardDark]}
        onPress={() => {
          HapticFeedback.selection();
          onPress?.();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.timeContainer}>
          <Text style={[styles.time, isDark && styles.timeDark]}>{time}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.clientName, isDark && styles.clientNameDark]} numberOfLines={1}>
              {clientName}
            </Text>
            <StatusBadge status={status} />
          </View>

          {serviceType && (
            <Text style={[styles.serviceType, isDark && styles.serviceTypeDark]}>
              {serviceType}
            </Text>
          )}

          {location && (
            <View style={styles.locationRow}>
              <FontAwesome name="map-marker" size={12} color={isDark ? '#888' : '#666'} />
              <Text style={[styles.location, isDark && styles.locationDark]} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </View>

        <FontAwesome name="chevron-right" size={16} color={isDark ? '#555' : '#ccc'} />
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  timeContainer: {
    width: 60,
    alignItems: 'center',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeDark: {
    color: '#e0e0e0',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  clientNameDark: {
    color: '#e0e0e0',
  },
  serviceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceTypeDark: {
    color: '#999',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  locationDark: {
    color: '#888',
  },
  // Action button styles
  rightActionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    fontWeight: '500',
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkOutButton: {
    backgroundColor: '#FF9800',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
});

export default SwipeableVisitCard;

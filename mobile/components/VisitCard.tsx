import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from './Themed';
import { StatusBadge } from './StatusBadge';
import { VisitStatus } from '../models';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface VisitCardProps {
  time: string;
  clientName: string;
  serviceType?: string;
  status: VisitStatus;
  location?: string;
  onPress?: () => void;
}

export function VisitCard({
  time,
  clientName,
  serviceType,
  status,
  location,
  onPress,
}: VisitCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{time}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.clientName} numberOfLines={1}>
            {clientName}
          </Text>
          <StatusBadge status={status} />
        </View>

        {serviceType && (
          <Text style={styles.serviceType}>{serviceType}</Text>
        )}

        {location && (
          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={12} color="#666" />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>

      <FontAwesome name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  serviceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
});

export default VisitCard;

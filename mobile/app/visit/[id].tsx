import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useClients, usePets } from '@/hooks';
import { VisitRecord, VisitStatus, Client, Pet, CalendarEvent } from '@/models';

/**
 * Format time from ISO string
 */
function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date/time for display
 */
function formatDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate duration between two times
 */
function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return 'N/A';
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const minutes = Math.round((endTime - startTime) / 60000);

  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Mock event data - in production, this would be passed from navigation or fetched
 */
function getMockEvent(eventId: string): CalendarEvent {
  const today = new Date();
  const baseDate = today.toISOString().split('T')[0];

  const mockEvents: Record<string, CalendarEvent> = {
    mock_1: {
      id: 'mock_1',
      calendarId: 'work',
      title: 'Morning Drop-in - Max & Bella',
      clientName: 'Johnson Family',
      location: '123 Oak Street',
      start: `${baseDate}T08:00:00`,
      end: `${baseDate}T08:30:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: { type: 'drop-in', duration: 30, petName: 'Max & Bella' },
    },
    mock_2: {
      id: 'mock_2',
      calendarId: 'work',
      title: 'Walk - Luna',
      clientName: 'Smith Residence',
      location: '456 Maple Ave',
      start: `${baseDate}T10:00:00`,
      end: `${baseDate}T11:00:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: { type: 'walk', duration: 60, petName: 'Luna' },
    },
    mock_3: {
      id: 'mock_3',
      calendarId: 'work',
      title: 'Afternoon Drop-in - Whiskers',
      clientName: 'Garcia Home',
      location: '789 Pine Lane',
      start: `${baseDate}T14:00:00`,
      end: `${baseDate}T14:30:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: { type: 'drop-in', duration: 30, petName: 'Whiskers' },
    },
    mock_4: {
      id: 'mock_4',
      calendarId: 'work',
      title: 'Evening Visit - Charlie',
      clientName: 'Williams Family',
      location: '321 Elm Court',
      start: `${baseDate}T18:00:00`,
      end: `${baseDate}T19:00:00`,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      serviceInfo: { type: 'drop-in', duration: 60, petName: 'Charlie' },
    },
  };

  return mockEvents[eventId] || mockEvents.mock_1;
}

export default function VisitDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const { getById, checkIn, checkOut, updateNotes, markSummarySent } = useVisitRecords();
  const { clients, getById: getClientById } = useClients();
  const { pets, getByClientId } = usePets();

  const [visitRecord, setVisitRecord] = useState<VisitRecord | null>(null);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /**
   * Load visit data
   */
  const loadData = useCallback(async () => {
    try {
      if (id) {
        const record = getById(id);
        if (record) {
          setVisitRecord(record);
          setNotes(record.notes || '');

          // Load client if linked
          if (record.clientId) {
            const linkedClient = getClientById(record.clientId);
            if (linkedClient) {
              setClient(linkedClient);
              setClientPets(getByClientId(record.clientId));
            }
          }
        }
      }

      // Load event data
      if (eventId) {
        const eventData = getMockEvent(eventId);
        setEvent(eventData);
      }
    } catch (error) {
      console.error('Error loading visit data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, eventId, getById, getClientById, getByClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle check-in
   */
  const handleCheckIn = async () => {
    if (!visitRecord) return;
    setSaving(true);
    try {
      const updated = await checkIn(visitRecord.id);
      if (updated) setVisitRecord(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle check-out
   */
  const handleCheckOut = async () => {
    if (!visitRecord) return;
    setSaving(true);
    try {
      const updated = await checkOut(visitRecord.id, notes);
      if (updated) setVisitRecord(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to check out. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle save notes
   */
  const handleSaveNotes = async () => {
    if (!visitRecord) return;
    setSaving(true);
    try {
      const updated = await updateNotes(visitRecord.id, notes);
      if (updated) {
        setVisitRecord(updated);
        Alert.alert('Saved', 'Notes saved successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Generate and copy visit summary
   */
  const handleGenerateSummary = async () => {
    if (!event || !visitRecord) return;

    const summary = generateVisitSummary(event, visitRecord, client, clientPets);

    try {
      await Clipboard.setStringAsync(summary);
      
      if (visitRecord) {
        await markSummarySent(visitRecord.id);
      }

      Alert.alert(
        'Summary Copied',
        'The visit summary has been copied to your clipboard.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy summary. Please try again.');
    }
  };

  /**
   * Generate visit summary text
   */
  const generateVisitSummary = (
    event: CalendarEvent,
    visit: VisitRecord,
    client: Client | null,
    pets: Pet[]
  ): string => {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════');
    lines.push('       VISIT SUMMARY');
    lines.push('═══════════════════════════════════');
    lines.push('');

    // Client Info
    lines.push(`Client: ${client?.name || event.clientName || 'Unknown'}`);
    if (event.location) {
      lines.push(`Location: ${event.location}`);
    }
    lines.push('');

    // Visit Details
    lines.push('VISIT DETAILS');
    lines.push('-----------------------------------');
    lines.push(`Service: ${event.serviceInfo?.type || 'Visit'}`);
    lines.push(`Scheduled: ${formatTime(event.start)} - ${formatTime(event.end)}`);

    if (visit.checkInAt) {
      lines.push(`Check-in: ${formatDateTime(visit.checkInAt)}`);
    }
    if (visit.checkOutAt) {
      lines.push(`Check-out: ${formatDateTime(visit.checkOutAt)}`);
      lines.push(`Duration: ${calculateDuration(visit.checkInAt, visit.checkOutAt)}`);
    }
    lines.push('');

    // Pets
    if (pets.length > 0 || event.serviceInfo?.petName) {
      lines.push('PETS');
      lines.push('-----------------------------------');
      if (pets.length > 0) {
        pets.forEach(pet => {
          lines.push(`• ${pet.name} (${pet.species}${pet.breed ? ` - ${pet.breed}` : ''})`);
        });
      } else if (event.serviceInfo?.petName) {
        lines.push(`• ${event.serviceInfo.petName}`);
      }
      lines.push('');
    }

    // Notes
    if (visit.notes) {
      lines.push('NOTES');
      lines.push('-----------------------------------');
      lines.push(visit.notes);
      lines.push('');
    }

    lines.push('═══════════════════════════════════');
    lines.push(`Generated: ${new Date().toLocaleString()}`);

    return lines.join('\n');
  };

  if (loading) {
    return <LoadingState message="Loading visit details..." />;
  }

  if (!visitRecord || !event) {
    return (
      <ThemedView style={styles.container}>
        <Text>Visit not found</Text>
      </ThemedView>
    );
  }

  const status = visitRecord.status;
  const canCheckIn = status === 'scheduled';
  const canCheckOut = status === 'in-progress';
  const isCompleted = status === 'completed';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Visit Details',
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <StatusBadge status={status} style={styles.statusBadge} />
            {visitRecord.checkInAt && (
              <Text style={styles.timeInfo}>
                Checked in: {formatDateTime(visitRecord.checkInAt)}
              </Text>
            )}
            {visitRecord.checkOutAt && (
              <Text style={styles.timeInfo}>
                Checked out: {formatDateTime(visitRecord.checkOutAt)}
              </Text>
            )}
          </View>

          {/* Event Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="calendar" size={20} color="#2196F3" />
              <Text style={styles.cardTitle}>Visit Info</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>
                {client?.name || event.clientName || 'Unknown'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Service</Text>
              <Text style={styles.infoValue}>
                {event.serviceInfo?.type || 'Visit'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {formatTime(event.start)} - {formatTime(event.end)}
              </Text>
            </View>

            {event.location && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
            )}

            {event.serviceInfo?.petName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pets</Text>
                <Text style={styles.infoValue}>{event.serviceInfo.petName}</Text>
              </View>
            )}
          </View>

          {/* Notes Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="pencil" size={20} color="#2196F3" />
              <Text style={styles.cardTitle}>Visit Notes</Text>
            </View>

            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={6}
              placeholder="Add notes about this visit..."
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />

            {notes !== (visitRecord.notes || '') && (
              <Button
                title="Save Notes"
                onPress={handleSaveNotes}
                variant="outline"
                size="small"
                loading={saving}
                style={styles.saveNotesButton}
              />
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            {canCheckIn && (
              <Button
                title="Start Visit"
                onPress={handleCheckIn}
                variant="success"
                size="large"
                loading={saving}
                style={styles.actionButton}
              />
            )}

            {canCheckOut && (
              <Button
                title="Complete Visit"
                onPress={handleCheckOut}
                variant="success"
                size="large"
                loading={saving}
                style={styles.actionButton}
              />
            )}

            {isCompleted && (
              <Button
                title="Generate Summary"
                onPress={handleGenerateSummary}
                variant="primary"
                size="large"
                style={styles.actionButton}
              />
            )}
          </View>

          {/* Duration info for completed visits */}
          {isCompleted && visitRecord.checkInAt && visitRecord.checkOutAt && (
            <View style={styles.durationCard}>
              <Text style={styles.durationLabel}>Actual Duration</Text>
              <Text style={styles.durationValue}>
                {calculateDuration(visitRecord.checkInAt, visitRecord.checkOutAt)}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  statusBanner: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusBadge: {
    marginBottom: 8,
  },
  timeInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  saveNotesButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  actionsCard: {
    margin: 16,
    marginBottom: 0,
  },
  actionButton: {
    marginBottom: 12,
  },
  durationCard: {
    backgroundColor: '#E8F5E9',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/EmptyState';
import { useVisitRecords, useClients, usePets, useEventClientMapping, useSettings } from '@/hooks';
import { VisitRecord, Client, Pet, CalendarEvent } from '@/models';

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return 'N/A';
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getMockEvent(eventId: string): CalendarEvent {
  const baseDate = new Date().toISOString().split('T')[0];
  const mockEvents: Record<string, CalendarEvent> = {
    mock_1: { id: 'mock_1', calendarId: 'work', title: 'Morning Drop-in - Max & Bella', clientName: 'Johnson Family', location: '123 Oak Street', start: `${baseDate}T08:00:00`, end: `${baseDate}T08:30:00`, allDay: false, status: 'confirmed', isWorkEvent: true, serviceInfo: { type: 'drop-in', duration: 30, petName: 'Max & Bella' } },
    mock_2: { id: 'mock_2', calendarId: 'work', title: 'Walk - Luna', clientName: 'Smith Residence', location: '456 Maple Ave', start: `${baseDate}T10:00:00`, end: `${baseDate}T11:00:00`, allDay: false, status: 'confirmed', isWorkEvent: true, serviceInfo: { type: 'walk', duration: 60, petName: 'Luna' } },
    mock_3: { id: 'mock_3', calendarId: 'work', title: 'Afternoon Drop-in - Whiskers', clientName: 'Garcia Home', location: '789 Pine Lane', start: `${baseDate}T14:00:00`, end: `${baseDate}T14:30:00`, allDay: false, status: 'confirmed', isWorkEvent: true, serviceInfo: { type: 'drop-in', duration: 30, petName: 'Whiskers' } },
    mock_4: { id: 'mock_4', calendarId: 'work', title: 'Evening Visit - Charlie', clientName: 'Williams Family', location: '321 Elm Court', start: `${baseDate}T18:00:00`, end: `${baseDate}T19:00:00`, allDay: false, status: 'confirmed', isWorkEvent: true, serviceInfo: { type: 'drop-in', duration: 60, petName: 'Charlie' } },
  };
  return mockEvents[eventId] || mockEvents.mock_1;
}

function ClientPickerModal({ visible, clients, selectedClientId, onSelect, onClose }: { visible: boolean; clients: Client[]; selectedClientId?: string; onSelect: (client: Client | null) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Select Client</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}><FontAwesome name="times" size={20} color="#666" /></TouchableOpacity>
        </View>
        <ScrollView style={modalStyles.list}>
          <TouchableOpacity style={[modalStyles.item, !selectedClientId && modalStyles.itemSelected]} onPress={() => { onSelect(null); onClose(); }}>
            <FontAwesome name="unlink" size={16} color={!selectedClientId ? '#2196F3' : '#999'} />
            <Text style={[modalStyles.itemText, !selectedClientId && modalStyles.itemTextSelected]}>No client linked</Text>
            {!selectedClientId && <FontAwesome name="check" size={16} color="#2196F3" />}
          </TouchableOpacity>
          {clients.map(client => (
            <TouchableOpacity key={client.id} style={[modalStyles.item, selectedClientId === client.id && modalStyles.itemSelected]} onPress={() => { onSelect(client); onClose(); }}>
              <FontAwesome name="user" size={16} color={selectedClientId === client.id ? '#2196F3' : '#666'} />
              <View style={modalStyles.itemContent}>
                <Text style={[modalStyles.itemText, selectedClientId === client.id && modalStyles.itemTextSelected]}>{client.name}</Text>
                {client.address && <Text style={modalStyles.itemSubtext}>{client.address}</Text>}
              </View>
              {selectedClientId === client.id && <FontAwesome name="check" size={16} color="#2196F3" />}
            </TouchableOpacity>
          ))}
          {clients.length === 0 && <View style={modalStyles.emptyState}><FontAwesome name="users" size={40} color="#ccc" /><Text style={modalStyles.emptyText}>No clients yet</Text><Text style={modalStyles.emptySubtext}>Add clients in the Clients tab</Text></View>}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PetCheckbox({ pet, selected, onToggle }: { pet: Pet; selected: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={checkboxStyles.container} onPress={onToggle}>
      <View style={[checkboxStyles.checkbox, selected && checkboxStyles.checkboxSelected]}>{selected && <FontAwesome name="check" size={12} color="#fff" />}</View>
      <View style={checkboxStyles.content}><Text style={checkboxStyles.name}>{pet.name}</Text><Text style={checkboxStyles.details}>{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</Text></View>
    </TouchableOpacity>
  );
}

export default function VisitDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const { getById, checkIn, checkOut, updateNotes, markSummarySent, update } = useVisitRecords();
  const { clients, getById: getClientById } = useClients();
  const { getByClientId } = usePets();
  const { setMapping, getClientId: getMappedClientId } = useEventClientMapping();
  const { settings } = useSettings();

  const [visitRecord, setVisitRecord] = useState<VisitRecord | null>(null);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (id) {
        const record = getById(id);
        if (record) {
          setVisitRecord(record);
          setNotes(record.notes || '');
          setSelectedPetIds(record.petIds || []);
          if (record.clientId) {
            const linkedClient = getClientById(record.clientId);
            if (linkedClient) { setClient(linkedClient); setClientPets(getByClientId(record.clientId)); }
          }
        }
      }
      if (eventId) {
        const eventData = getMockEvent(eventId);
        setEvent(eventData);
        if (!visitRecord?.clientId && eventData.clientName) {
          const mappedClientId = await getMappedClientId(eventData.clientName);
          if (mappedClientId) {
            const mappedClient = getClientById(mappedClientId);
            if (mappedClient) { setClient(mappedClient); setClientPets(getByClientId(mappedClientId)); }
          }
        }
      }
    } catch (error) { console.error('Error loading visit data:', error); }
    finally { setLoading(false); }
  }, [id, eventId, getById, getClientById, getByClientId, getMappedClientId, visitRecord?.clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClientSelect = async (selectedClient: Client | null) => {
    if (!visitRecord) return;
    setSaving(true);
    try {
      const updated = await update({ id: visitRecord.id, clientId: selectedClient?.id, petIds: [] });
      if (updated) {
        setVisitRecord(updated); setClient(selectedClient); setSelectedPetIds([]);
        if (selectedClient) { setClientPets(getByClientId(selectedClient.id)); if (event?.clientName) await setMapping(event.clientName, selectedClient.id); }
        else setClientPets([]);
      }
    } catch { Alert.alert('Error', 'Failed to link client.'); }
    finally { setSaving(false); }
  };

  const handlePetToggle = async (petId: string) => {
    if (!visitRecord) return;
    const newPetIds = selectedPetIds.includes(petId) ? selectedPetIds.filter(i => i !== petId) : [...selectedPetIds, petId];
    setSelectedPetIds(newPetIds);
    try { const updated = await update({ id: visitRecord.id, petIds: newPetIds }); if (updated) setVisitRecord(updated); }
    catch (error) { console.error('Error updating pets:', error); }
  };

  const handleCheckIn = async () => { if (!visitRecord) return; setSaving(true); try { const updated = await checkIn(visitRecord.id); if (updated) setVisitRecord(updated); } catch { Alert.alert('Error', 'Failed to check in.'); } finally { setSaving(false); } };
  const handleCheckOut = async () => { if (!visitRecord) return; setSaving(true); try { const updated = await checkOut(visitRecord.id, notes); if (updated) setVisitRecord(updated); } catch { Alert.alert('Error', 'Failed to check out.'); } finally { setSaving(false); } };
  const handleSaveNotes = async () => { if (!visitRecord) return; setSaving(true); try { const updated = await updateNotes(visitRecord.id, notes); if (updated) { setVisitRecord(updated); Alert.alert('Saved', 'Notes saved.'); } } catch { Alert.alert('Error', 'Failed to save notes.'); } finally { setSaving(false); } };

  const handleGenerateSummary = async () => {
    if (!event || !visitRecord) return;
    const summaryPets = clientPets.filter(p => selectedPetIds.includes(p.id));
    const lines: string[] = ['═══════════════════════════════════', '       VISIT SUMMARY', '═══════════════════════════════════', '', `Client: ${client?.name || event.clientName || 'Unknown'}`];
    if (event.location) lines.push(`Location: ${event.location}`);
    lines.push('', 'VISIT DETAILS', '-----------------------------------', `Service: ${event.serviceInfo?.type || 'Visit'}`, `Scheduled: ${formatTime(event.start)} - ${formatTime(event.end)}`);
    if (settings.includeTimestampsInSummary) { if (visitRecord.checkInAt) lines.push(`Check-in: ${formatDateTime(visitRecord.checkInAt)}`); if (visitRecord.checkOutAt) lines.push(`Check-out: ${formatDateTime(visitRecord.checkOutAt)}`); }
    if (settings.includeDurationInSummary && visitRecord.checkInAt && visitRecord.checkOutAt) lines.push(`Duration: ${calculateDuration(visitRecord.checkInAt, visitRecord.checkOutAt)}`);
    lines.push('');
    if (settings.includePetDetailsInSummary && (summaryPets.length > 0 || event.serviceInfo?.petName)) {
      lines.push('PETS', '-----------------------------------');
      if (summaryPets.length > 0) summaryPets.forEach(pet => { lines.push(`• ${pet.name} (${pet.species}${pet.breed ? ` - ${pet.breed}` : ''})`); if (pet.careNotes) lines.push(`  Care notes: ${pet.careNotes}`); });
      else if (event.serviceInfo?.petName) lines.push(`• ${event.serviceInfo.petName}`);
      lines.push('');
    }
    if (visitRecord.notes) lines.push('NOTES', '-----------------------------------', visitRecord.notes, '');
    lines.push('═══════════════════════════════════', `Generated: ${new Date().toLocaleString()}`);
    try { await Clipboard.setStringAsync(lines.join('\n')); await markSummarySent(visitRecord.id); Alert.alert('Summary Copied', 'The visit summary has been copied to your clipboard.'); }
    catch { Alert.alert('Error', 'Failed to copy summary.'); }
  };

  if (loading) return <LoadingState message="Loading visit details..." />;
  if (!visitRecord || !event) return <ThemedView style={styles.container}><Text>Visit not found</Text></ThemedView>;

  const status = visitRecord.status, canCheckIn = status === 'scheduled', canCheckOut = status === 'in-progress', isCompleted = status === 'completed';

  return (
    <>
      <Stack.Screen options={{ title: 'Visit Details', headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.statusBanner}>
            <StatusBadge status={status} style={styles.statusBadge} />
            {visitRecord.checkInAt && <Text style={styles.timeInfo}>Checked in: {formatDateTime(visitRecord.checkInAt)}</Text>}
            {visitRecord.checkOutAt && <Text style={styles.timeInfo}>Checked out: {formatDateTime(visitRecord.checkOutAt)}</Text>}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}><FontAwesome name="calendar" size={20} color="#2196F3" /><Text style={styles.cardTitle}>Visit Info</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Service</Text><Text style={styles.infoValue}>{event.serviceInfo?.type || 'Visit'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Time</Text><Text style={styles.infoValue}>{formatTime(event.start)} - {formatTime(event.end)}</Text></View>
            {event.location && <View style={styles.infoRow}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{event.location}</Text></View>}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}><FontAwesome name="user" size={20} color="#2196F3" /><Text style={styles.cardTitle}>Client</Text></View>
            <TouchableOpacity style={styles.clientSelector} onPress={() => setShowClientPicker(true)}>
              {client ? <View style={styles.clientInfo}><Text style={styles.clientName}>{client.name}</Text>{client.address && <Text style={styles.clientAddress}>{client.address}</Text>}</View>
                : <View style={styles.clientInfo}><Text style={styles.clientNameUnlinked}>{event.clientName || 'No client linked'}</Text><Text style={styles.linkPrompt}>Tap to link to a client</Text></View>}
              <FontAwesome name="chevron-right" size={14} color="#999" />
            </TouchableOpacity>
            {client && event.clientName && client.name !== event.clientName && <View style={styles.mappingNote}><FontAwesome name="link" size={12} color="#666" /><Text style={styles.mappingNoteText}>Calendar: "{event.clientName}"</Text></View>}
          </View>

          {client && clientPets.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}><FontAwesome name="paw" size={20} color="#2196F3" /><Text style={styles.cardTitle}>Pets on this visit</Text></View>
              {clientPets.map(pet => <PetCheckbox key={pet.id} pet={pet} selected={selectedPetIds.includes(pet.id)} onToggle={() => handlePetToggle(pet.id)} />)}
              {selectedPetIds.length === 0 && <Text style={styles.noPetsSelected}>Select the pets included in this visit</Text>}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}><FontAwesome name="pencil" size={20} color="#2196F3" /><Text style={styles.cardTitle}>Visit Notes</Text></View>
            <TextInput style={styles.notesInput} multiline numberOfLines={6} placeholder="Add notes about this visit..." value={notes} onChangeText={setNotes} textAlignVertical="top" />
            {notes !== (visitRecord.notes || '') && <Button title="Save Notes" onPress={handleSaveNotes} variant="outline" size="small" loading={saving} style={styles.saveNotesButton} />}
          </View>

          <View style={styles.actionsCard}>
            {canCheckIn && <Button title="Start Visit" onPress={handleCheckIn} variant="success" size="large" loading={saving} style={styles.actionButton} />}
            {canCheckOut && <Button title="Complete Visit" onPress={handleCheckOut} variant="success" size="large" loading={saving} style={styles.actionButton} />}
            {isCompleted && <Button title="Generate Summary" onPress={handleGenerateSummary} variant="primary" size="large" style={styles.actionButton} />}
          </View>

          {isCompleted && visitRecord.checkInAt && visitRecord.checkOutAt && <View style={styles.durationCard}><Text style={styles.durationLabel}>Actual Duration</Text><Text style={styles.durationValue}>{calculateDuration(visitRecord.checkInAt, visitRecord.checkOutAt)}</Text></View>}
        </ScrollView>
      </KeyboardAvoidingView>
      <ClientPickerModal visible={showClientPicker} clients={clients} selectedClientId={client?.id} onSelect={handleClientSelect} onClose={() => setShowClientPicker(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  statusBanner: { backgroundColor: '#fff', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusBadge: { marginBottom: 8 },
  timeInfo: { fontSize: 12, color: '#666', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: 10, color: '#333' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#333', flex: 1, textAlign: 'right' },
  clientSelector: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#333' },
  clientNameUnlinked: { fontSize: 16, color: '#666' },
  clientAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  linkPrompt: { fontSize: 12, color: '#2196F3', marginTop: 2 },
  mappingNote: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 6, gap: 6 },
  mappingNoteText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  noPetsSelected: { textAlign: 'center', color: '#999', fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  notesInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 120, fontSize: 14, backgroundColor: '#fafafa' },
  saveNotesButton: { marginTop: 12, alignSelf: 'flex-end' },
  actionsCard: { margin: 16, marginBottom: 0 },
  actionButton: { marginBottom: 12 },
  durationCard: { backgroundColor: '#E8F5E9', margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  durationLabel: { fontSize: 12, color: '#2E7D32', marginBottom: 4 },
  durationValue: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  closeButton: { padding: 8 },
  list: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  itemSelected: { backgroundColor: '#E3F2FD' },
  itemContent: { flex: 1 },
  itemText: { fontSize: 16, color: '#333' },
  itemTextSelected: { color: '#2196F3', fontWeight: '600' },
  itemSubtext: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 4 },
});

const checkboxStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  content: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: '#333' },
  details: { fontSize: 13, color: '#666', marginTop: 2 },
});

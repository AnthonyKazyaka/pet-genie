import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  useColorScheme,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { useTemplates, useClients, useCalendarEvents } from '@/hooks';
import { Template } from '@/models';
import { TEMPLATE_TYPE_COLORS, TEMPLATE_TYPE_LABELS } from '@/models/template.model';
import {
  MultiEventConfig,
  BookingType,
  VisitSlot,
  OvernightConfig,
  generateMultiEvents,
  detectConflicts,
  getMultiEventSummary,
  GeneratedEvent,
} from '@/services/multi-event.service';
import { HapticFeedback } from '@/services';

interface MultiEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventsGenerated?: (events: GeneratedEvent[]) => void;
}

/**
 * Format time for display
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Time presets for quick selection
 */
const TIME_PRESETS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

/**
 * Duration presets
 */
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/**
 * Visit Slot Editor Component
 */
function VisitSlotEditor({
  slot,
  templates,
  onUpdate,
  onRemove,
  isDark,
}: {
  slot: VisitSlot;
  templates: Template[];
  onUpdate: (updated: VisitSlot) => void;
  onRemove: () => void;
  isDark: boolean;
}) {
  const template = templates.find(t => t.id === slot.templateId);
  const typeColor = template ? TEMPLATE_TYPE_COLORS[template.type] : '#607D8B';

  return (
    <View style={[styles.slotCard, isDark && styles.slotCardDark]}>
      <View style={styles.slotHeader}>
        <View style={[styles.slotColorBar, { backgroundColor: typeColor }]} />
        <View style={styles.slotInfo}>
          <Text style={[styles.slotTemplate, isDark && styles.slotTemplateDark]}>
            {template?.name || 'Select Template'}
          </Text>
          <Text style={[styles.slotTime, isDark && styles.slotTimeDark]}>
            {formatTime(slot.time)} • {formatDuration(slot.duration)}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <FontAwesome name="times" size={16} color={isDark ? '#EF4444' : '#DC2626'} />
        </TouchableOpacity>
      </View>

      {/* Template Selector */}
      <View style={styles.slotField}>
        <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Template</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {templates.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.templateChip,
                  slot.templateId === t.id && styles.templateChipSelected,
                  { borderColor: TEMPLATE_TYPE_COLORS[t.type] },
                ]}
                onPress={() => onUpdate({ ...slot, templateId: t.id, duration: t.duration })}
              >
                <Text style={styles.templateChipIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.templateChipText,
                    slot.templateId === t.id && styles.templateChipTextSelected,
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Time Selector */}
      <View style={styles.slotField}>
        <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeChips}>
            {TIME_PRESETS.map(time => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  slot.time === time && styles.timeChipSelected,
                  isDark && styles.timeChipDark,
                ]}
                onPress={() => onUpdate({ ...slot, time })}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    slot.time === time && styles.timeChipTextSelected,
                  ]}
                >
                  {formatTime(time)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Duration Selector */}
      <View style={styles.slotField}>
        <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Duration</Text>
        <View style={styles.durationChips}>
          {DURATION_PRESETS.map(duration => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.durationChip,
                slot.duration === duration && styles.durationChipSelected,
                isDark && styles.durationChipDark,
              ]}
              onPress={() => onUpdate({ ...slot, duration })}
            >
              <Text
                style={[
                  styles.durationChipText,
                  slot.duration === duration && styles.durationChipTextSelected,
                ]}
              >
                {formatDuration(duration)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Multi-Event Modal Component
 * Allows users to create multiple events at once (recurring visits)
 */
export function MultiEventModal({
  visible,
  onClose,
  onEventsGenerated,
}: MultiEventModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { templates } = useTemplates();
  const { clients } = useClients();
  
  // Get date range for fetching events (next 30 days for conflict detection)
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return { start, end };
  }, []);
  const { events: existingEvents } = useCalendarEvents(dateRange);

  // Form state
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [bookingType, setBookingType] = useState<BookingType>('daily-visits');
  const [visits, setVisits] = useState<VisitSlot[]>([]);
  const [weekendVisits, setWeekendVisits] = useState<VisitSlot[]>([]);
  const [useWeekendSlots, setUseWeekendSlots] = useState(false);
  const [overnightConfig, setOvernightConfig] = useState<OvernightConfig | undefined>();

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [generatedEvents, setGeneratedEvents] = useState<GeneratedEvent[]>([]);
  const [conflicts, setConflicts] = useState<GeneratedEvent[]>([]);

  /**
   * Add a new visit slot
   */
  const addVisitSlot = useCallback((isWeekend: boolean = false) => {
    HapticFeedback.selection();
    const defaultTemplate = templates[0];
    const newSlot: VisitSlot = {
      templateId: defaultTemplate?.id || '',
      time: '09:00',
      duration: defaultTemplate?.duration || 30,
    };
    if (isWeekend) {
      setWeekendVisits(prev => [...prev, newSlot]);
    } else {
      setVisits(prev => [...prev, newSlot]);
    }
  }, [templates]);

  /**
   * Update a visit slot
   */
  const updateVisitSlot = useCallback((index: number, updated: VisitSlot, isWeekend: boolean = false) => {
    if (isWeekend) {
      setWeekendVisits(prev => prev.map((s, i) => i === index ? updated : s));
    } else {
      setVisits(prev => prev.map((s, i) => i === index ? updated : s));
    }
  }, []);

  /**
   * Remove a visit slot
   */
  const removeVisitSlot = useCallback((index: number, isWeekend: boolean = false) => {
    HapticFeedback.selection();
    if (isWeekend) {
      setWeekendVisits(prev => prev.filter((_, i) => i !== index));
    } else {
      setVisits(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  /**
   * Generate preview
   */
  const handleGeneratePreview = useCallback(() => {
    HapticFeedback.selection();
    
    const config: MultiEventConfig = {
      clientName,
      location,
      startDate,
      endDate,
      bookingType,
      visits,
      weekendVisits: useWeekendSlots ? weekendVisits : undefined,
      overnightConfig,
    };

    try {
      const events = generateMultiEvents(config, templates);
      setGeneratedEvents(events);
      
      const conflictingEvents = detectConflicts(existingEvents || [], events);
      setConflicts(conflictingEvents);
      
      setShowPreview(true);
    } catch (error: any) {
      Alert.alert('Validation Error', error.message);
    }
  }, [clientName, location, startDate, endDate, bookingType, visits, weekendVisits, useWeekendSlots, overnightConfig, templates, existingEvents]);

  /**
   * Confirm and create events
   */
  const handleConfirm = useCallback(() => {
    HapticFeedback.success();
    onEventsGenerated?.(generatedEvents);
    
    // Reset form
    setClientName('');
    setLocation('');
    setVisits([]);
    setWeekendVisits([]);
    setGeneratedEvents([]);
    setConflicts([]);
    setShowPreview(false);
    onClose();
    
    Alert.alert(
      'Events Created',
      `${generatedEvents.length} events have been generated. Note: These events are saved locally and not synced to Google Calendar.`,
      [{ text: 'OK' }]
    );
  }, [generatedEvents, onEventsGenerated, onClose]);

  // Summary of generated events
  const summary = useMemo(() => {
    if (!generatedEvents.length) return null;
    return getMultiEventSummary(generatedEvents);
  }, [generatedEvents]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return clientName.trim().length > 0 && visits.length > 0;
  }, [clientName, visits]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <FontAwesome name="times" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            {showPreview ? 'Preview Events' : 'Schedule Multiple Visits'}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={showPreview ? handleConfirm : handleGeneratePreview}
            disabled={!showPreview && !isValid}
          >
            <Text style={[
              styles.headerAction,
              (!showPreview && !isValid) && styles.headerActionDisabled,
            ]}>
              {showPreview ? 'Create' : 'Preview'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPreview ? (
          /* Preview View */
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Summary */}
            <View style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
              <Text style={[styles.summaryTitle, isDark && styles.summaryTitleDark]}>
                Summary
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{summary?.totalEvents}</Text>
                  <Text style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}>Events</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{summary?.totalDays}</Text>
                  <Text style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}>Days</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>
                    {Math.round((summary?.totalMinutes || 0) / 60)}h
                  </Text>
                  <Text style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}>Total</Text>
                </View>
              </View>
            </View>

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <View style={styles.conflictWarning}>
                <FontAwesome name="exclamation-triangle" size={16} color="#F59E0B" />
                <Text style={styles.conflictText}>
                  {conflicts.length} event{conflicts.length > 1 ? 's' : ''} may conflict with existing events
                </Text>
              </View>
            )}

            {/* Event List */}
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Generated Events
            </Text>
            {generatedEvents.map((event, index) => (
              <View key={index} style={[styles.eventPreview, isDark && styles.eventPreviewDark]}>
                <Text style={[styles.eventPreviewTitle, isDark && styles.eventPreviewTitleDark]}>
                  {event.title}
                </Text>
                <Text style={[styles.eventPreviewTime, isDark && styles.eventPreviewTimeDark]}>
                  {event.start.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  {event.start.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {' - '}
                  {event.end.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
            ))}

            {/* Back Button */}
            <TouchableOpacity
              style={[styles.backButton, isDark && styles.backButtonDark]}
              onPress={() => setShowPreview(false)}
            >
              <FontAwesome name="arrow-left" size={16} color="#2563EB" />
              <Text style={styles.backButtonText}>Back to Edit</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Form View */
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Client Name */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Client Name *
              </Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              />
              {clients.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSuggestions}>
                  {clients.slice(0, 5).map(client => (
                    <TouchableOpacity
                      key={client.id}
                      style={[styles.clientChip, isDark && styles.clientChipDark]}
                      onPress={() => {
                        setClientName(client.name);
                        setLocation(client.address || '');
                      }}
                    >
                      <Text style={[styles.clientChipText, isDark && styles.clientChipTextDark]}>
                        {client.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Location */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Location
              </Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location (optional)"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              />
            </View>

            {/* Date Range */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, isDark && styles.dateButtonDark]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <FontAwesome name="calendar" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                  <Text style={[styles.dateButtonText, isDark && styles.dateButtonTextDark]}>
                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>End Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, isDark && styles.dateButtonDark]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <FontAwesome name="calendar" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                  <Text style={[styles.dateButtonText, isDark && styles.dateButtonTextDark]}>
                    {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <SimpleDatePicker
                value={startDate}
                onChange={(date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
                onClose={() => setShowStartPicker(false)}
              />
            )}

            {showEndPicker && (
              <SimpleDatePicker
                value={endDate}
                onChange={(date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
                onClose={() => setShowEndPicker(false)}
              />
            )}

            {/* Visit Slots */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Visit Slots
              </Text>
              <TouchableOpacity onPress={() => addVisitSlot(false)} style={styles.addButton}>
                <FontAwesome name="plus" size={14} color="#2563EB" />
                <Text style={styles.addButtonText}>Add Slot</Text>
              </TouchableOpacity>
            </View>

            {visits.length === 0 ? (
              <View style={[styles.emptySlots, isDark && styles.emptySlotsDark]}>
                <FontAwesome name="clock-o" size={32} color={isDark ? '#4B5563' : '#D1D5DB'} />
                <Text style={[styles.emptySlotsText, isDark && styles.emptySlotsTextDark]}>
                  No visit slots added yet
                </Text>
                <TouchableOpacity onPress={() => addVisitSlot(false)} style={styles.addFirstButton}>
                  <Text style={styles.addFirstButtonText}>Add First Slot</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visits.map((slot, index) => (
                <VisitSlotEditor
                  key={index}
                  slot={slot}
                  templates={templates}
                  onUpdate={(updated) => updateVisitSlot(index, updated, false)}
                  onRemove={() => removeVisitSlot(index, false)}
                  isDark={isDark}
                />
              ))
            )}

            {/* Weekend Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, isDark && styles.toggleLabelDark]}>
                  Different Weekend Schedule
                </Text>
                <Text style={[styles.toggleHint, isDark && styles.toggleHintDark]}>
                  Set separate visit times for weekends
                </Text>
              </View>
              <Switch
                value={useWeekendSlots}
                onValueChange={setUseWeekendSlots}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={useWeekendSlots ? '#2563EB' : '#F3F4F6'}
              />
            </View>

            {/* Weekend Slots */}
            {useWeekendSlots && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                    Weekend Slots
                  </Text>
                  <TouchableOpacity onPress={() => addVisitSlot(true)} style={styles.addButton}>
                    <FontAwesome name="plus" size={14} color="#2563EB" />
                    <Text style={styles.addButtonText}>Add Slot</Text>
                  </TouchableOpacity>
                </View>

                {weekendVisits.length === 0 ? (
                  <View style={[styles.emptySlots, isDark && styles.emptySlotsDark]}>
                    <Text style={[styles.emptySlotsText, isDark && styles.emptySlotsTextDark]}>
                      No weekend slots - weekdays will be used
                    </Text>
                  </View>
                ) : (
                  weekendVisits.map((slot, index) => (
                    <VisitSlotEditor
                      key={index}
                      slot={slot}
                      templates={templates}
                      onUpdate={(updated) => updateVisitSlot(index, updated, true)}
                      onRemove={() => removeVisitSlot(index, true)}
                      isDark={isDark}
                    />
                  ))
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#F3F4F6',
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'right',
  },
  headerActionDisabled: {
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldLabelDark: {
    color: '#D1D5DB',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInputDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    color: '#F3F4F6',
  },
  clientSuggestions: {
    marginTop: 8,
  },
  clientChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  clientChipDark: {
    backgroundColor: '#1E3A5F',
  },
  clientChipText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  clientChipTextDark: {
    color: '#60A5FA',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#111827',
  },
  dateButtonTextDark: {
    color: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitleDark: {
    color: '#F3F4F6',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptySlots: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptySlotsDark: {
    backgroundColor: '#1F2937',
  },
  emptySlotsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emptySlotsTextDark: {
    color: '#9CA3AF',
  },
  addFirstButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  slotCardDark: {
    backgroundColor: '#1F2937',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotTemplate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  slotTemplateDark: {
    color: '#F3F4F6',
  },
  slotTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  slotTimeDark: {
    color: '#9CA3AF',
  },
  removeButton: {
    padding: 8,
  },
  slotField: {
    marginBottom: 12,
  },
  templateChips: {
    flexDirection: 'row',
    gap: 8,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#fff',
    gap: 6,
  },
  templateChipSelected: {
    backgroundColor: '#EFF6FF',
  },
  templateChipIcon: {
    fontSize: 16,
  },
  templateChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  templateChipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  timeChips: {
    flexDirection: 'row',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timeChipDark: {
    backgroundColor: '#374151',
  },
  timeChipSelected: {
    backgroundColor: '#2563EB',
  },
  timeChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: '#fff',
  },
  durationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  durationChipDark: {
    backgroundColor: '#374151',
  },
  durationChipSelected: {
    backgroundColor: '#2563EB',
  },
  durationChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  durationChipTextSelected: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  toggleLabelDark: {
    color: '#F3F4F6',
  },
  toggleHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleHintDark: {
    color: '#9CA3AF',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryCardDark: {
    backgroundColor: '#1F2937',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryTitleDark: {
    color: '#F3F4F6',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryLabelDark: {
    color: '#9CA3AF',
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  conflictText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  eventPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  eventPreviewDark: {
    backgroundColor: '#1F2937',
  },
  eventPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventPreviewTitleDark: {
    color: '#F3F4F6',
  },
  eventPreviewTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  eventPreviewTimeDark: {
    color: '#9CA3AF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
  },
  backButtonDark: {},
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  // SimpleDatePicker styles
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 300,
    maxHeight: 400,
  },
  datePickerContainerDark: {
    backgroundColor: '#1F2937',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerTitleDark: {
    color: '#F3F4F6',
  },
  datePickerMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerMonthTextDark: {
    color: '#F3F4F6',
  },
  datePickerWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  datePickerWeekday: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  datePickerWeekdayText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  datePickerWeekdayTextDark: {
    color: '#9CA3AF',
  },
  datePickerDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  datePickerDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDaySelected: {
    backgroundColor: '#2563EB',
  },
  datePickerDayText: {
    fontSize: 14,
    color: '#111827',
  },
  datePickerDayTextDark: {
    color: '#F3F4F6',
  },
  datePickerDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  datePickerDayTextDisabled: {
    color: '#D1D5DB',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  datePickerCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  datePickerCancelText: {
    fontSize: 15,
    color: '#6B7280',
  },
  datePickerConfirmBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  datePickerConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

/**
 * Simple Date Picker Component
 * A basic calendar picker for selecting dates
 */
interface SimpleDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

function SimpleDatePicker({ value, onChange, onClose }: SimpleDatePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [viewDate, setViewDate] = useState(new Date(value));
  const [selectedDate, setSelectedDate] = useState(new Date(value));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setViewDate(newDate);
  };

  const selectDay = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const confirm = () => {
    onChange(selectedDate);
  };

  const days = getDaysInMonth(viewDate);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <TouchableOpacity
      style={styles.datePickerOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.datePickerContainer, isDark && styles.datePickerContainerDark]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.datePickerHeader}>
          <Text style={[styles.datePickerTitle, isDark && styles.datePickerTitleDark]}>
            Select Date
          </Text>
        </View>

        <View style={styles.datePickerMonthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <FontAwesome name="chevron-left" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
          </TouchableOpacity>
          <Text style={[styles.datePickerMonthText, isDark && styles.datePickerMonthTextDark]}>
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)}>
            <FontAwesome name="chevron-right" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
          </TouchableOpacity>
        </View>

        <View style={styles.datePickerWeekdays}>
          {weekdays.map((day) => (
            <View key={day} style={styles.datePickerWeekday}>
              <Text style={[styles.datePickerWeekdayText, isDark && styles.datePickerWeekdayTextDark]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.datePickerDays}>
          {days.map((day, index) => (
            <View key={index} style={styles.datePickerDay}>
              {day !== null ? (
                <TouchableOpacity
                  style={[
                    styles.datePickerDayInner,
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === viewDate.getMonth() &&
                    selectedDate.getFullYear() === viewDate.getFullYear() &&
                    styles.datePickerDaySelected,
                  ]}
                  onPress={() => selectDay(day)}
                >
                  <Text
                    style={[
                      styles.datePickerDayText,
                      isDark && styles.datePickerDayTextDark,
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === viewDate.getMonth() &&
                      selectedDate.getFullYear() === viewDate.getFullYear() &&
                      styles.datePickerDayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.datePickerActions}>
          <TouchableOpacity style={styles.datePickerCancelBtn} onPress={onClose}>
            <Text style={styles.datePickerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={confirm}>
            <Text style={styles.datePickerConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

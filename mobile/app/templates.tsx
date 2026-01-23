import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { LoadingState, EmptyState } from '@/components/EmptyState';
import { useTemplates } from '@/hooks';
import {
  Template,
  TemplateType,
  CreateTemplateDto,
} from '@/models';
import { TEMPLATE_TYPE_LABELS, TEMPLATE_TYPE_COLORS } from '@/models/template.model';

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Template type options
 */
const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'drop-in', label: 'Drop-In' },
  { value: 'walk', label: 'Walk' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'housesit', label: 'House Sit' },
  { value: 'meet-greet', label: 'Meet & Greet' },
  { value: 'nail-trim', label: 'Nail Trim' },
  { value: 'other', label: 'Other' },
];

/**
 * Duration presets
 */
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 480, 720, 1440];

/**
 * Emoji picker for template icons
 */
const EMOJI_OPTIONS = [
  '🐕', '🐈', '🐾', '🏠', '🏡', '🚶', '🌙', '☀️', '✂️', '👋',
  '💊', '🍽️', '🛁', '🎾', '🦴', '❤️', '⭐', '📝', '🔔', '🎯',
];

/**
 * Template Card Component
 */
function TemplateCard({
  template,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: Template;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const typeColor = TEMPLATE_TYPE_COLORS[template.type] || '#607D8B';

  return (
    <TouchableOpacity style={styles.templateCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.templateIcon}>{template.icon}</Text>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <View style={styles.templateMeta}>
            <View style={[styles.typeTag, { backgroundColor: typeColor }]}>
              <Text style={styles.typeTagText}>
                {TEMPLATE_TYPE_LABELS[template.type]}
              </Text>
            </View>
            <Text style={styles.duration}>{formatDuration(template.duration)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <FontAwesome name="ellipsis-v" size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {template.includeTravel && template.travelBuffer > 0 && (
        <View style={styles.travelInfo}>
          <FontAwesome name="car" size={12} color="#999" />
          <Text style={styles.travelText}>
            +{template.travelBuffer}m travel buffer
          </Text>
        </View>
      )}

      {template.defaultNotes && (
        <Text style={styles.notes} numberOfLines={2}>
          {template.defaultNotes}
        </Text>
      )}

      {/* Action Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onEdit();
              }}
            >
              <FontAwesome name="edit" size={16} color="#2196F3" />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onDuplicate();
              }}
            >
              <FontAwesome name="copy" size={16} color="#4CAF50" />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setShowMenu(false);
                onDelete();
              }}
            >
              <FontAwesome name="trash" size={16} color="#F44336" />
              <Text style={[styles.menuItemText, { color: '#F44336' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

/**
 * Template Edit Modal
 */
function TemplateEditModal({
  visible,
  template,
  onSave,
  onClose,
}: {
  visible: boolean;
  template?: Template;
  onSave: (dto: CreateTemplateDto) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [icon, setIcon] = useState(template?.icon || '🐕');
  const [type, setType] = useState<TemplateType>(template?.type || 'drop-in');
  const [duration, setDuration] = useState(template?.duration || 30);
  const [includeTravel, setIncludeTravel] = useState(template?.includeTravel ?? true);
  const [travelBuffer, setTravelBuffer] = useState(template?.travelBuffer || 15);
  const [notes, setNotes] = useState(template?.defaultNotes || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const isValid = name.trim().length > 0 && duration > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: name.trim(),
      icon,
      type,
      duration,
      includeTravel,
      travelBuffer: includeTravel ? travelBuffer : 0,
      defaultNotes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {template ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={!isValid}>
            <Text style={[styles.modalSave, !isValid && styles.modalSaveDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Icon & Name */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Name & Icon</Text>
            <View style={styles.nameRow}>
              <TouchableOpacity
                style={styles.iconPicker}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Text style={styles.iconPickerText}>{icon}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Template name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Type */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Service Type</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowTypePicker(true)}
            >
              <View style={[styles.typeTag, { backgroundColor: TEMPLATE_TYPE_COLORS[type] }]}>
                <Text style={styles.typeTagText}>{TEMPLATE_TYPE_LABELS[type]}</Text>
              </View>
              <FontAwesome name="chevron-down" size={14} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Duration */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Duration</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowDurationPicker(true)}
            >
              <Text style={styles.selectButtonText}>{formatDuration(duration)}</Text>
              <FontAwesome name="chevron-down" size={14} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Travel Buffer */}
          <View style={styles.formSection}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.formLabel}>Include Travel Buffer</Text>
                <Text style={styles.formHint}>Add extra time for travel</Text>
              </View>
              <Switch
                value={includeTravel}
                onValueChange={setIncludeTravel}
                trackColor={{ false: '#ddd', true: '#81C784' }}
                thumbColor={includeTravel ? '#4CAF50' : '#f4f3f4'}
              />
            </View>
            {includeTravel && (
              <View style={styles.travelBufferRow}>
                {[10, 15, 20, 30].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.travelOption,
                      travelBuffer === mins && styles.travelOptionSelected,
                    ]}
                    onPress={() => setTravelBuffer(mins)}
                  >
                    <Text
                      style={[
                        styles.travelOptionText,
                        travelBuffer === mins && styles.travelOptionTextSelected,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Default Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add default notes for this template"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowEmojiPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Choose Icon</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiOption,
                      icon === emoji && styles.emojiOptionSelected,
                    ]}
                    onPress={() => {
                      setIcon(emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypePicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowTypePicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Service Type</Text>
              {TEMPLATE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={styles.pickerOption}
                  onPress={() => {
                    setType(t.value);
                    setShowTypePicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.typeTag,
                      { backgroundColor: TEMPLATE_TYPE_COLORS[t.value] },
                    ]}
                  >
                    <Text style={styles.typeTagText}>{t.label}</Text>
                  </View>
                  {type === t.value && (
                    <FontAwesome name="check" size={16} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Duration Picker Modal */}
        <Modal
          visible={showDurationPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDurationPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDurationPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Duration</Text>
              <View style={styles.durationGrid}>
                {DURATION_PRESETS.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationOption,
                      duration === mins && styles.durationOptionSelected,
                    ]}
                    onPress={() => {
                      setDuration(mins);
                      setShowDurationPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        duration === mins && styles.durationOptionTextSelected,
                      ]}
                    >
                      {formatDuration(mins)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

/**
 * Templates Screen
 */
export default function TemplatesScreen() {
  const router = useRouter();
  const {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    resetToDefaults,
    refresh,
  } = useTemplates();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query)
      );
    }

    if (selectedType) {
      result = result.filter((t) => t.type === selectedType);
    }

    return result;
  }, [templates, searchQuery, selectedType]);

  /**
   * Refresh handler
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  /**
   * Open create modal
   */
  const handleCreate = () => {
    setEditingTemplate(undefined);
    setEditModalVisible(true);
  };

  /**
   * Open edit modal
   */
  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditModalVisible(true);
  };

  /**
   * Save template (create or update)
   */
  const handleSave = async (dto: CreateTemplateDto) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, dto);
      } else {
        await addTemplate(dto);
      }
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  /**
   * Duplicate template
   */
  const handleDuplicate = async (id: string) => {
    try {
      await duplicateTemplate(id);
    } catch (err) {
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  /**
   * Delete template with confirmation
   */
  const handleDelete = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(template.id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  /**
   * Reset to defaults with confirmation
   */
  const handleReset = () => {
    Alert.alert(
      'Reset Templates',
      'This will remove all custom templates and restore defaults. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetToDefaults,
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Loading templates..." />;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.createButtonText}>New Template</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <FontAwesome name="refresh" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <FontAwesome name="search" size={14} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search templates..."
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilter}
        contentContainerStyle={styles.typeFilterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedType && styles.filterChipSelected]}
          onPress={() => setSelectedType(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              !selectedType && styles.filterChipTextSelected,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {TEMPLATE_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.filterChip,
              selectedType === t.value && styles.filterChipSelected,
            ]}
            onPress={() =>
              setSelectedType(selectedType === t.value ? null : t.value)
            }
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === t.value && styles.filterChipTextSelected,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Template List */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          title="No templates found"
          message={
            searchQuery || selectedType
              ? 'Try adjusting your search or filter'
              : 'Create a template to get started'
          }
        />
      ) : (
        <ScrollView
          style={styles.templateList}
          contentContainerStyle={styles.templateListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPress={() => handleEdit(template)}
              onEdit={() => handleEdit(template)}
              onDuplicate={() => handleDuplicate(template.id)}
              onDelete={() => handleDelete(template)}
            />
          ))}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <TemplateEditModal
        visible={editModalVisible}
        template={editingTemplate}
        onSave={handleSave}
        onClose={() => setEditModalVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resetButton: {
    padding: 10,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  typeFilter: {
    maxHeight: 44,
  },
  typeFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  templateList: {
    flex: 1,
    marginTop: 8,
  },
  templateListContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  duration: {
    fontSize: 13,
    color: '#666',
  },
  menuButton: {
    padding: 8,
  },
  travelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  travelText: {
    fontSize: 12,
    color: '#999',
  },
  notes: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 200,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  modalSaveDisabled: {
    color: '#ccc',
  },
  modalContent: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconPicker: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPickerText: {
    fontSize: 28,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectButtonText: {
    fontSize: 15,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  travelBufferRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  travelOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  travelOptionSelected: {
    backgroundColor: '#2196F3',
  },
  travelOptionText: {
    fontSize: 14,
    color: '#666',
  },
  travelOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  notesInput: {
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '85%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  emojiOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  emojiText: {
    fontSize: 24,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 70,
    alignItems: 'center',
  },
  durationOptionSelected: {
    backgroundColor: '#2196F3',
  },
  durationOptionText: {
    fontSize: 14,
    color: '#666',
  },
  durationOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
});

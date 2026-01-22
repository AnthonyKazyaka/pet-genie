import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { Button } from '@/components/Button';
import { useSettings, useAuth } from '@/hooks';
import { DEFAULT_SETTINGS } from '@/models';
import { HapticFeedback } from '@/services';
import { GoogleCalendar } from '@/services/google-calendar.service';

/**
 * Number Input Component
 */
function NumberInput({
  label,
  value,
  onChangeValue,
  min = 0,
  max = 999,
  unit,
}: {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const increment = () => {
    if (value < max) {
      onChangeValue(value + 1);
    }
  };

  const decrement = () => {
    if (value > min) {
      onChangeValue(value - 1);
    }
  };

  return (
    <View style={styles.numberInputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.numberInputRow}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={decrement}
          disabled={value <= min}
        >
          <FontAwesome name="minus" size={14} color={value <= min ? '#ccc' : '#2196F3'} />
        </TouchableOpacity>
        <View style={styles.numberValueContainer}>
          <Text style={styles.numberValue}>{value}</Text>
          {unit && <Text style={styles.numberUnit}>{unit}</Text>}
        </View>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={increment}
          disabled={value >= max}
        >
          <FontAwesome name="plus" size={14} color={value >= max ? '#ccc' : '#2196F3'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Toggle Input Component
 */
function ToggleInput({
  label,
  description,
  value,
  onChangeValue,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChangeValue: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {description && <Text style={styles.inputDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChangeValue}
        trackColor={{ false: '#D1D1D6', true: '#81C784' }}
        thumbColor={value ? '#4CAF50' : '#f4f3f4'}
      />
    </View>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <FontAwesome name={icon as any} size={18} color="#2196F3" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { settings, loading, updateSettings, resetSettings } = useSettings();
  const { isSignedIn, isLoading: authLoading, userEmail, signIn, signOut, listCalendars, selectedCalendars, setSelectedCalendars } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Calendar selection state
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  // Load calendars when signed in
  useEffect(() => {
    if (isSignedIn && !authLoading) {
      loadCalendars();
    }
  }, [isSignedIn, authLoading]);
  
  const loadCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const cals = await listCalendars();
      setCalendars(cals);
    } catch (error) {
      console.error('Failed to load calendars:', error);
    } finally {
      setLoadingCalendars(false);
    }
  };
  
  const toggleCalendarSelection = async (calendarId: string) => {
    const isSelected = selectedCalendars.includes(calendarId);
    let newSelection: string[];
    
    if (isSelected) {
      // Don't allow deselecting if it's the last one
      if (selectedCalendars.length === 1) {
        Alert.alert('Cannot Deselect', 'You must have at least one calendar selected.');
        return;
      }
      newSelection = selectedCalendars.filter(id => id !== calendarId);
    } else {
      newSelection = [...selectedCalendars, calendarId];
    }
    
    await setSelectedCalendars(newSelection);
    HapticFeedback.selection();
  };

  // Update local settings when loaded
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  /**
   * Handle local setting change
   */
  const handleChange = useCallback(<K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  /**
   * Save settings
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      Alert.alert('Saved', 'Settings saved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset to defaults
   */
  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await resetSettings();
              setLocalSettings(DEFAULT_SETTINGS);
              setHasChanges(false);
              Alert.alert('Reset', 'Settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Text>Loading settings...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Settings</Text>
          <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>
            Configure your work limits and preferences
          </Text>
        </View>

        {/* Google Calendar Integration */}
        <View style={styles.section}>
          <SectionHeader icon="google" title="Google Calendar" />
          
          <View style={[styles.card, isDark && styles.cardDark]}>
            {authLoading ? (
              <View style={styles.googleLoadingContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={[styles.googleLoadingText, isDark && styles.textDark]}>
                  Loading...
                </Text>
              </View>
            ) : isSignedIn ? (
              <View style={styles.googleConnectedContainer}>
                <View style={styles.googleConnectedInfo}>
                  <View style={[styles.googleIconBadge, { backgroundColor: '#E8F5E9' }]}>
                    <FontAwesome name="check" size={16} color="#4CAF50" />
                  </View>
                  <View style={styles.googleConnectedText}>
                    <Text style={[styles.googleStatusText, isDark && styles.textDark]}>Connected</Text>
                    {userEmail && (
                      <Text style={[styles.googleEmailText, isDark && styles.textMutedDark]}>
                        {userEmail}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.googleDisconnectButton}
                  onPress={() => {
                    Alert.alert(
                      'Disconnect Google Calendar',
                      'Are you sure you want to disconnect your Google Calendar? You will need to sign in again to access your events.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Disconnect',
                          style: 'destructive',
                          onPress: async () => {
                            await HapticFeedback.medium();
                            await signOut();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <FontAwesome name="sign-out" size={16} color="#F44336" />
                  <Text style={styles.googleDisconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.googleConnectButton}
                onPress={async () => {
                  await HapticFeedback.medium();
                  const success = await signIn();
                  if (success) {
                    Alert.alert('Connected!', 'Your Google Calendar is now connected.');
                  } else {
                    Alert.alert('Error', 'Failed to connect to Google Calendar. Please try again.');
                  }
                }}
              >
                <View style={[styles.googleIconBadge, { backgroundColor: '#FFF3E0' }]}>
                  <FontAwesome name="google" size={18} color="#EA4335" />
                </View>
                <View style={styles.googleConnectTextContainer}>
                  <Text style={[styles.googleConnectTitle, isDark && styles.textDark]}>
                    Connect Google Calendar
                  </Text>
                  <Text style={[styles.googleConnectDesc, isDark && styles.textMutedDark]}>
                    Sync your pet sitting appointments
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color={isDark ? '#666' : '#ccc'} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Calendar Selection - shown when signed in */}
          {isSignedIn && (
            <View style={[styles.card, isDark && styles.cardDark, { marginTop: 12 }]}>
              <TouchableOpacity
                style={styles.calendarPickerHeader}
                onPress={() => setShowCalendarPicker(!showCalendarPicker)}
              >
                <View style={styles.calendarPickerHeaderLeft}>
                  <FontAwesome name="calendar" size={18} color="#2196F3" />
                  <View style={styles.calendarPickerHeaderText}>
                    <Text style={[styles.calendarPickerTitle, isDark && styles.textDark]}>
                      Calendars
                    </Text>
                    <Text style={[styles.calendarPickerSubtitle, isDark && styles.textMutedDark]}>
                      {selectedCalendars.length} selected
                    </Text>
                  </View>
                </View>
                <FontAwesome 
                  name={showCalendarPicker ? 'chevron-up' : 'chevron-down'} 
                  size={14} 
                  color={isDark ? '#666' : '#ccc'} 
                />
              </TouchableOpacity>
              
              {showCalendarPicker && (
                <View style={styles.calendarList}>
                  {loadingCalendars ? (
                    <View style={styles.calendarLoadingContainer}>
                      <ActivityIndicator size="small" color="#2196F3" />
                      <Text style={[styles.calendarLoadingText, isDark && styles.textMutedDark]}>
                        Loading calendars...
                      </Text>
                    </View>
                  ) : calendars.length === 0 ? (
                    <Text style={[styles.calendarEmptyText, isDark && styles.textMutedDark]}>
                      No calendars found
                    </Text>
                  ) : (
                    calendars.map((calendar, index) => (
                      <React.Fragment key={calendar.id}>
                        {index > 0 && <View style={styles.calendarDivider} />}
                        <TouchableOpacity
                          style={styles.calendarItem}
                          onPress={() => toggleCalendarSelection(calendar.id)}
                        >
                          <View style={styles.calendarItemLeft}>
                            <View 
                              style={[
                                styles.calendarColorDot, 
                                { backgroundColor: calendar.backgroundColor || '#4285F4' }
                              ]} 
                            />
                            <View style={styles.calendarItemText}>
                              <Text 
                                style={[styles.calendarName, isDark && styles.textDark]}
                                numberOfLines={1}
                              >
                                {calendar.summary}
                                {calendar.primary && (
                                  <Text style={styles.calendarPrimaryBadge}> (Primary)</Text>
                                )}
                              </Text>
                            </View>
                          </View>
                          <View style={[
                            styles.calendarCheckbox,
                            selectedCalendars.includes(calendar.id) && styles.calendarCheckboxSelected
                          ]}>
                            {selectedCalendars.includes(calendar.id) && (
                              <FontAwesome name="check" size={12} color="#fff" />
                            )}
                          </View>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <SectionHeader icon="link" title="Quick Links" />
          
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push('/templates' as any)}
            >
              <View style={styles.linkIcon}>
                <FontAwesome name="copy" size={18} color="#2196F3" />
              </View>
              <View style={styles.linkTextContainer}>
                <Text style={styles.linkTitle}>Templates</Text>
                <Text style={styles.linkDescription}>Manage appointment templates</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push('/export' as any)}
            >
              <View style={styles.linkIcon}>
                <FontAwesome name="download" size={18} color="#4CAF50" />
              </View>
              <View style={styles.linkTextContainer}>
                <Text style={styles.linkTitle}>Export Data</Text>
                <Text style={styles.linkDescription}>Generate and share reports</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Work Limits Section */}
        <View style={styles.section}>
          <SectionHeader icon="shield" title="Work Limits (Burnout Protection)" />
          
          <View style={styles.card}>
            <NumberInput
              label="Max visits per day"
              value={localSettings.maxVisitsPerDay}
              onChangeValue={(v) => handleChange('maxVisitsPerDay', v)}
              min={1}
              max={20}
              unit="visits"
            />

            <View style={styles.divider} />

            <NumberInput
              label="Max hours per day"
              value={localSettings.maxHoursPerDay}
              onChangeValue={(v) => handleChange('maxHoursPerDay', v)}
              min={1}
              max={24}
              unit="hours"
            />

            <View style={styles.divider} />

            <NumberInput
              label="Max hours per week"
              value={localSettings.maxHoursPerWeek}
              onChangeValue={(v) => handleChange('maxHoursPerWeek', v)}
              min={1}
              max={168}
              unit="hours"
            />

            <View style={styles.divider} />

            <NumberInput
              label="Warning threshold"
              value={localSettings.warningThresholdPercent}
              onChangeValue={(v) => handleChange('warningThresholdPercent', v)}
              min={50}
              max={99}
              unit="%"
            />
            <Text style={styles.helperText}>
              Show warnings when reaching this percentage of your limits
            </Text>
          </View>
        </View>

        {/* Work Hours Section */}
        <View style={styles.section}>
          <SectionHeader icon="clock-o" title="Work Hours" />
          
          <View style={styles.card}>
            <NumberInput
              label="Work day starts at"
              value={localSettings.workStartHour}
              onChangeValue={(v) => handleChange('workStartHour', v)}
              min={0}
              max={23}
              unit={localSettings.workStartHour < 12 ? 'AM' : 'PM'}
            />

            <View style={styles.divider} />

            <NumberInput
              label="Work day ends at"
              value={localSettings.workEndHour}
              onChangeValue={(v) => handleChange('workEndHour', v)}
              min={0}
              max={23}
              unit={localSettings.workEndHour < 12 ? 'AM' : 'PM'}
            />
          </View>
        </View>

        {/* Display Preferences Section */}
        <View style={styles.section}>
          <SectionHeader icon="eye" title="Display" />
          
          <View style={styles.card}>
            <NumberInput
              label="Default view range"
              value={localSettings.defaultViewDays}
              onChangeValue={(v) => handleChange('defaultViewDays', v)}
              min={1}
              max={30}
              unit="days"
            />

            <View style={styles.divider} />

            <ToggleInput
              label="Show completed visits"
              description="Display completed visits in the Today view"
              value={localSettings.showCompletedVisits}
              onChangeValue={(v) => handleChange('showCompletedVisits', v)}
            />
          </View>
        </View>

        {/* Summary Preferences Section */}
        <View style={styles.section}>
          <SectionHeader icon="file-text-o" title="Visit Summaries" />
          
          <View style={styles.card}>
            <ToggleInput
              label="Include timestamps"
              description="Show check-in and check-out times"
              value={localSettings.includeTimestampsInSummary}
              onChangeValue={(v) => handleChange('includeTimestampsInSummary', v)}
            />

            <View style={styles.divider} />

            <ToggleInput
              label="Include duration"
              description="Show visit duration in summary"
              value={localSettings.includeDurationInSummary}
              onChangeValue={(v) => handleChange('includeDurationInSummary', v)}
            />

            <View style={styles.divider} />

            <ToggleInput
              label="Include pet details"
              description="Show pet information in summary"
              value={localSettings.includePetDetailsInSummary}
              onChangeValue={(v) => handleChange('includePetDetailsInSummary', v)}
            />
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <SectionHeader icon="bell" title="Reminders" />
          
          <View style={styles.card}>
            <ToggleInput
              label="Enable reminders"
              description="Get notified before visits (coming soon)"
              value={localSettings.enableReminders}
              onChangeValue={(v) => handleChange('enableReminders', v)}
            />

            {localSettings.enableReminders && (
              <>
                <View style={styles.divider} />
                <NumberInput
                  label="Remind me"
                  value={localSettings.reminderMinutesBefore}
                  onChangeValue={(v) => handleChange('reminderMinutesBefore', v)}
                  min={5}
                  max={120}
                  unit="min before"
                />
              </>
            )}
          </View>
        </View>

        {/* Demo Mode Section */}
        <View style={styles.section}>
          <SectionHeader icon="flask" title="Demo Mode" />
          
          <View style={[styles.card, localSettings.demoMode && styles.demoModeCard]}>
            <ToggleInput
              label="Enable Demo Mode"
              description="Use sample data to explore the app without connecting a calendar"
              value={localSettings.demoMode}
              onChangeValue={(v) => {
                handleChange('demoMode', v);
                if (v) {
                  Alert.alert(
                    'Demo Mode Enabled',
                    'The app will now show sample clients, pets, and visits. Your real data is preserved and will return when you disable demo mode.',
                    [{ text: 'Got it' }]
                  );
                }
              }}
            />
            {localSettings.demoMode && (
              <>
                <View style={styles.divider} />
                <View style={styles.demoModeInfo}>
                  <FontAwesome name="info-circle" size={16} color="#FF9800" />
                  <Text style={styles.demoModeText}>
                    Demo mode is active. All data shown is sample data for demonstration purposes.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {hasChanges && (
            <Button
              title="Save Changes"
              onPress={handleSave}
              variant="primary"
              loading={saving}
              style={styles.saveButton}
            />
          )}

          <Button
            title="Reset to Defaults"
            onPress={handleReset}
            variant="outline"
            loading={saving}
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Pet Genie v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Made with 💙 for pet sitters</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  inputDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  numberInputContainer: {
    flexDirection: 'column',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  numberValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  numberValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  numberUnit: {
    fontSize: 14,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  saveButton: {
    marginBottom: 0,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#999',
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
  bottomPadding: {
    height: 40,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  linkDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // Google Calendar styles
  headerTitleDark: {
    color: '#fff',
  },
  headerSubtitleDark: {
    color: '#999',
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  textDark: {
    color: '#e0e0e0',
  },
  textMutedDark: {
    color: '#999',
  },
  googleLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  googleLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  googleConnectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  googleConnectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleConnectedText: {
    gap: 2,
  },
  googleStatusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  googleEmailText: {
    fontSize: 13,
    color: '#666',
  },
  googleDisconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  googleDisconnectText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F44336',
  },
  googleConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  googleConnectTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  googleConnectTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  googleConnectDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // Demo Mode styles
  demoModeCard: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFF8E1',
  },
  demoModeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  demoModeText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  // Calendar picker styles
  calendarPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calendarPickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarPickerHeaderText: {
    gap: 2,
  },
  calendarPickerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  calendarPickerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  calendarList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  calendarLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  calendarLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  calendarEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  calendarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  calendarColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarItemText: {
    flex: 1,
  },
  calendarName: {
    fontSize: 14,
    color: '#333',
  },
  calendarPrimaryBadge: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  calendarCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  calendarDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});

import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import { View, Text, Card, Button } from '@/components';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, useEventsStore, useClientsStore } from '@/stores';
import * as Application from 'expo-application';

export default function SettingsScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  const { isSignedIn, user, signIn, signOut, isLoading } = useAuthStore();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { clearEvents } = useEventsStore();
  const { clearClients } = useClientsStore();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      Alert.alert('Sign In Failed', 'Unable to sign in with Google. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Unable to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all cached events and clients. You will need to sync again from Google Calendar.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearEvents();
            clearClients();
            Alert.alert('Success', 'All local data has been cleared.');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            Alert.alert('Success', 'Settings have been reset to defaults.');
          },
        },
      ]
    );
  };

  const ThresholdRow = ({
    label,
    value,
    onIncrease,
    onDecrease,
    unit = 'hrs',
  }: {
    label: string;
    value: number;
    onIncrease: () => void;
    onDecrease: () => void;
    unit?: string;
  }) => (
    <View style={styles.thresholdRow}>
      <Text style={styles.thresholdLabel}>{label}</Text>
      <View style={styles.thresholdControls}>
        <TouchableOpacity
          style={[styles.thresholdButton, { borderColor: colors.border }]}
          onPress={onDecrease}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.thresholdValue}>
          {value} {unit}
        </Text>
        <TouchableOpacity
          style={[styles.thresholdButton, { borderColor: colors.border }]}
          onPress={onIncrease}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <Card style={styles.card}>
        {isSignedIn && user ? (
          <View>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarText}>
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.displayName || 'User'}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
              </View>
            </View>
            <Button
              title="Sign Out"
              variant="outline"
              onPress={handleSignOut}
              style={styles.signOutButton}
            />
          </View>
        ) : (
          <View>
            <View style={styles.signInPrompt}>
              <Ionicons name="logo-google" size={32} color={colors.textSecondary} />
              <Text style={[styles.signInText, { color: colors.textSecondary }]}>
                Sign in with Google to sync your calendar
              </Text>
            </View>
            <Button
              title={isLoading ? 'Signing In...' : 'Sign In with Google'}
              onPress={handleSignIn}
              disabled={isLoading}
            />
          </View>
        )}
      </Card>

      {/* Calendar Settings */}
      <Text style={styles.sectionTitle}>Calendar</Text>
      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Week starts on</Text>
          </View>
          <TouchableOpacity
            style={[styles.segmentedControl, { borderColor: colors.border }]}
            onPress={() =>
              updateSettings({
                weekStartsOn: settings.weekStartsOn === 0 ? 1 : 0,
              })
            }
          >
            <View
              style={[
                styles.segment,
                settings.weekStartsOn === 0 && {
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.weekStartsOn === 0 && { color: '#FFFFFF' },
                ]}
              >
                Sun
              </Text>
            </View>
            <View
              style={[
                styles.segment,
                settings.weekStartsOn === 1 && {
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.weekStartsOn === 1 && { color: '#FFFFFF' },
                ]}
              >
                Mon
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.settingRow, styles.switchRow]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Include travel time</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Add estimated travel time to workload calculations
            </Text>
          </View>
          <Switch
            value={settings.includeTravelTime}
            onValueChange={(value) => updateSettings({ includeTravelTime: value })}
            trackColor={{ false: colors.border, true: colors.tint }}
          />
        </View>
      </Card>

      {/* Workload Thresholds */}
      <Text style={styles.sectionTitle}>Workload Thresholds</Text>
      <Card style={styles.card}>
        <ThresholdRow
          label="Light (green)"
          value={settings.thresholds.light}
          onDecrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                light: Math.max(1, settings.thresholds.light - 1),
              },
            })
          }
          onIncrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                light: settings.thresholds.light + 1,
              },
            })
          }
        />
        <ThresholdRow
          label="Moderate (yellow)"
          value={settings.thresholds.moderate}
          onDecrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                moderate: Math.max(
                  settings.thresholds.light + 1,
                  settings.thresholds.moderate - 1
                ),
              },
            })
          }
          onIncrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                moderate: settings.thresholds.moderate + 1,
              },
            })
          }
        />
        <ThresholdRow
          label="Heavy (orange)"
          value={settings.thresholds.heavy}
          onDecrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                heavy: Math.max(
                  settings.thresholds.moderate + 1,
                  settings.thresholds.heavy - 1
                ),
              },
            })
          }
          onIncrease={() =>
            updateSettings({
              thresholds: {
                ...settings.thresholds,
                heavy: settings.thresholds.heavy + 1,
              },
            })
          }
        />
        <Text style={[styles.thresholdNote, { color: colors.textSecondary }]}>
          Beyond {settings.thresholds.heavy} hours is considered overloaded (red)
        </Text>
      </Card>

      {/* Data Management */}
      <Text style={styles.sectionTitle}>Data</Text>
      <Card style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearData}>
          <Ionicons name="trash-outline" size={24} color={colors.text} />
          <Text style={styles.actionLabel}>Clear Cached Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={handleResetSettings}>
          <Ionicons name="refresh-outline" size={24} color={colors.text} />
          <Text style={styles.actionLabel}>Reset Settings to Defaults</Text>
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <Card style={styles.card}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
            {Application.nativeApplicationVersion || '1.0.0'}
          </Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Build</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
            {Application.nativeBuildVersion || '1'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => Linking.openURL('https://github.com/your-repo/pet-genie')}
        >
          <Ionicons name="logo-github" size={24} color={colors.text} />
          <Text style={styles.actionLabel}>View on GitHub</Text>
        </TouchableOpacity>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    opacity: 0.7,
  },
  card: {
    marginHorizontal: 16,
  },
  // User section
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 8,
  },
  signInPrompt: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  signInText: {
    textAlign: 'center',
  },
  // Settings rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Threshold rows
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  thresholdLabel: {
    fontSize: 16,
    flex: 1,
  },
  thresholdControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  thresholdNote: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionLabel: {
    fontSize: 16,
  },
  // About section
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
  },
  aboutValue: {
    fontSize: 16,
  },
});

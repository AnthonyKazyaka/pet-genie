import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { Button } from '@/components/Button';
import { useClients } from '@/hooks';

/**
 * Input Field Component
 */
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function NewClientScreen() {
  const router = useRouter();
  const { create } = useClients();
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [notes, setNotes] = useState('');

  /**
   * Save new client
   */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    setSaving(true);
    try {
      const client = await create({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        emergencyContact:
          emergencyName.trim() || emergencyPhone.trim()
            ? {
                name: emergencyName.trim(),
                phone: emergencyPhone.trim(),
                relationship: emergencyRelationship.trim() || undefined,
              }
            : undefined,
        notes: notes.trim() || undefined,
      });

      // Navigate to the new client's detail page
      router.replace(`/client/${client.id}` as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to create client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Client',
          headerBackTitle: 'Cancel',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* Client Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="user" size={18} color="#2196F3" />
              <Text style={styles.sectionTitle}>Client Information</Text>
            </View>

            <InputField
              label="Name *"
              value={name}
              onChangeText={setName}
              placeholder="Client name"
            />

            <InputField
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Street address"
            />

            <InputField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />

            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
            />

            <InputField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this client"
              multiline
            />
          </View>

          {/* Emergency Contact Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="phone" size={18} color="#f44336" />
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
            </View>

            <InputField
              label="Name"
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Emergency contact name"
            />

            <InputField
              label="Phone"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="Emergency phone number"
              keyboardType="phone-pad"
            />

            <InputField
              label="Relationship"
              value={emergencyRelationship}
              onChangeText={setEmergencyRelationship}
              placeholder="e.g., Spouse, Neighbor, Vet"
            />
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <FontAwesome name="info-circle" size={16} color="#2196F3" />
            <Text style={styles.infoText}>
              You can add pets after creating the client.
            </Text>
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <Button
              title="Create Client"
              onPress={handleSave}
              variant="primary"
              size="large"
              loading={saving}
            />
          </View>
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
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 8,
    flex: 1,
  },
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
});

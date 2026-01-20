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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/EmptyState';
import { useClients, usePets } from '@/hooks';
import { Client, Pet, CreatePetDto } from '@/models';

/**
 * Pet Card Component
 */
function PetCard({
  pet,
  onEdit,
  onDelete,
}: {
  pet: Pet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.petCard}>
      <View style={styles.petInfo}>
        <View style={styles.petIcon}>
          <FontAwesome
            name={pet.species === 'dog' ? 'paw' : pet.species === 'cat' ? 'paw' : 'heart'}
            size={20}
            color="#fff"
          />
        </View>
        <View style={styles.petDetails}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petSpecies}>
            {pet.species}
            {pet.breed ? ` • ${pet.breed}` : ''}
            {pet.age ? ` • ${pet.age} years` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.petActions}>
        <TouchableOpacity style={styles.petActionButton} onPress={onEdit}>
          <FontAwesome name="pencil" size={16} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.petActionButton} onPress={onDelete}>
          <FontAwesome name="trash-o" size={16} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, update } = useClients();
  const {
    getByClientId,
    create: createPet,
    update: updatePet,
    remove: removePet,
  } = usePets();

  const [client, setClient] = useState<Client | null>(null);
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Pet form state
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petCareNotes, setPetCareNotes] = useState('');

  /**
   * Load client data
   */
  const loadClient = useCallback(() => {
    if (id) {
      const clientData = getById(id);
      if (clientData) {
        setClient(clientData);
        setName(clientData.name);
        setAddress(clientData.address);
        setPhone(clientData.phone || '');
        setEmail(clientData.email || '');
        setEmergencyName(clientData.emergencyContact?.name || '');
        setEmergencyPhone(clientData.emergencyContact?.phone || '');
        setEmergencyRelationship(clientData.emergencyContact?.relationship || '');
        setNotes(clientData.notes || '');
        setClientPets(getByClientId(id));
      }
    }
    setLoading(false);
  }, [id, getById, getByClientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  /**
   * Save client changes
   */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    setSaving(true);
    try {
      const updated = await update({
        id: id!,
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

      if (updated) {
        setClient(updated);
        Alert.alert('Saved', 'Client information saved successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset pet form
   */
  const resetPetForm = () => {
    setShowPetForm(false);
    setEditingPet(null);
    setPetName('');
    setPetSpecies('');
    setPetBreed('');
    setPetAge('');
    setPetCareNotes('');
  };

  /**
   * Start editing a pet
   */
  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setPetName(pet.name);
    setPetSpecies(pet.species);
    setPetBreed(pet.breed || '');
    setPetAge(pet.age?.toString() || '');
    setPetCareNotes(pet.careNotes || '');
    setShowPetForm(true);
  };

  /**
   * Save pet (create or update)
   */
  const handleSavePet = async () => {
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert('Error', 'Pet name and species are required');
      return;
    }

    setSaving(true);
    try {
      if (editingPet) {
        await updatePet({
          id: editingPet.id,
          name: petName.trim(),
          species: petSpecies.trim().toLowerCase(),
          breed: petBreed.trim() || undefined,
          age: petAge ? parseInt(petAge) : undefined,
          careNotes: petCareNotes.trim() || undefined,
        });
      } else {
        await createPet({
          clientId: id!,
          name: petName.trim(),
          species: petSpecies.trim().toLowerCase(),
          breed: petBreed.trim() || undefined,
          age: petAge ? parseInt(petAge) : undefined,
          careNotes: petCareNotes.trim() || undefined,
        });
      }

      resetPetForm();
      setClientPets(getByClientId(id!));
    } catch (error) {
      Alert.alert('Error', 'Failed to save pet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete pet
   */
  const handleDeletePet = (pet: Pet) => {
    Alert.alert('Delete Pet', `Are you sure you want to delete ${pet.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removePet(pet.id);
          setClientPets(getByClientId(id!));
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState message="Loading client..." />;
  }

  if (!client) {
    return (
      <ThemedView style={styles.container}>
        <Text>Client not found</Text>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Client',
          headerBackTitle: 'Back',
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

          {/* Pets Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="paw" size={18} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Pets</Text>
              <TouchableOpacity
                style={styles.addPetButton}
                onPress={() => setShowPetForm(true)}
              >
                <FontAwesome name="plus" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {clientPets.length === 0 && !showPetForm && (
              <Text style={styles.noPets}>No pets added yet</Text>
            )}

            {clientPets.map(pet => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={() => handleEditPet(pet)}
                onDelete={() => handleDeletePet(pet)}
              />
            ))}

            {/* Pet Form */}
            {showPetForm && (
              <View style={styles.petForm}>
                <Text style={styles.petFormTitle}>
                  {editingPet ? 'Edit Pet' : 'Add New Pet'}
                </Text>

                <InputField
                  label="Name *"
                  value={petName}
                  onChangeText={setPetName}
                  placeholder="Pet name"
                />

                <InputField
                  label="Species *"
                  value={petSpecies}
                  onChangeText={setPetSpecies}
                  placeholder="e.g., Dog, Cat, Bird"
                />

                <InputField
                  label="Breed"
                  value={petBreed}
                  onChangeText={setPetBreed}
                  placeholder="e.g., Golden Retriever"
                />

                <InputField
                  label="Age (years)"
                  value={petAge}
                  onChangeText={setPetAge}
                  placeholder="Age in years"
                  keyboardType="phone-pad"
                />

                <InputField
                  label="Care Notes"
                  value={petCareNotes}
                  onChangeText={setPetCareNotes}
                  placeholder="Special care instructions"
                  multiline
                />

                <View style={styles.petFormActions}>
                  <Button
                    title="Cancel"
                    onPress={resetPetForm}
                    variant="outline"
                    size="small"
                    style={styles.petFormButton}
                  />
                  <Button
                    title={editingPet ? 'Update Pet' : 'Add Pet'}
                    onPress={handleSavePet}
                    variant="success"
                    size="small"
                    loading={saving}
                    style={styles.petFormButton}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <Button
              title="Save Changes"
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
  addPetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPets: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  petIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  petSpecies: {
    fontSize: 13,
    color: '#666',
  },
  petActions: {
    flexDirection: 'row',
    gap: 8,
  },
  petActionButton: {
    padding: 8,
  },
  petForm: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  petFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  petFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  petFormButton: {
    minWidth: 100,
  },
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
});

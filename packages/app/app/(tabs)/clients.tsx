import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Alert,
} from 'react-native';
import { View, Text, Card, Button, EmptyState } from '@/components';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useClientsStore, useAuthStore } from '@/stores';
import { Client, Pet } from '@pet-genie/core';
import { router } from 'expo-router';

type ViewMode = 'list' | 'add' | 'edit' | 'detail';

export default function ClientsScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  const { clients, addClient, updateClient, deleteClient } = useClientsStore();
  const { isSignedIn } = useAuthStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  
  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.pets.some((p) => p.name.toLowerCase().includes(query)) ||
        c.address?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);
  
  const handleAddClient = () => {
    if (!editingClient.name) {
      Alert.alert('Error', 'Client name is required');
      return;
    }
    
    const newClient: Client = {
      id: Date.now().toString(),
      name: editingClient.name,
      email: editingClient.email,
      phone: editingClient.phone,
      address: editingClient.address,
      notes: editingClient.notes,
      pets: editingClient.pets || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    addClient(newClient);
    setEditingClient({});
    setViewMode('list');
  };
  
  const handleUpdateClient = () => {
    if (!selectedClient || !editingClient.name) return;
    
    updateClient(selectedClient.id, {
      ...editingClient,
      updatedAt: new Date(),
    });
    
    setEditingClient({});
    setSelectedClient(null);
    setViewMode('list');
  };
  
  const handleDeleteClient = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteClient(client.id);
            setSelectedClient(null);
            setViewMode('list');
          },
        },
      ]
    );
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="log-in-outline"
          title="Connect Your Calendar"
          message="Sign in with Google to manage clients."
          actionLabel="Go to Settings"
          onAction={() => router.push('/settings')}
        />
      </View>
    );
  }

  // Add/Edit form
  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {viewMode === 'add' ? 'New Client' : 'Edit Client'}
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editingClient.name || ''}
              onChangeText={(text) => setEditingClient({ ...editingClient, name: text })}
              placeholder="Client name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editingClient.email || ''}
              onChangeText={(text) => setEditingClient({ ...editingClient, email: text })}
              placeholder="email@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={editingClient.phone || ''}
              onChangeText={(text) => setEditingClient({ ...editingClient, phone: text })}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={editingClient.address || ''}
              onChangeText={(text) => setEditingClient({ ...editingClient, address: text })}
              placeholder="123 Main St, City, State"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={editingClient.notes || ''}
              onChangeText={(text) => setEditingClient({ ...editingClient, notes: text })}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.formActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setEditingClient({});
                setViewMode('list');
              }}
              style={styles.formButton}
            />
            <Button
              title={viewMode === 'add' ? 'Add Client' : 'Save Changes'}
              onPress={viewMode === 'add' ? handleAddClient : handleUpdateClient}
              style={styles.formButton}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Client detail view
  if (viewMode === 'detail' && selectedClient) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.detailContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedClient(null);
              setViewMode('list');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backText}>Clients</Text>
          </TouchableOpacity>
          
          <View style={styles.detailHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {selectedClient.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.detailName}>{selectedClient.name}</Text>
          </View>
          
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {selectedClient.email || 'No email'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {selectedClient.phone || 'No phone'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {selectedClient.address || 'No address'}
              </Text>
            </View>
          </Card>
          
          {selectedClient.pets.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pets</Text>
              {selectedClient.pets.map((pet) => (
                <Card key={pet.id} style={styles.petCard}>
                  <View style={styles.petHeader}>
                    <Ionicons
                      name={pet.species === 'cat' ? 'fish-outline' : 'paw-outline'}
                      size={24}
                      color={colors.tint}
                    />
                    <Text style={styles.petName}>{pet.name}</Text>
                  </View>
                  {pet.breed && (
                    <Text style={[styles.petDetail, { color: colors.textSecondary }]}>
                      {pet.breed}
                    </Text>
                  )}
                  {pet.notes && (
                    <Text style={[styles.petDetail, { color: colors.textSecondary }]}>
                      {pet.notes}
                    </Text>
                  )}
                </Card>
              ))}
            </>
          )}
          
          {selectedClient.notes && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Card>
                <Text style={{ color: colors.textSecondary }}>
                  {selectedClient.notes}
                </Text>
              </Card>
            </>
          )}
          
          <View style={styles.detailActions}>
            <Button
              title="Edit"
              variant="outline"
              onPress={() => {
                setEditingClient(selectedClient);
                setViewMode('edit');
              }}
              style={styles.detailButton}
            />
            <Button
              title="Delete"
              variant="destructive"
              onPress={() => handleDeleteClient(selectedClient)}
              style={styles.detailButton}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Client list
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search and Add */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInput, { borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search clients..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            setEditingClient({});
            setViewMode('add');
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {/* Client list */}
      <ScrollView style={styles.listContainer}>
        {filteredClients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Clients"
            message={searchQuery ? 'No clients match your search.' : 'Add your first client to get started.'}
            actionLabel={searchQuery ? undefined : 'Add Client'}
            onAction={searchQuery ? undefined : () => setViewMode('add')}
          />
        ) : (
          filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              onPress={() => {
                setSelectedClient(client);
                setViewMode('detail');
              }}
            >
              <Card style={styles.clientCard}>
                <View style={styles.clientRow}>
                  <View style={[styles.clientAvatar, { backgroundColor: colors.tint }]}>
                    <Text style={styles.clientAvatarText}>
                      {client.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    {client.pets.length > 0 && (
                      <Text style={[styles.clientPets, { color: colors.textSecondary }]}>
                        {client.pets.map((p) => p.name).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  clientCard: {
    marginBottom: 8,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientPets: {
    fontSize: 14,
    marginTop: 2,
  },
  // Form styles
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  formButton: {
    flex: 1,
  },
  // Detail styles
  detailContainer: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backText: {
    fontSize: 16,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
  },
  detailCard: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  petCard: {
    marginBottom: 8,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
  },
  petDetail: {
    marginTop: 4,
    marginLeft: 32,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  detailButton: {
    flex: 1,
  },
});

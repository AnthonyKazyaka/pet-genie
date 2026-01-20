import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View as ThemedView } from '@/components/Themed';
import { Button } from '@/components/Button';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { useClients, usePets } from '@/hooks';
import { Client } from '@/models';

/**
 * Client Card Component
 */
function ClientCard({
  client,
  petCount,
  onPress,
  onDelete,
}: {
  client: Client;
  petCount: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.clientInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientDetails}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.address && (
            <View style={styles.addressRow}>
              <FontAwesome name="map-marker" size={12} color="#666" />
              <Text style={styles.clientAddress} numberOfLines={1}>
                {client.address}
              </Text>
            </View>
          )}
          <Text style={styles.petCount}>
            {petCount} {petCount === 1 ? 'pet' : 'pets'}
          </Text>
        </View>
      </View>
      <View style={styles.clientActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <FontAwesome name="trash-o" size={18} color="#f44336" />
        </TouchableOpacity>
        <FontAwesome name="chevron-right" size={16} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
}

export default function ClientsScreen() {
  const router = useRouter();
  const { clients, loading, remove, refresh } = useClients();
  const { pets, getByClientId, removeByClientId } = usePets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  /**
   * Navigate to client detail/edit
   */
  const handleClientPress = (client: Client) => {
    router.push(`/client/${client.id}` as any);
  };

  /**
   * Navigate to add new client
   */
  const handleAddClient = () => {
    router.push('/client/new' as any);
  };

  /**
   * Handle delete client
   */
  const handleDeleteClient = (client: Client) => {
    const petCount = getByClientId(client.id).length;

    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}?${
        petCount > 0 ? ` This will also delete ${petCount} pet(s).` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeByClientId(client.id);
            await remove(client.id);
          },
        },
      ]
    );
  };

  /**
   * Filter clients by search query
   */
  const filteredClients = searchQuery
    ? clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients;

  if (loading) {
    return <LoadingState message="Loading clients..." />;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Client List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClients.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No clients found' : 'No clients yet'}
            message={
              searchQuery
                ? 'Try adjusting your search'
                : 'Add your first client to get started'
            }
            icon={<FontAwesome name="users" size={48} color="#ccc" />}
          />
        ) : (
          filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              petCount={getByClientId(client.id).length}
              onPress={() => handleClientPress(client)}
              onDelete={() => handleDeleteClient(client)}
            />
          ))
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddClient}>
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  petCount: {
    fontSize: 12,
    color: '#999',
  },
  clientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

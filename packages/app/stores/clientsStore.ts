import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, CreateClientDto, UpdateClientDto } from '@pet-genie/core';

interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  
  // Actions
  setClients: (clients: Client[]) => void;
  addClient: (dto: CreateClientDto) => Client;
  updateClient: (dto: UpdateClientDto) => Client | null;
  deleteClient: (id: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Selectors
  getClientById: (id: string) => Client | undefined;
  searchClients: (query: string) => Client[];
}

const generateId = () =>
  `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      clients: [],
      isLoading: false,
      
      setClients: (clients) => set({ clients }),
      
      addClient: (dto) => {
        const now = new Date();
        const client: Client = {
          id: generateId(),
          ...dto,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          clients: [...state.clients, client],
        }));
        return client;
      },
      
      updateClient: (dto) => {
        const { clients } = get();
        const index = clients.findIndex((c) => c.id === dto.id);
        if (index === -1) return null;
        
        const updated: Client = {
          ...clients[index],
          ...dto,
          updatedAt: new Date(),
        };
        
        const newClients = [...clients];
        newClients[index] = updated;
        set({ clients: newClients });
        return updated;
      },
      
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        })),
        
      setLoading: (loading) => set({ isLoading: loading }),
      
      getClientById: (id) => {
        return get().clients.find((c) => c.id === id);
      },
      
      searchClients: (query) => {
        const { clients } = get();
        if (!query) return clients;
        
        const lower = query.toLowerCase();
        return clients.filter(
          (c) =>
            c.name.toLowerCase().includes(lower) ||
            c.address.toLowerCase().includes(lower) ||
            c.email?.toLowerCase().includes(lower)
        );
      },
    }),
    {
      name: 'pet-genie-clients',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        clients: state.clients.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clients = state.clients.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          }));
        }
      },
    }
  )
);

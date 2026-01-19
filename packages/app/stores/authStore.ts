import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  tokenExpiry: Date | null;
  userEmail: string | null;
  
  // Actions
  signIn: (token: string, expiresIn: number, email?: string) => void;
  signOut: () => void;
  isTokenValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isSignedIn: false,
      accessToken: null,
      tokenExpiry: null,
      userEmail: null,
      
      signIn: (token, expiresIn, email) => {
        const expiry = new Date(Date.now() + expiresIn * 1000);
        set({
          isSignedIn: true,
          accessToken: token,
          tokenExpiry: expiry,
          userEmail: email || null,
        });
      },
      
      signOut: () =>
        set({
          isSignedIn: false,
          accessToken: null,
          tokenExpiry: null,
          userEmail: null,
        }),
        
      isTokenValid: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return false;
        return new Date(tokenExpiry) > new Date();
      },
    }),
    {
      name: 'pet-genie-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        tokenExpiry: state.tokenExpiry,
        userEmail: state.userEmail,
        isSignedIn: state.isSignedIn,
      }),
    }
  )
);

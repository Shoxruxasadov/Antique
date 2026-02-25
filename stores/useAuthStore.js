import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} email
 * @property {string} [full_name]
 * @property {string} [avatar_url]
 */

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      /** @param {AuthUser | null} user */
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      signIn: () => set({ isAuthenticated: true }),
      signUp: () => set({ isAuthenticated: true }),
      signOut: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'antique-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

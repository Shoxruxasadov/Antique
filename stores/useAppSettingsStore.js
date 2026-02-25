import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppSettingsStore = create(
  persist(
    (set) => ({
      vibration: true,
      setVibration: (vibration) => set({ vibration }),
      preferredCurrency: 'USD',
      setPreferredCurrency: (preferredCurrency) => set({ preferredCurrency }),
    }),
    {
      name: 'antique-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

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
      darkMode: false,
      setDarkMode: (darkMode) => set({ darkMode }),
      openCollectionToHistory: false,
      setOpenCollectionToHistory: (openCollectionToHistory) => set({ openCollectionToHistory }),
      collectionViewMode: 'list',
      setCollectionViewMode: (collectionViewMode) => set({ collectionViewMode }),
      hasShownRateAfterFirstScan: false,
      setHasShownRateAfterFirstScan: (value) => set({ hasShownRateAfterFirstScan: value }),
    }),
    {
      name: 'antique-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        vibration: state.vibration,
        preferredCurrency: state.preferredCurrency,
        darkMode: state.darkMode,
        collectionViewMode: state.collectionViewMode,
        hasShownRateAfterFirstScan: state.hasShownRateAfterFirstScan,
      }),
    }
  )
);

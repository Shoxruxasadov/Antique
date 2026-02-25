import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useOnboardingStore = create(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSkippedGetStarted: false,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      resetOnboarding: () => set({ hasSeenOnboarding: false }),
      setSkippedGetStarted: (value) => set({ hasSkippedGetStarted: value }),
      resetSkippedGetStarted: () => set({ hasSkippedGetStarted: false }),
    }),
    {
      name: 'antique-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

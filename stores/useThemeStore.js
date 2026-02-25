import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/colors';

export const useThemeStore = create(
  persist(
    (set) => ({
      mode: 'light',
      colors: lightTheme,
      setTheme: (mode) =>
        set({
          mode,
          colors: mode === 'dark' ? darkTheme : lightTheme,
        }),
      toggleTheme: () =>
        set((state) => {
          const newMode = state.mode === 'light' ? 'dark' : 'light';
          return {
            mode: newMode,
            colors: newMode === 'dark' ? darkTheme : lightTheme,
          };
        }),
    }),
    {
      name: 'antique-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

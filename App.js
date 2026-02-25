import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_600SemiBold,
  AlbertSans_700Bold,
} from '@expo-google-fonts/albert-sans';
import { useOnboardingStore } from './stores/useOnboardingStore';
import { useAuthStore } from './stores/useAuthStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { mapSupabaseUserToStore } from './lib/authSync';
import AppNavigator from './navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const [fontsLoaded] = useFonts({
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    AlbertSans_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          useOnboardingStore.persist.rehydrate(),
          useAuthStore.persist.rehydrate(),
        ]);
        useOnboardingStore.getState().resetOnboarding();

        // Supabase session bo‘lsa store ni user_metadata (avatar_url, full_name) bilan yangilash
        if (fontsLoaded && isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            useAuthStore.getState().setUser(mapSupabaseUserToStore(session.user));
          }
        }
      } finally {
        if (fontsLoaded) setAppReady(true);
      }
    }
    if (fontsLoaded) prepare();
  }, [fontsLoaded]);

  // Auth holat o‘zgarganda (login, logout, profile update) store ni sinxronlashtirish
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const setUser = useAuthStore.getState().setUser;
      const signOut = useAuthStore.getState().signOut;
      if (event === 'SIGNED_OUT' || !session) {
        signOut();
        return;
      }
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        setUser(mapSupabaseUserToStore(session.user));
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator completeOnboarding={completeOnboarding} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

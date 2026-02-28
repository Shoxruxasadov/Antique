import 'react-native-gesture-handler';
import { useEffect, useState, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { View, Text, StyleSheet } from 'react-native';
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
import { useExchangeRatesStore } from './stores/useExchangeRatesStore';
import { useAssistantStore } from './stores/useAssistantStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { mapSupabaseUserToStore } from './lib/authSync';
import AppNavigator from './navigation/AppNavigator';
import { configureRevenueCat } from './lib/revenueCat';

// Top-level splash chaqiruvini olib tashlaymiz — ba'zi build'larda native crash sabab bo‘lishi mumkin
try {
  SplashScreen.preventAutoHideAsync?.();
} catch (_) {}

const FONT_LOAD_TIMEOUT_MS = 12000;
const PREPARE_TIMEOUT_MS = 15000;

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [startupError, setStartupError] = useState(null);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  const hasSkippedGetStarted = useOnboardingStore((s) => s.hasSkippedGetStarted);
  const user = useAuthStore((s) => s.user);
  const timedOut = useRef(false);

  const initialRoute =
    !hasSeenOnboarding ? 'Onboarding' : user || hasSkippedGetStarted ? 'Main' : 'GetStarted';

  const [fontsLoaded, fontError] = useFonts({
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    AlbertSans_700Bold,
  });

  // Font load timeout — uzoq kutib qolmasin, system font bilan davom etsin
  useEffect(() => {
    const t = setTimeout(() => {
      if (!timedOut.current) {
        timedOut.current = true;
        setAppReady((r) => r || true);
      }
    }, FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) timedOut.current = true;
    }, PREPARE_TIMEOUT_MS);

    async function prepare() {
      try {
        const rehydrate = (store) =>
          Promise.resolve(store.persist?.rehydrate?.()).catch(() => {});
        await Promise.all([
          rehydrate(useOnboardingStore),
          rehydrate(useAuthStore),
          rehydrate(useExchangeRatesStore),
          rehydrate(useAssistantStore),
        ]);
        if (cancelled) return;
        try {
          configureRevenueCat();
        } catch (_) {}
        try {
          useExchangeRatesStore.getState().fetchRates();
        } catch (_) {}
        if (fontsLoaded && isSupabaseConfigured() && supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              useAuthStore.getState().setUser(mapSupabaseUserToStore(session.user));
            }
          } catch (_) {}
        }
      } catch (e) {
        if (!cancelled) setStartupError(e?.message || 'Startup failed');
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setAppReady(true);
        }
      }
    }

    prepare();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fontsLoaded, fontError]);

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
      SplashScreen.hideAsync?.().catch(() => {});
    }
  }, [appReady]);

  // Xato bo‘lsa faqat matn ko‘rsatamiz (theme ga bog‘liq emas)
  if (startupError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Something went wrong</Text>
        <Text style={styles.fallbackSubtext}>{startupError}</Text>
      </View>
    );
  }

  // Ilova tayyor bo‘lmaguncha minimal ekran (null o‘rniga — native crash kamayadi)
  if (!appReady) {
    return <View style={styles.fallback} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator completeOnboarding={completeOnboarding} initialRoute={initialRoute} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#F7F8F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 18,
    color: '#2D2524',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#6F7F82',
  },
});

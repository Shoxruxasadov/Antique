import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRight } from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts } from '../../theme';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { mapSupabaseUserToStore } from '../../lib/authSync';
import { signInWithOAuthProvider } from '../../lib/oauthSupabase';
import { openTermsOfUse, openPrivacyPolicy } from '../../lib/legalLinks';

const ICON_SIZE = 22;

export default function GetStartedScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const setSkippedGetStarted = useOnboardingStore((s) => s.setSkippedGetStarted);
  const setUser = useAuthStore((s) => s.setUser);
  const [oauthLoading, setOauthLoading] = useState(null); // 'apple' | 'google' | null

  const handleSkip = () => {
    setSkippedGetStarted(true);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    try {
      const result = await signInWithOAuthProvider(provider);
      if (result.error) {
        if (result.error !== 'Cancelled') {
          Alert.alert('Sign in', result.error);
        }
        return;
      }
      if (result.user) {
        setUser(mapSupabaseUserToStore(result.user));
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgWhite },
        skipBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 20 },
        skipText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textBrand },
        content: { flex: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
        icon: { width: 80, height: 80, marginBottom: 24 },
        title: { fontFamily: fonts.bold, fontSize: 28, color: colors.textBase, marginBottom: 8 },
        subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 },
        btnDisabled: { opacity: 0.7 },
        btnApple: { flexDirection: 'row', width: '100%', backgroundColor: colors.bgInverted, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
        btnAppleText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textInverse },
        btnEmail: { flexDirection: 'row', width: '100%', backgroundColor: colors.border1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
        btnEmailText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textBase },
        btnGoogle: { flexDirection: 'row', width: '100%', backgroundColor: colors.border1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
        btnGoogleText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textBase },
        footerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
        footerLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary },
        footerLink: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textBrand },
        legalFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,},
        legalFooterText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        legalFooterLink: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textBrand },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <Pressable style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
        <CaretRight size={18} color={colors.textBrand} weight="bold" />
      </Pressable>

      <View style={styles.content}>
        <Image source={require('../../assets/logo.png')} style={styles.icon} resizeMode="contain" />
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>
          To continue using our app, please login to your account
        </Text>

        <Pressable
          style={[styles.btnApple, oauthLoading && styles.btnDisabled]}
          onPress={() => handleOAuth('apple')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'apple' ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Ionicons name="logo-apple" size={ICON_SIZE} color={colors.textInverse} />
          )}
          <Text style={styles.btnAppleText}>
            {oauthLoading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.btnEmail}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Ionicons name="mail" size={ICON_SIZE} color={colors.textBase} />
          <Text style={styles.btnEmailText}>Continue with Email</Text>
        </Pressable>

        <Pressable
          style={[styles.btnGoogle, oauthLoading && styles.btnDisabled]}
          onPress={() => handleOAuth('google')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'google' ? (
            <ActivityIndicator color={colors.textBase} size="small" />
          ) : (
            <Image source={require('../../assets/google.webp')} style={{ width: 19, height: 19, margin: 1.5, marginRight: 0 }} resizeMode="contain" />
          )}
          <Text style={styles.btnGoogleText}>
            {oauthLoading === 'google' ? 'Signing in…' : 'Continue with Google'}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.footerLink}>Log In</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.legalFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.legalFooterText}>By continuing, you agree to our </Text>
        <Pressable onPress={openTermsOfUse}>
          <Text style={styles.legalFooterLink}>Terms of Use</Text>
        </Pressable>
        <Text style={styles.legalFooterText}> and </Text>
        <Pressable onPress={openPrivacyPolicy}>
          <Text style={styles.legalFooterLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalFooterText}>.</Text>
      </View>
    </View>
  );
}

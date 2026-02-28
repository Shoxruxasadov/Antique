import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts } from '../../theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { mapSupabaseUserToStore } from '../../lib/authSync';
import { signInWithOAuthProvider } from '../../lib/oauthSupabase';
import { openTermsOfUse, openPrivacyPolicy } from '../../lib/legalLinks';

const ICON_SIZE = 22;

export default function SignInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(null); // 'apple' | 'google' | null

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) {
          setError(err.message || 'Sign in failed');
          return;
        }
        const u = data?.user;
        if (u) setUser(mapSupabaseUserToStore(u));
      } else {
        setUser({ id: 'demo', email: email.trim(), full_name: 'Demo User' });
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const result = await signInWithOAuthProvider(provider);
      if (result.error) {
        if (result.error !== 'Cancelled') setError(result.error);
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
        backBtn: { paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start' },
        keyboardView: { flex: 1 },
        scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
        title: { fontFamily: fonts.bold, fontSize: 28, color: colors.textBase, textAlign: 'center', marginBottom: 8, paddingTop: 24 },
        subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
        input: { fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, backgroundColor: colors.border1, borderWidth: 0, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 12 },
        forgotLink: { alignSelf: 'flex-end', marginBottom: 24 },
        forgotText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textBrand },
        primaryBtn: { backgroundColor: colors.brand, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 24 },
        primaryBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textWhite },
        primaryBtnDisabled: { opacity: 0.7 },
        errorText: { fontFamily: fonts.regular, fontSize: 14, color: '#C8191B', marginBottom: 12, textAlign: 'center' },
        orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
        orLine: { flex: 1, height: 1, backgroundColor: colors.border3 },
        orText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginHorizontal: 12 },
        btnApple: { flexDirection: 'row', width: '100%', backgroundColor: colors.bgInverted, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
        btnAppleText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textInverse },
        btnGoogle: { flexDirection: 'row', width: '100%', backgroundColor: colors.border1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10 },
        btnGoogleText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textBase },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <CaretLeft size={24} color={colors.textBase} weight="bold" />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            To continue using our app create account first.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            style={[styles.btnApple, oauthLoading && styles.primaryBtnDisabled]}
            onPress={() => handleOAuth('apple')}
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'apple' ? (
              <ActivityIndicator color={colors.textWhite} size="small" />
            ) : (
              <Ionicons name="logo-apple" size={22} color={colors.textInverse} />
            )}
            <Text style={styles.btnAppleText}>
              {oauthLoading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.btnGoogle, oauthLoading && styles.primaryBtnDisabled]}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

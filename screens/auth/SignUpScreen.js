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
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { openTermsOfUse, openPrivacyPolicy } from '../../lib/legalLinks';
import { useAuthStore } from '../../stores/useAuthStore';
import { mapSupabaseUserToStore } from '../../lib/authSync';

export default function SignUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (password !== repeatPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() || undefined } },
        });
        if (err) {
          setError(err.message || 'Sign up failed');
          return;
        }
        const u = data?.user;
        if (u) {
          const storeUser = mapSupabaseUserToStore(u);
          if (name.trim()) storeUser.full_name = name.trim();
          setUser(storeUser);
        }
      } else {
        setUser({
          id: 'demo-' + Date.now(),
          email: email.trim(),
          full_name: name.trim() || 'User',
        });
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
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
        input: { fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, backgroundColor: colors.bgBase, borderWidth: 0, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 12 },
        primaryBtn: { backgroundColor: colors.brand, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 32 },
        primaryBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textWhite },
        primaryBtnDisabled: { opacity: 0.7 },
        errorText: { fontFamily: fonts.regular, fontSize: 14, color: '#C8191B', marginBottom: 12, textAlign: 'center' },
        footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
        footerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
        footerLink: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textBrand, textDecorationLine: 'underline' },
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
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>
            To continue using our app create account first
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor={colors.textTertiary}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.primaryBtnText}>Sign Up</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our </Text>
            <Pressable onPress={openTermsOfUse}>
              <Text style={styles.footerLink}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.footerText}> and </Text>
            <Pressable onPress={openPrivacyPolicy}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.footerText}>.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [email, setEmail] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgWhite },
        backBtn: { paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start' },
        content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
        title: { fontFamily: fonts.bold, fontSize: 28, color: colors.textBase, textAlign: 'center', marginBottom: 8, paddingTop: 24 },
        subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
        input: { fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, backgroundColor: colors.bgBase, borderWidth: 0, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 24 },
        primaryBtn: { backgroundColor: colors.brand, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
        primaryBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textWhite },
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
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          To reset your password please enter your email
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

        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Send Code</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

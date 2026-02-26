import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { pickAndResizeAvatar } from '../../lib/pickImage';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/avatarStorage';
import { mapSupabaseUserToStore } from '../../lib/authSync';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.full_name !== undefined) setFullName(user.full_name || '');
    if (user?.email !== undefined) setEmail(user.email || '');
  }, [user?.id]);

  const pickImage = async () => {
    try {
      const result = await pickAndResizeAvatar(300);
      if (!result) return;
      setAvatarUri(result.uri);
      setAvatarBase64(result.base64 || null);
    } catch (_) {
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let avatarUrl = user.avatar_url ?? null;
      if (avatarBase64) {
        const contentType = avatarUri?.toLowerCase?.().includes('.png') ? 'image/png' : 'image/jpeg';
        const url = await uploadAvatar(user.id, avatarBase64, contentType);
        if (url) avatarUrl = url;
      }
      const updated = {
        id: user.id,
        email: email.trim() || user.email,
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl,
      };

      if (isSupabaseConfigured() && supabase) {
        const { data, error: updateErr } = await supabase.auth.updateUser({
          data: { full_name: updated.full_name, avatar_url: updated.avatar_url },
        });
        if (updateErr) throw updateErr;
        // Store ni Supabase javobidagi user_metadata bilan yangilash (login keyin ham rasm saqlanadi)
        if (data?.user) setUser(mapSupabaseUserToStore(data.user));
        else setUser(updated);
      } else {
        setUser(updated);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayAvatarUri = avatarUri || user?.avatar_url;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={48} color={colors.brand} />
              )}
            </View>
          </Pressable>

          {/* Full Name */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Anderson"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="johnanderson@gmail.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>
        </ScrollView>

        {/* Save Changes — pastda qotadi */}
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
          >
            {saving ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 24, color: colors.textBase },
  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  headerSpacer: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: colors.bgWhite,
  },
  avatarWrap: {
    marginBottom: 32,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  fieldWrap: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textBase,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textBase,
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
  },
});

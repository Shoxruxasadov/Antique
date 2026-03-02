import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Platform,
  Linking,
} from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, fonts } from '../../theme';
import { t, getLanguageLabel } from '../../lib/i18n';
import { useAppSettingsStore } from '../../stores/useAppSettingsStore';

export default function AppSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const vibration = useAppSettingsStore((s) => s.vibration);
  const setVibration = useAppSettingsStore((s) => s.setVibration);
  const darkMode = useAppSettingsStore((s) => s.darkMode);
  const setDarkMode = useAppSettingsStore((s) => s.setDarkMode);
  const [notifications, setNotifications] = useState(true);

  const onLanguagePress = () => {
    if (Platform.OS === 'ios') {
      Linking.openSettings();
    } else {
      navigation?.navigate?.('Language');
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bgBase,
        },
        safe: { flex: 1 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        backBtn: { padding: 4 },
        title: {
          fontSize: 18,
          fontFamily: fonts.semiBold,
          color: colors.textBase,
        },
        headerSpacer: { width: 32 },
        content: { paddingHorizontal: 16, gap: 4 },
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.bgWhite,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          height: 56,
        },
        label: {
          fontSize: 16,
          fontFamily: fonts.regular,
          color: colors.textBase,
        },
        languageRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        languageValue: {
          fontSize: 16,
          fontFamily: fonts.regular,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <CaretLeft size={24} color={colors.textBase} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('appSettings.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={[styles.card, { borderTopEndRadius: 24, borderTopStartRadius: 24, marginTop: 8}]}>
            <Text style={styles.label}>{t('appSettings.vibration')}</Text>
            <Switch
              value={vibration}
              onValueChange={setVibration}
              trackColor={{ false: '#E5E5E5', true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t('appSettings.darkMode')}</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E5E5', true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={[styles.card, { borderBottomEndRadius: 24, borderBottomStartRadius: 24}]} onPress={onLanguagePress} activeOpacity={0.7}>
            <Text style={styles.label}>{t('appSettings.language')}</Text>
            <View style={styles.languageRow}>
              <Text style={styles.languageValue}>{getLanguageLabel()}</Text>
              <CaretRight size={18} color={colors.textTertiary} weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

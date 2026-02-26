import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Linking,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { t, getLanguageLabel } from '../../lib/i18n';
import { useAppSettingsStore } from '../../stores/useAppSettingsStore';

export default function AppSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const vibration = useAppSettingsStore((s) => s.vibration);
  const setVibration = useAppSettingsStore((s) => s.setVibration);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const openAppSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('appSettings.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Notifications */}
          {/* <View style={styles.card}>
            <Text style={styles.label}>{t('appSettings.notifications')}</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E5E5E5', true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View> */}

          {/* Vibration */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('appSettings.vibration')}</Text>
            <Switch
              value={vibration}
              onValueChange={setVibration}
              trackColor={{ false: '#E5E5E5', true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Dark Mode */}
          <View style={styles.card}>
            <Text style={styles.label}>{t('appSettings.darkMode')}</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E5E5', true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Language — native app settings */}
          <TouchableOpacity style={styles.card} onPress={openAppSettings} activeOpacity={0.7}>
            <Text style={styles.label}>{t('appSettings.language')}</Text>
            <View style={styles.languageRow}>
              <Text style={styles.languageValue}>{getLanguageLabel()}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontSize: 24,
    color: colors.textBase,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingHorizontal: 16,
    gap: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textBase,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textTertiary,
  },
});

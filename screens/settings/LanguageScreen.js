import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Check } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';
import { t, getLocale, setLocale, supportedLocales, translations } from '../../lib/i18n';
import { useLocaleStore } from '../../stores/useLocaleStore';

export default function LanguageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const current = getLocale();

  const data = useMemo(
    () =>
      supportedLocales.map((code) => ({
        code,
        label: (translations && translations[code]?.['appSettings.languageValue']) || code,
      })),
    []
  );

  const onSelect = (code) => {
    setLocale(code);
    useLocaleStore.getState().setLocale(code);
    navigation.goBack();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgWhite },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        backBtn: { padding: 4 },
        title: { fontSize: 18, fontFamily: fonts.semiBold, color: colors.textBase },
        headerSpacer: { width: 32 },
        list: { flex: 1 },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border3,
        },
        rowText: { fontSize: 16, fontFamily: fonts.regular, color: colors.textBase },
        check: { marginLeft: 8 },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <CaretLeft size={24} color={colors.textBase} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('appSettings.language')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.code}
        style={styles.list}
        renderItem={({ item }) => {
          const selected = current === item.code;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowText}>{item.label}</Text>
              {selected ? (
                <Check size={22} color={colors.brand} weight="bold" style={styles.check} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

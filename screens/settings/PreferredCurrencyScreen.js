import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, MagnifyingGlass, Check } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';
import { useAppSettingsStore } from '../../stores/useAppSettingsStore';

const CURRENCIES = [
  { name: 'US Dollar', code: 'USD' },
  { name: 'Euro', code: 'EUR' },
  { name: 'British Pound Sterling', code: 'GBP' },
  { name: 'Japanese Yen', code: 'JPY' },
  { name: 'Swiss Franc', code: 'CHF' },
  { name: 'Canadian Dollar', code: 'CAD' },
  { name: 'Australian Dollar', code: 'AUD' },
  { name: 'New Zealand Dollar', code: 'NZD' },
  { name: 'Chinese Yuan Renminbi', code: 'CNY' },
  { name: 'Singapore Dollar', code: 'SGD' },
  { name: 'Hong Kong Dollar', code: 'HKD' },
  { name: 'South Korean Won', code: 'KRW' },
  { name: 'Indian Rupee', code: 'INR' },
  { name: 'Russian Ruble', code: 'RUB' },
  { name: 'Brazilian Real', code: 'BRL' },
  { name: 'Mexican Peso', code: 'MXN' },
  { name: 'South African Rand', code: 'ZAR' },
  { name: 'Turkish Lira', code: 'TRY' },
  { name: 'UAE Dirham', code: 'AED' },
  { name: 'Saudi Riyal', code: 'SAR' },
];

export default function PreferredCurrencyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const setPreferredCurrency = useAppSettingsStore((s) => s.setPreferredCurrency);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const onSelect = (code) => {
    setPreferredCurrency(code);
    navigation.goBack();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgWhite },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
        backBtn: { padding: 4 },
        title: { fontSize: 18, fontFamily: fonts.semiBold, color: colors.textBase },
        headerSpacer: { width: 32 },
        searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgBase, borderRadius: 10, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
        searchInput: { flex: 1, fontSize: 16, fontFamily: fonts.regular, color: colors.textBase, paddingVertical: 0 },
        sectionHeader: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, marginHorizontal: 16, marginBottom: 8 },
        list: { flex: 1 },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border3 },
        rowText: { fontSize: 16, fontFamily: fonts.regular, color: colors.textBase },
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
        <Text style={styles.title}>Preferred Currency</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <MagnifyingGlass size={20} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search currency"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.sectionHeader}>Currencies</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = preferredCurrency === item.code;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowText}>
                {item.name} — {item.code}
              </Text>
              {selected ? (
                <Check size={22} color={colors.brand} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

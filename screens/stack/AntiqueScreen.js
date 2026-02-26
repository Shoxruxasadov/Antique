import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Dimensions,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAppSettingsStore } from '../../stores/useAppSettingsStore';
import { useExchangeRatesStore } from '../../stores/useExchangeRatesStore';
import { formatPrice as formatPriceWithCurrency, formatPriceRangeUsd, formatPriceUsd } from '../../lib/currency';

const TAB_NAMES = ['details', 'condition', 'history'];

function ConditionRow({ label, status, statusStyle, note }) {
  const isBad = statusStyle === 'bad';
  const isNeutral = statusStyle === 'neutral';
  const iconColor = isBad ? colors.red : isNeutral ? colors.brand : colors.green;
  const iconBgStyle = isBad ? styles.conditionRowIconBad : isNeutral ? styles.conditionRowIconNeutral : null;
  return (
    <View style={styles.conditionRow}>
      <View style={[styles.conditionRowIcon, iconBgStyle]}>
        <Ionicons
          name={isBad ? 'close-circle' : 'checkmark-circle'}
          size={18}
          color={iconColor}
        />
      </View>
      <View style={styles.conditionRowBody}>
        <View style={styles.conditionRowHeader}>
          <Text style={styles.conditionRowLabel}>{label}</Text>
          <View style={[
            styles.conditionRowStatusBadge,
            statusStyle === 'bad' && styles.conditionRowStatusBadgeBad,
            statusStyle === 'neutral' && styles.conditionRowStatusBadgeNeutral,
          ]}>
            <Text style={[
              styles.conditionRowStatusText,
              statusStyle === 'bad' && styles.conditionRowStatusTextBad,
              statusStyle === 'neutral' && styles.conditionRowStatusTextNeutral,
            ]}>
              {status}
            </Text>
          </View>
        </View>
        {note ? <Text style={styles.conditionRowNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function TimelineItem({ icon, title, subtitle, isFirst, isLast }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        {!isFirst && <View style={styles.timelineLine} />}
        <View style={styles.timelineDot}>
          <Ionicons name={icon} size={18} color={colors.textInverse} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function AntiqueScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { antiqueId, antique: antiqueParam, fromScan, fromHistory, fromCollectionAntiquesIds } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const rates = useExchangeRatesStore((s) => s.rates);
  const displayCurrency = !rates && preferredCurrency !== 'USD' ? 'USD' : preferredCurrency;
  const rate = displayCurrency === 'USD' ? 1 : (rates?.[displayCurrency] ?? 1);
  const [antique, setAntique] = useState(antiqueParam || null);
  const [loading, setLoading] = useState(!antiqueParam && !!antiqueId);
  const [activeTab, setActiveTab] = useState('condition');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [inAnyCollection, setInAnyCollection] = useState(false);
  const [collectionForLink, setCollectionForLink] = useState(null);
  const sheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const tabIndicatorLeft = useRef(
    new Animated.Value((() => {
      const w = Dimensions.get('window').width;
      return ((w - 32 - 8) / 3) * 1; // condition = index 1
    })())
  ).current;
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslateY = useRef(new Animated.Value(0)).current;
  const isInCurrentCollection =
    Array.isArray(fromCollectionAntiquesIds) && antique?.id != null && fromCollectionAntiquesIds.includes(antique.id);

  useEffect(() => {
    if (antiqueParam) {
      setAntique(antiqueParam);
      return;
    }
    if (!antiqueId || !isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('antiques')
        .select('*')
        .eq('id', antiqueId)
        .single();
      if (!error) setAntique(data);
      setLoading(false);
    })();
  }, [antiqueId, antiqueParam]);

  const refreshCollectionStatus = useCallback(async () => {
    if (!antique?.id || !user?.id || !isSupabaseConfigured() || !supabase) {
      setInAnyCollection(false);
      setCollectionForLink(null);
      return;
    }
    const { data } = await supabase
      .from('collections')
      .select('id, collection_name, antiques_ids')
      .eq('user_id', user.id);
    const list = data ?? [];
    const aid = antique.id;
    const found = list.find((c) => Array.isArray(c.antiques_ids) && c.antiques_ids.includes(aid));
    setInAnyCollection(!!found);
    setCollectionForLink(found ?? null);
  }, [antique?.id, user?.id]);

  useEffect(() => {
    refreshCollectionStatus();
  }, [refreshCollectionStatus]);

  const tabIndex = TAB_NAMES.indexOf(activeTab);
  const tabBarPadding = 4;
  const tabBarContentWidth = width - 32 - tabBarPadding * 2;
  const tabWidth = tabBarContentWidth / 3;
  const indicatorTranslateX = tabIndex * tabWidth;

  useEffect(() => {
    Animated.timing(tabIndicatorLeft, {
      toValue: indicatorTranslateX,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, indicatorTranslateX]);

  const handleTabPress = (tab) => {
    if (tab === activeTab) return;
    Animated.parallel([
      Animated.timing(tabContentOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(tabContentTranslateY, {
        toValue: 8,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTab(tab);
      tabContentTranslateY.setValue(-8);
      Animated.parallel([
        Animated.timing(tabContentOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tabContentTranslateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  useEffect(() => {
    if (!showAddSheet || !user?.id || !supabase) return;
    const h = Dimensions.get('window').height;
    sheetOverlayOpacity.setValue(0);
    sheetTranslateY.setValue(h);
    Animated.parallel([
      Animated.timing(sheetOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setLoadingCollections(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('collections')
          .select('id, collection_name, antiques_ids')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setCollections(data ?? []);
      } catch (_) {
        setCollections([]);
      } finally {
        setLoadingCollections(false);
      }
    })();
  }, [showAddSheet, user?.id]);

  const closeAddSheet = useCallback(
    (onDone) => {
      const h = Dimensions.get('window').height;
      Animated.parallel([
        Animated.timing(sheetOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: h, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setShowAddSheet(false);
        onDone?.();
      });
    },
    [sheetOverlayOpacity, sheetTranslateY]
  );

  const handleOpenAddSheet = () => {
    if (!user?.id || !antique?.id) {
      Alert.alert('Login required', 'Please sign in to add items to a collection.');
      return;
    }
    setShowAddSheet(true);
  };

  const addAntiqueToCollection = useCallback(
    async (coll) => {
      if (!antique?.id || !supabase) return;
      const ids = Array.isArray(coll.antiques_ids) ? coll.antiques_ids : [];
      if (ids.includes(antique.id)) {
        Alert.alert('Already added', 'This item is already in this collection.');
        return;
      }
      try {
        const { error } = await supabase
          .from('collections')
          .update({
            antiques_ids: [...ids, antique.id],
            updated_at: new Date().toISOString(),
          })
          .eq('id', coll.id);
        if (error) throw error;
        await refreshCollectionStatus();
        closeAddSheet();
        Alert.alert('Added', 'Item added to collection.');
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to add to collection');
      }
    },
    [antique?.id, supabase, closeAddSheet, refreshCollectionStatus]
  );

  const handleCreateNewCollection = useCallback(async () => {
    if (!user?.id || !antique?.id || !supabase) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('collections').insert({
        user_id: user.id,
        collection_name: 'My Collection',
        antiques_ids: [antique.id],
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      await refreshCollectionStatus();
      closeAddSheet();
      Alert.alert('Added', 'New collection created and item added.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to create collection');
    }
  }, [user?.id, antique?.id, supabase, closeAddSheet, refreshCollectionStatus]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!antique) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Text style={styles.emptyText}>Item not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = Array.isArray(antique.image_url)?.[0] || antique.image_url || null;
  const ageYrs = antique.estimated_age_years ?? 0;
  const rarityScore = antique.rarity_score ?? 0;
  const rarityMax = antique.rarity_max_score ?? 10;
  const growthPct = antique.avg_growth_percentage != null ? (antique.avg_growth_percentage * 100).toFixed(0) : '0';
  const getConditionStyle = (label, s) => {
    if (!s || s === 'N/A') return 'bad';
    const lower = s.toLowerCase();
    if (lower === 'excellent') return 'good';
    if (lower === 'good') return label === 'Dial & Hands' ? 'neutral' : 'good';
    return 'bad'; // fair, poor, etc.
  };

  const SPEC_LABELS = {
    case_material: 'Case Material',
    glass_type: 'Glass Type',
    construction: 'Construction',
    era: 'Era',
    style: 'Style',
    dimensions: 'Dimensions',
  };
  const getSpecificationRows = (a) => {
    const spec = a?.specification;
    const isEmpty = !spec || (typeof spec === 'object' && !Array.isArray(spec) && Object.keys(spec).length === 0);
    if (isEmpty) {
      const rows = [
        { key: 'Case Material', value: (Array.isArray(a?.category) ? a.category[0] : a?.category) || null },
        { key: 'Era', value: [a?.period_start_year, a?.period_end_year].filter(Boolean).length ? `${a.period_start_year} – ${a.period_end_year}` : null },
        { key: 'Origin', value: a?.origin_country || null },
      ].filter((r) => r.value);
      return rows.length ? rows : [{ key: '—', value: 'No specification' }];
    }
    if (Array.isArray(spec)) return spec.map(({ key, value }) => ({ key: key || '—', value: value ?? '—' }));
    return Object.entries(spec).map(([k, v]) => ({
      key: SPEC_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: v ?? '—',
    }));
  };

  const buildOriginProvenanceFallback = (a) => {
    const place = a?.origin_country || 'Unknown';
    const period = [a?.period_start_year, a?.period_end_year].filter(Boolean).length ? `${a.period_start_year}–${a.period_end_year}` : '';
    return period ? `Likely from ${place} (${period}). ${a?.description || ''}`.trim() : (a?.description || 'No origin information.');
  };

  const formatHistoryDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (_) {
      return '—';
    }
  };

  const formatPurchasePrice = (v) => {
    if (v == null || v === '') return '—';
    const converted = rate * Number(v);
    if (Number.isNaN(converted)) return '—';
    return formatPriceWithCurrency(converted, displayCurrency);
  };

  const cardWidth = (width - 32 - 16) / 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={[styles.header, { top: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerCloseBtn}>
          <Ionicons name="close" size={22} color={colors.textBase} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.mainImage} resizeMode="cover" />
        ) : (
          <View style={[styles.mainImage, styles.placeholderImage]} />
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{antique.name}</Text>
          <Text style={styles.originLine}>
            {antique.origin_country ?? 'Unknown'} · {antique.period_start_year ?? 0} – {antique.period_end_year ?? 0} yrs
          </Text>
        </View>

        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { width: cardWidth }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.brand} />
            <Text style={styles.metricLabel}>Age</Text>
            <Text style={styles.metricValue}>{ageYrs} yrs</Text>
          </View>
          <View style={[styles.metricCard, { width: cardWidth }]}>
            <Ionicons name="ribbon-outline" size={24} color={colors.brand} />
            <Text style={styles.metricLabel}>Rarity</Text>
            <Text style={styles.metricValue}>{rarityScore} / {rarityMax}</Text>
          </View>
          <View style={[styles.metricCard, { width: cardWidth }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.brand} />
            <Text style={styles.metricLabel}>Condition</Text>
            <Text style={styles.metricValue}>{antique.overall_condition_summary ?? 'Good'}</Text>
          </View>
        </View>

        <View style={styles.marketValueCard}>
          <View style={styles.marketValueHeader}>
            <Ionicons name="trending-up" size={20} color={colors.brand} />
            <Text style={styles.marketValueTitle}>Market Analysis</Text>
            <View style={styles.marketValueLiveTag}>
              <Text style={styles.marketValueLiveText}>LIVE DATA</Text>
            </View>
          </View>
          <View style={styles.marketValueCurrentBlock}>
            <Text style={styles.marketValueCurrentLabel}>Current market value</Text>
            <Text style={styles.marketValueCurrentValue}>
              {formatPriceRangeUsd(antique.market_value_min, antique.market_value_max, displayCurrency, rate)}
            </Text>
          </View>
          <View style={styles.marketValueLowHighRow}>
            <View style={styles.marketValueLowHighBlock}>
              <Text style={styles.marketValueLowHighLabel}>Low</Text>
              <Text style={styles.marketValueLowHighValue}>
                {formatPriceUsd(antique.market_value_min, displayCurrency, rate)}
              </Text>
            </View>
            <View style={styles.marketValueLowHighBlock}>
              <Text style={styles.marketValueLowHighLabel}>High</Text>
              <Text style={styles.marketValueLowHighValue}>
                {formatPriceUsd(antique.market_value_max, displayCurrency, rate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                width: tabWidth,
                transform: [{ translateX: tabIndicatorLeft }],
              },
            ]}
          />
          {TAB_NAMES.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'details' ? 'Details' : tab === 'condition' ? 'Condition' : 'History'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Animated.View
          style={[
            styles.tabPanelWrap,
            {
              opacity: tabContentOpacity,
              transform: [{ translateY: tabContentTranslateY }],
            },
          ]}
        >
        {activeTab === 'details' && (
          <View style={styles.tabPanel}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.bodyText}>
              {antique.description || 'No description available.'}
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Specification</Text>
            <View style={styles.specList}>
              {getSpecificationRows(antique).map(({ key: specKey, value }) => (
                <View key={specKey} style={styles.specRow}>
                  <Text style={styles.specLabel}>{specKey}</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.originCard}>
              <View style={styles.originTitleRow}>
                <Ionicons name="location" size={18} color={colors.textBase} />
                <Text style={styles.originTitle}>Origin & Provenance</Text>
              </View>
              <Text style={styles.originText}>
                {antique.origin_provenance || buildOriginProvenanceFallback(antique)}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'condition' && (
          <View style={styles.tabPanel}>
            <View style={styles.conditionGradeBlock}>
              <View style={styles.conditionGradeCircle}>
                <Text style={styles.conditionGradeText}>{antique.condition_grade ?? 'B+'}</Text>
              </View>
              <Text style={styles.conditionOverallTitle}>
                Overall Condition: {antique.overall_condition_summary ?? 'Good'}
              </Text>
              <Text style={styles.conditionOverallSubtitle}>
                {antique.condition_description || 'Well-preserved with age-appropriate wear'}
              </Text>
            </View>
            <View style={styles.conditionList}>
              <ConditionRow
                label="Mechanical Function"
                status={antique.mechanical_function_status ?? 'N/A'}
                statusStyle={getConditionStyle('Mechanical Function', antique.mechanical_function_status)}
                note={antique.mechanical_function_notes}
              />
              <ConditionRow
                label="Case Condition"
                status={antique.case_condition_status ?? 'N/A'}
                statusStyle={getConditionStyle('Case Condition', antique.case_condition_status)}
                note={antique.case_condition_notes}
              />
              <ConditionRow
                label="Dial & Hands"
                status={antique.dial_hands_condition_status ?? 'N/A'}
                statusStyle={getConditionStyle('Dial & Hands', antique.dial_hands_condition_status)}
                note={antique.dial_hands_condition_notes}
              />
              <ConditionRow
                label="Crystal"
                status={antique.crystal_condition_status ?? 'N/A'}
                statusStyle={getConditionStyle('Crystal', antique.crystal_condition_status)}
                note={antique.crystal_condition_notes}
              />
            </View>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.tabPanel}>
            <Text style={styles.sectionTitle}>Acquisition Details</Text>
            <View style={styles.acquisitionRows}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date Added</Text>
                <Text style={styles.metaValue}>{formatHistoryDate(antique.created_at)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Source</Text>
                <Text style={styles.metaValue}>{antique.source || 'AI Analysis'}</Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.metaLabel}>Purchase Price</Text>
                <Text style={styles.metaValue}>{formatPurchasePrice(antique.purchase_price)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Item Timeline</Text>
            <View style={styles.timeline}>
              <TimelineItem
                icon="cube-outline"
                title="Manufactured"
                subtitle={`${antique.period_start_year || '?'}–${antique.period_end_year || '?'} • ${antique.origin_country || 'Unknown'}`}
                isFirst
                isLast={false}
              />
              <TimelineItem
                icon="eye-outline"
                title="Identified"
                subtitle={`${formatHistoryDate(antique.created_at)} • AI Analysis`}
                isFirst={false}
                isLast={false}
              />
              <TimelineItem
                icon="checkmark-circle-outline"
                title="Condition Assessed"
                subtitle={`${formatHistoryDate(antique.created_at)} • Grade: ${antique.overall_condition_summary || 'Good'} (${antique.condition_grade || 'B+'})`}
                isFirst={false}
                isLast
              />
            </View>
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {!isInCurrentCollection && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {inAnyCollection ? (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                if (collectionForLink) {
                  navigation.navigate('CollectionDetail', {
                    collectionId: collectionForLink.id,
                    collectionName: collectionForLink.collection_name,
                    antiquesIds: collectionForLink.antiques_ids || [],
                  });
                } else {
                  navigation.navigate('MainTabs', { screen: 'Collection' });
                }
              }}
            >
              <Text style={styles.addBtnText}>See your collection</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.addBtn} onPress={handleOpenAddSheet}>
              <Text style={styles.addBtnText}>Add to Collection</Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={showAddSheet} transparent animationType="none" onRequestClose={() => closeAddSheet()}>
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: sheetOverlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAddSheet()} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 24, maxHeight: '70%', transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Add to Collection</Text>
              {loadingCollections ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : collections.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No collections yet</Text>
                  <Pressable style={[styles.sheetRow, styles.sheetRowCreate]} onPress={handleCreateNewCollection}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
                    <Text style={[styles.sheetRowText, { color: colors.brand }]}>Create new collection</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  {collections.map((coll) => {
                    const ids = Array.isArray(coll.antiques_ids) ? coll.antiques_ids : [];
                    const alreadyIn = antique?.id != null && ids.includes(antique.id);
                    return (
                      <Pressable
                        key={coll.id}
                        style={styles.sheetRow}
                        onPress={() =>
                          alreadyIn
                            ? Alert.alert('Already added', 'This item is already in this collection.')
                            : addAntiqueToCollection(coll)
                        }
                      >
                        <Ionicons
                          name={alreadyIn ? 'checkmark-circle' : 'folder-outline'}
                          size={22}
                          color={alreadyIn ? colors.green : colors.textBase}
                        />
                        <Text style={styles.sheetRowText} numberOfLines={1}>
                          {coll.collection_name || 'Collection'}
                        </Text>
                        <Text style={styles.sheetRowSubtext}>{ids.length} items</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable style={[styles.sheetRow, styles.sheetRowCreate]} onPress={handleCreateNewCollection}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
                    <Text style={[styles.sheetRowText, { color: colors.brand }]}>Create new collection</Text>
                  </Pressable>
                </ScrollView>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(247,248,244,0.92)',
  },
  headerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8 },
  mainImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    backgroundColor: colors.border1,
    marginBottom: 16,
  },
  placeholderImage: {},
  titleBlock: { marginBottom: 16 },
  name: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textBase,
    lineHeight: 28,
  },
  originLine: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 8,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    marginTop: 2,
  },
  marketValueCard: {
    backgroundColor: colors.brandLightElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  marketValueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  marketValueTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textBase,
  },
  marketValueLiveTag: {
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  marketValueLiveText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
    letterSpacing: 0.5,
  },
  marketValueCurrentBlock: {
    backgroundColor: colors.bgWhiteA3,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  marketValueCurrentLabel: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textBase,
    marginBottom: 6,
  },
  marketValueCurrentValue: {
    fontSize: 30,
    fontFamily: fonts.semiBold,
    color: colors.brand,
  },
  marketValueLowHighRow: {
    flexDirection: 'row',
    gap: 12,
  },
  marketValueLowHighBlock: {
    flex: 1,
    backgroundColor: colors.bgWhiteA3,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  marketValueLowHighLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  marketValueLowHighValue: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  tabBar: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: colors.bgWhite,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: colors.border1,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    // background is the sliding indicator
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textBase,
  },
  tabPanelWrap: {
    marginBottom: 24,
  },
  tabPanel: {
    backgroundColor: colors.bgWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textBase,
    lineHeight: 22,
    marginBottom: 16,
  },
  specList: {
    marginTop: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  specLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textBase,
    marginLeft: 12,
    flex: 1,
    textAlign: 'right',
  },
  originCard: {
    marginTop: 20,
    backgroundColor: colors.brandLight,
    borderRadius: 12,
    padding: 16,
  },
  originTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  originText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textBase,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  metaLabel: { fontSize: 14, fontFamily: fonts.medium, color: colors.textSecondary },
  metaValue: { fontSize: 14, fontFamily: fonts.regular, color: colors.textBase },
  conditionGradeBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  conditionGradeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  conditionGradeText: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textBase,
  },
  conditionOverallTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    marginBottom: 4,
  },
  conditionOverallSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  conditionList: {},
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  conditionRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conditionRowIconBad: {
    backgroundColor: colors.redLight,
  },
  conditionRowIconNeutral: {
    backgroundColor: colors.brandLight,
  },
  conditionRowBody: { flex: 1 },
  conditionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conditionRowLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  conditionRowStatusBadge: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionRowStatusBadgeBad: {
    backgroundColor: colors.redLight,
  },
  conditionRowStatusBadgeNeutral: {
    backgroundColor: colors.brandLight,
  },
  conditionRowStatusText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textBase,
  },
  conditionRowStatusTextBad: {
    color: colors.red,
  },
  conditionRowStatusTextNeutral: {
    color: colors.brand,
  },
  conditionRowNote: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  acquisitionRows: {
    marginTop: 4,
  },
  timeline: {
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border3,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  historyEmpty: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: colors.bgWhite,
  },
  addBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
  },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  backBtn: { marginTop: 16 },
  backBtnText: { fontSize: 16, color: colors.brand },
  sheetOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bgWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textBase,
    marginBottom: 16,
    textAlign: 'center',
  },
  sheetScroll: { maxHeight: 320 },
  sheetLoading: { paddingVertical: 24, alignItems: 'center' },
  sheetEmpty: { paddingBottom: 8 },
  sheetEmptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
    gap: 12,
  },
  sheetRowCreate: { borderBottomWidth: 0 },
  sheetRowText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textBase,
  },
  sheetRowSubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textTertiary,
  },
});

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Animated,
  Easing,
  StyleSheet as SS,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';

const THUMB_GAP = 7;
const THUMB_COUNT = 2;

function isImageUrl(s) {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'));
}

function CollectionCard({ title, count, thumbnails, onPress }) {
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const cardGap = 12;
  const cardWidth = (width - horizontalPadding * 2 - cardGap) / 2;
  const innerWidth = cardWidth - 20;
  const thumbSize = (innerWidth - THUMB_GAP) / THUMB_COUNT;

  return (
    <Pressable style={[styles.collectionWrap, { width: cardWidth }]} onPress={onPress}>
      <View style={[styles.collectionCard, { width: cardWidth }]}>
        <View style={styles.thumbGrid}>
          {thumbnails.map((src, i) => (
            <View
              key={i}
              style={[
                styles.thumb,
                { width: thumbSize, height: thumbSize },
                !src && styles.thumbEmpty,
              ]}
            >
              {src ? (
                isImageUrl(src) ? (
                  <Image source={{ uri: src }} style={SS.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[SS.absoluteFill, { backgroundColor: src }]} />
                )
              ) : null}
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.collectionTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.collectionCount}>{count}</Text>
    </Pressable>
  );
}

const TAB_NAMES = ['details', 'history'];
const COLLECTION_CARD_COUNT = 4;
const DELAY_STEP = 70;
const ANIM_DURATION = 550;
const EASE_OUT = Easing.bezier(0.25, 0.1, 0.25, 1);

function createCardAnims() {
  return Array.from({ length: COLLECTION_CARD_COUNT }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(36),
  }));
}

export default function CollectionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const mainStack = navigation.getParent();
  const [activeTab, setActiveTab] = useState('details');
  const [collections, setCollections] = useState([]);
  const [snapHistory, setSnapHistory] = useState([]);
  const [antiqueImageMap, setAntiqueImageMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showHistoryOptionsSheet, setShowHistoryOptionsSheet] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState(null);
  const tabIndex = TAB_NAMES.indexOf(activeTab);
  const sheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const horizontalPadding = 16;
  const tabGap = 12;
  const trackPadding = 4;
  const tabBarOuterWidth = screenWidth - horizontalPadding * 2;
  const tabBarInnerWidth = tabBarOuterWidth - trackPadding * 2;
  const tabWidth = (tabBarInnerWidth - tabGap) / 2;
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const returnedFromChildRef = useRef(false);

  const fetchCollectionsAndHistory = useCallback(async () => {
    const userId = user?.id;
    setFetchError(null);
    if (!userId || !isSupabaseConfigured() || !supabase) {
      setCollections([]);
      setSnapHistory([]);
      setAntiqueImageMap({});
      return;
    }
    setLoading(true);
    try {
      const [collRes, snapRes] = await Promise.all([
        supabase
          .from('collections')
          .select('id, collection_name, antiques_ids')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('snap_history')
          .select('id, image_url, antique_id, payload, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (collRes?.error) {
        console.warn('Collections fetch error:', collRes.error.message, collRes.error.code);
        setFetchError(collRes.error.message || 'Collections failed');
      }
      if (snapRes?.error) {
        console.warn('Snap history fetch error:', snapRes.error.message, snapRes.error.code);
        setFetchError(snapRes.error.message || 'Snap history failed');
      }

      const collList = collRes?.data ?? [];
      const snapList = snapRes?.data ?? [];
      setCollections(collList);
      setSnapHistory(snapList);

      const allIds = [...new Set(collList.flatMap((c) => c.antiques_ids || []).filter(Boolean))];
      if (allIds.length > 0) {
        const { data: antiques, error: antErr } = await supabase
          .from('antiques')
          .select('id, image_url')
          .in('id', allIds);
        if (antErr) console.warn('Antiques fetch error:', antErr.message);
        const map = {};
        (antiques || []).forEach((row) => {
          const url = Array.isArray(row.image_url) ? row.image_url?.[0] : row.image_url;
          map[row.id] = url || null;
        });
        setAntiqueImageMap(map);
      } else {
        setAntiqueImageMap({});
      }
    } catch (e) {
      console.warn('Fetch error:', e?.message || e);
      setFetchError(e?.message || 'Yuklashda xato');
      setCollections([]);
      setSnapHistory([]);
      setAntiqueImageMap({});
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getCollectionThumbnails = useCallback(
    (coll) => {
      const ids = (coll.antiques_ids || []).slice(0, 4);
      const thumbs = ids.map((id) => antiqueImageMap[id] ?? null);
      while (thumbs.length < 4) thumbs.push(null);
      return thumbs;
    },
    [antiqueImageMap]
  );

  useFocusEffect(
    useCallback(() => {
      if (!returnedFromChildRef.current) setActiveTab('details');
      returnedFromChildRef.current = false;
      if (!user?.id || !isSupabaseConfigured() || !supabase) {
        setCollections([]);
        setSnapHistory([]);
        setLoading(false);
        return;
      }
      fetchCollectionsAndHistory();
    }, [user?.id, fetchCollectionsAndHistory])
  );

  useEffect(() => {
    if (!showHistoryOptionsSheet) return;
    const h = Dimensions.get('window').height;
    sheetOverlayOpacity.setValue(0);
    sheetTranslateY.setValue(h);
    Animated.parallel([
      Animated.timing(sheetOverlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showHistoryOptionsSheet]);

  const closeHistoryOptionsSheet = useCallback(
    (onDone) => {
      const h = Dimensions.get('window').height;
      Animated.parallel([
        Animated.timing(sheetOverlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: h,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowHistoryOptionsSheet(false);
        setSelectedSnap(null);
        onDone?.();
      });
    },
    [sheetOverlayOpacity, sheetTranslateY]
  );

  const handleDeleteSnap = useCallback(() => {
    const snapId = selectedSnap?.id;
    if (!snapId || !supabase) return;
    closeHistoryOptionsSheet(() => {
      Alert.alert(
        'Delete snap',
        'Remove this item from your scan history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await supabase.from('snap_history').delete().eq('id', snapId);
                fetchCollectionsAndHistory();
              } catch (e) {
                console.warn('Delete snap failed:', e?.message);
              }
            },
          },
        ]
      );
    });
  }, [selectedSnap, closeHistoryOptionsSheet, supabase, fetchCollectionsAndHistory]);

  const handleCreateSpace = async () => {
    const name = spaceName.trim();
    if (!name || !user?.id || !supabase) return;
    setCreating(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('collections').insert({
        user_id: user.id,
        collection_name: name,
        antiques_ids: [],
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      setShowCreateModal(false);
      setSpaceName('');
      fetchCollectionsAndHistory();
    } catch (e) {
      console.warn(e);
    } finally {
      setCreating(false);
    }
  };

  const cardAnims = useRef(createCardAnims()).current;

  useFocusEffect(
    useCallback(() => {
      cardAnims.forEach((anim) => {
        anim.opacity.setValue(0);
        anim.translateY.setValue(36);
      });
      cardAnims.forEach((anim, i) => {
        Animated.sequence([
          Animated.delay(i * DELAY_STEP),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: ANIM_DURATION,
              easing: EASE_OUT,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: ANIM_DURATION,
              easing: EASE_OUT,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }, [cardAnims])
  );

  useEffect(() => {
    const translateX = tabIndex === 0 ? 0 : tabWidth + tabGap;
    Animated.spring(indicatorLeft, {
      toValue: translateX,
      useNativeDriver: true,
      tension: 80,
      friction: 11,
    }).start();
  }, [tabIndex, indicatorLeft, tabWidth, tabGap]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header — card 0 */}
      <Animated.View style={{ opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Collections</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={18} weight="bold" color="#fff" />
          </Pressable>
        </View>
      </Animated.View>

      {/* Tab bar — card 1 */}
      <Animated.View style={{ opacity: cardAnims[1].opacity, transform: [{ translateY: cardAnims[1].translateY }] }}>
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBarTrack}>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: tabWidth,
                  transform: [{ translateX: indicatorLeft }],
                },
              ]}
            />
            <View style={styles.tabRow}>
              {TAB_NAMES.map((name) => (
                <Pressable
                  key={name}
                  style={styles.tab}
                  onPress={() => setActiveTab(name)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === name && styles.tabTextActive,
                    ]}
                  >
                    {name === 'details' ? 'Details' : 'History'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchCollectionsAndHistory}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      >
        {activeTab === 'details' ? (
          loading && collections.length === 0 ? (
            <Animated.View
              style={[
                styles.loadingWrap,
                {
                  opacity: cardAnims[2].opacity,
                  transform: [{ translateY: cardAnims[2].translateY }],
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.brand} />
            </Animated.View>
          ) : collections.length > 0 ? (
            <View style={[styles.cardsRow, { flexWrap: 'wrap' }]}>
              {collections.map((coll, idx) => (
                <Animated.View
                  key={coll.id}
                  style={[
                    { width: (screenWidth - horizontalPadding * 2 - 12) / 2 },
                    {
                      opacity: cardAnims[Math.min(2 + idx, COLLECTION_CARD_COUNT - 1)].opacity,
                      transform: [{ translateY: cardAnims[Math.min(2 + idx, COLLECTION_CARD_COUNT - 1)].translateY }],
                    },
                  ]}
                >
                  <CollectionCard
                    title={coll.collection_name}
                    count={`${Array.isArray(coll.antiques_ids) ? coll.antiques_ids.length : 0} Items`}
                    thumbnails={getCollectionThumbnails(coll)}
                    onPress={() => {
                      returnedFromChildRef.current = true;
                      mainStack?.navigate('CollectionDetail', {
                        collectionId: coll.id,
                        collectionName: coll.collection_name,
                        antiquesIds: coll.antiques_ids || [],
                      });
                    }}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <Animated.View
              style={[
                styles.emptyHistory,
                {
                  opacity: cardAnims[2].opacity,
                  transform: [{ translateY: cardAnims[2].translateY }],
                },
              ]}
            >
              <Text style={styles.emptyHistoryText}>No collections yet</Text>
              <Text style={styles.emptyHistorySubtext}>Tap + to create a space</Text>
            </Animated.View>
          )
        ) : (
          <>
            {loading && snapHistory.length === 0 ? (
              <Animated.View
                style={[
                  styles.loadingWrap,
                  {
                    opacity: cardAnims[2].opacity,
                    transform: [{ translateY: cardAnims[2].translateY }],
                  },
                ]}
              >
                <ActivityIndicator size="large" color={colors.brand} />
              </Animated.View>
            ) : snapHistory.length === 0 ? (
              <Animated.View
                style={[
                  styles.emptyHistory,
                  {
                    opacity: cardAnims[2].opacity,
                    transform: [{ translateY: cardAnims[2].translateY }],
                  },
                ]}
              >
                <Text style={styles.emptyHistoryText}>
                  {fetchError ? 'Ma\'lumotlar yuklanmadi' : 'No scan history yet'}
                </Text>
                <Text style={styles.emptyHistorySubtext}>
                  {fetchError ? fetchError + ' — tortib yangilang yoki qayta kiring.' : 'Your snaps will appear here'}
                </Text>
              </Animated.View>
            ) : (
              snapHistory.map((snap) => {
                const category = Array.isArray(snap.payload?.category)?.[0] || snap.payload?.category || 'Antique';
                const min = snap.payload?.market_value_min;
                const max = snap.payload?.market_value_max;
                const priceStr = min != null && max != null ? `$${min} - $${max}` : '';
                return (
                  <Pressable
                    key={snap.id}
                    style={styles.historyRow}
                    onPress={() => {
                    if (snap.antique_id) {
                      returnedFromChildRef.current = true;
                      mainStack?.navigate('ItemDetails', { antiqueId: snap.antique_id, fromHistory: true });
                    }
                  }}
                  >
                    <View style={styles.historyThumbWrap}>
                      {snap.image_url ? (
                        <Image source={{ uri: snap.image_url }} style={styles.historyThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.historyThumb, styles.historyThumbEmpty]} />
                      )}
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {snap.payload?.name || 'Scan'}
                      </Text>
                      <Text style={styles.historyCategory} numberOfLines={1}>
                        {category}
                      </Text>
                      {priceStr ? (
                        <Text style={styles.historyPrice} numberOfLines={1}>
                          {priceStr}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.historyMenu}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedSnap(snap);
                        setShowHistoryOptionsSheet(true);
                      }}
                      hitSlop={12}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create Space</Text>
            <Text style={styles.modalLabel}>Name of Space</Text>
            <TextInput
              style={styles.modalInput}
              value={spaceName}
              onChangeText={setSpaceName}
              placeholder="ex: Vase Collection"
              placeholderTextColor={colors.textTertiary}
              editable={!creating}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, creating && styles.modalCreateBtnDisabled]}
                onPress={handleCreateSpace}
                disabled={creating || !spaceName.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Snap history options bottom sheet */}
      <Modal
        visible={showHistoryOptionsSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeHistoryOptionsSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: sheetOverlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeHistoryOptionsSheet()} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 24, transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Options</Text>
              <Pressable style={styles.sheetRow} onPress={handleDeleteSnap}>
                <Ionicons name="trash-outline" size={22} color={colors.red} />
                <Text style={[styles.sheetRowText, styles.sheetRowTextDanger]}>Delete</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 24,

    color: colors.textBase,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.textBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  tabBarTrack: {
    position: 'relative',
    height: 48,
    backgroundColor: colors.bgBaseElevated,
    borderRadius: 12,
    padding: 4,
  },
  tabRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textBase,
    fontFamily: fonts.semiBold,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: colors.bgWhite,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  collectionWrap: {
    marginBottom: 8,
  },
  collectionCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 24,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  collectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginTop: 12,
    marginBottom: 2,
    marginLeft: 2,
  },
  collectionCount: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
  },
  thumb: {
    borderRadius: 16,
    backgroundColor: colors.border3,
    overflow: 'hidden',
  },
  thumbEmpty: {
    backgroundColor: colors.border1,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyHistory: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyHistorySubtext: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
    marginHorizontal: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgWhite,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  historyThumbWrap: { marginRight: 12 },
  historyThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.border3,
    overflow: 'hidden',
  },
  historyThumbEmpty: {},
  historyInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 0,
  },
  historyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginBottom: 2,
  },
  historyCategory: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyPrice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.brand,
  },
  historyMenu: { padding: 4 },
  historyDate: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgWhite,
    borderRadius: 24,
    padding: 16,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.textBase,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.bgBase,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textBase,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textBase,
  },
  modalCreateBtn: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
  },
  modalCreateBtnDisabled: { opacity: 0.7 },
  modalCreateText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textWhite,
  },
  sheetOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
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
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
    gap: 12,
  },
  sheetRowText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textBase,
  },
  sheetRowTextDanger: { color: colors.red },
});

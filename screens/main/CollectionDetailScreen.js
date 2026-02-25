import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAppSettingsStore } from '../../stores/useAppSettingsStore';
import { useExchangeRatesStore } from '../../stores/useExchangeRatesStore';
import { formatPriceRangeUsd } from '../../lib/currency';

export default function CollectionDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const rates = useExchangeRatesStore((s) => s.rates);
  const displayCurrency = !rates && preferredCurrency !== 'USD' ? 'USD' : preferredCurrency;
  const rate = displayCurrency === 'USD' ? 1 : (rates?.[displayCurrency] ?? 1);
  const { collectionId, collectionName, antiquesIds } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(collectionName || 'Collection');
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showItemOptionsSheet, setShowItemOptionsSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showChangeSpaceSheet, setShowChangeSpaceSheet] = useState(false);
  const [otherCollections, setOtherCollections] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const sheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const itemSheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const itemSheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const changeSpaceSheetOverlay = useRef(new Animated.Value(0)).current;
  const changeSpaceSheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (!showOptionsSheet) return;
    sheetOverlayOpacity.setValue(0);
    sheetTranslateY.setValue(Dimensions.get('window').height);
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
  }, [showOptionsSheet]);

  useEffect(() => {
    if (!showItemOptionsSheet) return;
    const h = Dimensions.get('window').height;
    itemSheetOverlayOpacity.setValue(0);
    itemSheetTranslateY.setValue(h);
    Animated.parallel([
      Animated.timing(itemSheetOverlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(itemSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showItemOptionsSheet]);

  useEffect(() => {
    if (!showChangeSpaceSheet || !user?.id || !supabase) return;
    const h = Dimensions.get('window').height;
    changeSpaceSheetOverlay.setValue(0);
    changeSpaceSheetTranslateY.setValue(h);
    Animated.parallel([
      Animated.timing(changeSpaceSheetOverlay, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(changeSpaceSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setLoadingSpaces(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('collections')
          .select('id, collection_name, antiques_ids')
          .eq('user_id', user.id)
          .neq('id', collectionId);
        setOtherCollections(data ?? []);
      } catch (_) {
        setOtherCollections([]);
      } finally {
        setLoadingSpaces(false);
      }
    })();
  }, [showChangeSpaceSheet, user?.id, collectionId]);

  const closeOptionsSheet = useCallback(
    (onDone) => {
      Animated.parallel([
        Animated.timing(sheetOverlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowOptionsSheet(false);
        onDone?.();
      });
    },
    [sheetOverlayOpacity, sheetTranslateY]
  );

  const closeItemOptionsSheet = useCallback(
    (onDone) => {
      const h = Dimensions.get('window').height;
      Animated.parallel([
        Animated.timing(itemSheetOverlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(itemSheetTranslateY, {
          toValue: h,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowItemOptionsSheet(false);
        setSelectedItem(null);
        onDone?.();
      });
    },
    [itemSheetOverlayOpacity, itemSheetTranslateY]
  );

  const closeChangeSpaceSheet = useCallback(
    (onDone) => {
      const h = Dimensions.get('window').height;
      Animated.parallel([
        Animated.timing(changeSpaceSheetOverlay, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(changeSpaceSheetTranslateY, {
          toValue: h,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowChangeSpaceSheet(false);
        onDone?.();
      });
    },
    [changeSpaceSheetOverlay, changeSpaceSheetTranslateY]
  );

  const handleChangeSpace = useCallback(
    async (targetCollection) => {
      if (!selectedItem?.id || !collectionId || !supabase || !targetCollection?.id) return;
      setMoving(true);
      try {
        const newCurrentIds = (antiquesIds || []).filter((id) => id !== selectedItem.id);
        const targetIds = Array.isArray(targetCollection.antiques_ids) ? targetCollection.antiques_ids : [];
        const newTargetIds = targetIds.includes(selectedItem.id) ? targetIds : [...targetIds, selectedItem.id];

        await supabase.from('collections').update({
          antiques_ids: newCurrentIds,
          updated_at: new Date().toISOString(),
        }).eq('id', collectionId);

        await supabase.from('collections').update({
          antiques_ids: newTargetIds,
          updated_at: new Date().toISOString(),
        }).eq('id', targetCollection.id);

        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
        closeChangeSpaceSheet();
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to move item');
      } finally {
        setMoving(false);
      }
    },
    [selectedItem, collectionId, antiquesIds, supabase, closeChangeSpaceSheet]
  );

  const handleRemoveItemFromCollection = useCallback(() => {
    if (!selectedItem?.id || !collectionId || !supabase) return;
    closeItemOptionsSheet(() => {
      Alert.alert(
        'Remove from collection',
        `Remove "${selectedItem.name || 'this item'}" from this collection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const newIds = (antiquesIds || []).filter((id) => id !== selectedItem.id);
                const { error } = await supabase
                  .from('collections')
                  .update({
                    antiques_ids: newIds,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', collectionId);
                if (error) throw error;
                setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
              } catch (e) {
                Alert.alert('Error', e?.message || 'Failed to remove');
              }
            },
          },
        ]
      );
    });
  }, [selectedItem, collectionId, antiquesIds, supabase, closeItemOptionsSheet]);

  useFocusEffect(
    useCallback(() => {
      if (collectionName) setDisplayName(collectionName);
    }, [collectionName])
  );

  useFocusEffect(
    useCallback(() => {
      if (!collectionId || !isSupabaseConfigured() || !supabase) {
        setItems([]);
        setLoading(false);
        return;
      }
      const ids = Array.isArray(antiquesIds) ? antiquesIds.filter(Boolean) : [];
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      (async () => {
        try {
          const { data, error } = await supabase
            .from('antiques')
            .select('id, name, category, market_value_min, market_value_max, image_url')
            .in('id', ids);
          if (error) {
            setItems([]);
            return;
          }
          const byId = {};
          (data || []).forEach((row) => { byId[row.id] = row; });
          const orderNewestFirst = [...ids].reverse();
          const sorted = orderNewestFirst.map((id) => byId[id]).filter(Boolean);
          setItems(sorted);
        } catch (_) {
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, [collectionId, antiquesIds])
  );

  const openRename = () => {
    closeOptionsSheet(() => {
      setEditName(displayName);
      setShowEditModal(true);
    });
  };

  const handleSaveRename = async () => {
    const name = editName.trim();
    if (!name || !collectionId || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collections')
        .update({ collection_name: name, updated_at: new Date().toISOString() })
        .eq('id', collectionId);
      if (error) throw error;
      setDisplayName(name);
      setShowEditModal(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to rename');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = () => {
    closeOptionsSheet(() => {
      Alert.alert(
      'Delete collection',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!collectionId || !supabase) return;
            try {
              const { error } = await supabase.from('collections').delete().eq('id', collectionId);
              if (error) throw error;
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textBase} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayName}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowOptionsSheet(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.textBase} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No items in this collection</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const imageUrl = Array.isArray(item.image_url)?.[0] || item.image_url;
            const category = Array.isArray(item.category)?.[0] || item.category || 'Antique';
            const priceStr =
              item.market_value_min != null && item.market_value_max != null
                ? formatPriceRangeUsd(item.market_value_min, item.market_value_max, displayCurrency, rate)
                : '';
            return (
              <Pressable
                key={item.id}
                style={styles.itemRow}
                onPress={() =>
                  navigation.navigate('ItemDetails', {
                    antiqueId: item.id,
                    fromCollectionAntiquesIds: antiquesIds,
                  })
                }
              >
                <View style={styles.itemThumbWrap}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.itemThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemThumb, styles.itemThumbEmpty]} />
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name || 'Untitled'}
                  </Text>
                  <Text style={styles.itemCategory} numberOfLines={1}>
                    {category}
                  </Text>
                  {priceStr ? (
                    <Text style={styles.itemPrice} numberOfLines={1}>
                      {priceStr}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.itemMenu}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                    setShowItemOptionsSheet(true);
                  }}
                  hitSlop={12}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Options bottom sheet: overlay fade, sheet bottom → top */}
      <Modal
        visible={showOptionsSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeOptionsSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: sheetOverlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeOptionsSheet()} />
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
              <Pressable style={styles.sheetRow} onPress={openRename}>
                <Ionicons name="pencil-outline" size={22} color={colors.textBase} />
                <Text style={styles.sheetRowText}>Rename</Text>
              </Pressable>
              <Pressable style={styles.sheetRow} onPress={handleDeleteCollection}>
                <Ionicons name="trash-outline" size={22} color={colors.red} />
                <Text style={[styles.sheetRowText, styles.sheetRowTextDanger]}>Delete collection</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Item options bottom sheet: overlay fade, sheet bottom → top */}
      <Modal
        visible={showItemOptionsSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeItemOptionsSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: itemSheetOverlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeItemOptionsSheet()} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 24, transform: [{ translateY: itemSheetTranslateY }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Options</Text>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  closeItemOptionsSheet(() => setShowChangeSpaceSheet(true));
                }}
              >
                <Ionicons name="folder-open-outline" size={22} color={colors.textBase} />
                <Text style={styles.sheetRowText}>Change space</Text>
              </Pressable>
              <Pressable style={styles.sheetRow} onPress={handleRemoveItemFromCollection}>
                <Ionicons name="trash-outline" size={22} color={colors.red} />
                <Text style={[styles.sheetRowText, styles.sheetRowTextDanger]}>Remove from collection</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Change space bottom sheet: choose target collection */}
      <Modal
        visible={showChangeSpaceSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeChangeSpaceSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: changeSpaceSheetOverlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeChangeSpaceSheet()} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 24, maxHeight: '70%', transform: [{ translateY: changeSpaceSheetTranslateY }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Change space</Text>
              {loadingSpaces ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : otherCollections.length === 0 ? (
                <Text style={styles.sheetEmptyText}>No other spaces. Create one from Collections.</Text>
              ) : (
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  {otherCollections.map((coll) => (
                    <Pressable
                      key={coll.id}
                      style={styles.sheetRow}
                      onPress={() => handleChangeSpace(coll)}
                      disabled={moving}
                    >
                      <Ionicons name="folder-outline" size={22} color={colors.textBase} />
                      <Text style={styles.sheetRowText} numberOfLines={1}>
                        {coll.collection_name || 'Collection'}
                      </Text>
                      <Text style={styles.sheetRowSubtext}>
                        {Array.isArray(coll.antiques_ids) ? coll.antiques_ids.length : 0} items
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Space modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit Space</Text>
            <Text style={styles.modalLabel}>Name of Space</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="ex: Vase Collection"
              placeholderTextColor={colors.textTertiary}
              editable={!saving}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, saving && styles.modalCreateBtnDisabled]}
                onPress={handleSaveRename}
                disabled={saving || !editName.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalCreateText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    textAlign: 'center',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, fontFamily: fonts.regular, color: colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  itemRow: {
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
  itemThumbWrap: { marginRight: 12 },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.border3,
  },
  itemThumbEmpty: {},
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginBottom: 2,
  },
  itemCategory: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemPrice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.brand,
  },
  itemMenu: { padding: 4 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
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
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textBase,
  },
  sheetRowTextDanger: { color: colors.red },
  sheetRowSubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textTertiary,
  },
  sheetLoading: { paddingVertical: 24, alignItems: 'center' },
  sheetEmptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  sheetScroll: { maxHeight: 320 },
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
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textBase,
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textBase,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textBase,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.border3,
  },
  modalCancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textBase,
  },
  modalCreateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    minWidth: 88,
    alignItems: 'center',
  },
  modalCreateBtnDisabled: { opacity: 0.7 },
  modalCreateText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textWhite,
  },
});

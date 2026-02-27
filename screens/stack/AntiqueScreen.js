import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Linking,
  Share,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  XCircle,
  CheckCircle,
  X,
  DotsThreeOutlineIcon,
  CalendarBlank,
  Medal,
  TrendUp,
  MapPin,
  PlusCircle,
  FolderSimpleIcon,
  Cube,
  Eye,
  ArrowSquareOut,
  ShareNetwork,
  Trash,
} from "phosphor-react-native";
import { useColors, fonts } from "../../theme";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppSettingsStore } from "../../stores/useAppSettingsStore";
import { useExchangeRatesStore } from "../../stores/useExchangeRatesStore";
import {
  formatPrice as formatPriceWithCurrency,
  formatPriceRangeUsd,
  formatPriceUsd,
} from "../../lib/currency";
import { requestAppReview } from "../../lib/requestAppReview";
import {
  fetchMarketPricesFromEbay,
  buildEbaySearchQueryFromAntique,
} from "../../lib/ebay";

const TAB_NAMES = ["details", "condition", "history"];

function ConditionRow({ label, status, statusStyle, note, styles, colors }) {
  const isBad = statusStyle === "bad";
  const isNeutral = statusStyle === "neutral";
  const iconColor = isBad
    ? colors.red
    : isNeutral
      ? colors.brand
      : colors.green;
  const iconBgStyle = isBad
    ? styles.conditionRowIconBad
    : isNeutral
      ? styles.conditionRowIconNeutral
      : null;
  return (
    <View style={styles.conditionRow}>
      <View style={[styles.conditionRowIcon, iconBgStyle]}>
        {isBad ? (
          <XCircle size={18} color={iconColor} />
        ) : (
          <CheckCircle size={18} color={iconColor} />
        )}
      </View>
      <View style={styles.conditionRowBody}>
        <View style={styles.conditionRowHeader}>
          <Text style={styles.conditionRowLabel}>{label}</Text>
          <View
            style={[
              styles.conditionRowStatusBadge,
              statusStyle === "bad" && styles.conditionRowStatusBadgeBad,
              statusStyle === "neutral" &&
                styles.conditionRowStatusBadgeNeutral,
            ]}
          >
            <Text
              style={[
                styles.conditionRowStatusText,
                statusStyle === "bad" && styles.conditionRowStatusTextBad,
                statusStyle === "neutral" &&
                  styles.conditionRowStatusTextNeutral,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>
        {note ? <Text style={styles.conditionRowNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function TimelineItem({ Icon, title, subtitle, isFirst, isLast, styles, colors }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        {!isFirst && <View style={styles.timelineLine} />}
        <View style={styles.timelineDot}>
          <Icon size={18} color={colors.textInverse} />
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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AntiqueScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const IMAGE_SIZE = width;
  const COLLAPSED_Y = IMAGE_SIZE - 20;
  const EXPANDED_Y = 0;

  const {
    antiqueId,
    antique: antiqueParam,
    fromScan,
    fromHistory,
    fromCollectionAntiquesIds,
    fromCollectionId,
  } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const hasShownRateAfterFirstScan = useAppSettingsStore(
    (s) => s.hasShownRateAfterFirstScan,
  );
  const setHasShownRateAfterFirstScan = useAppSettingsStore(
    (s) => s.setHasShownRateAfterFirstScan,
  );
  const rates = useExchangeRatesStore((s) => s.rates);
  const displayCurrency =
    !rates && preferredCurrency !== "USD" ? "USD" : preferredCurrency;
  const rate = displayCurrency === "USD" ? 1 : (rates?.[displayCurrency] ?? 1);
  const [antique, setAntique] = useState(antiqueParam || null);
  const [loading, setLoading] = useState(!antiqueParam && !!antiqueId);
  const [activeTab, setActiveTab] = useState("details");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [inAnyCollection, setInAnyCollection] = useState(false);
  const [collectionForLink, setCollectionForLink] = useState(null);
  const [ebayItems, setEbayItems] = useState([]);
  const [ebayLinks, setEbayLinks] = useState([]);
  const [loadingEbay, setLoadingEbay] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const sheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;
  const optionsSheetOverlay = useRef(new Animated.Value(0)).current;
  const optionsSheetTranslateY = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  // Content sheet (PlantScreen-style: collapsed/expanded)
  // Sheet ochiq/yopiq — bitta state: isExpanded (true = ochiq, false = yopiq). isExpandedRef sync uchun (PanResponder/callback larda).
  const sheetY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const expandProgress = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);
  const scrollRef = useRef(null);
  const contentScrollYRef = useRef(0);

  const closeBtnImageOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const closeBtnStickyOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const spacerHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, insets.top + 8],
  });
  const handleOpacity = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const handleAnimHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });
  const handlePadding = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });
  /** X va dots qatori: yopiqda joy olmaydi, ochilishda paydo bo‘ladi */
  const headerRowHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });
  const sheetPaddingTop = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const handleMarginBottom = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const tabIndicatorLeft = useRef(
    new Animated.Value(
      (() => {
        const w = Dimensions.get("window").width;
        return ((w - 32 - 8) / 3) * 1; // condition = index 1
      })(),
    ),
  ).current;
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslateY = useRef(new Animated.Value(0)).current;
  const isInCurrentCollection =
    Array.isArray(fromCollectionAntiquesIds) &&
    antique?.id != null &&
    fromCollectionAntiquesIds.includes(antique.id);

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
        .from("antiques")
        .select("*")
        .eq("id", antiqueId)
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
      .from("collections")
      .select("id, collection_name, antiques_ids")
      .eq("user_id", user.id);
    const list = data ?? [];
    const aid = antique.id;
    const found = list.find(
      (c) => Array.isArray(c.antiques_ids) && c.antiques_ids.includes(aid),
    );
    setInAnyCollection(!!found);
    setCollectionForLink(found ?? null);
  }, [antique?.id, user?.id]);

  useEffect(() => {
    refreshCollectionStatus();
  }, [refreshCollectionStatus]);

  // eBay: agar specification da ebay ma’lumoti yo‘q bo‘lsa, antique nomi bo‘yicha qidiruv
  useEffect(() => {
    if (!antique) return;
    const spec = antique.specification ?? {};
    const hasStored =
      (Array.isArray(spec.ebay_links) && spec.ebay_links.length > 0) ||
      (Array.isArray(spec.ebay_items) && spec.ebay_items.length > 0);
    if (hasStored) return;
    const query = buildEbaySearchQueryFromAntique(antique);
    if (!query.trim()) return;
    let cancelled = false;
    setLoadingEbay(true);
    fetchMarketPricesFromEbay(query)
      .then((res) => {
        if (cancelled) return;
        setEbayLinks(res.ebay_links ?? []);
        setEbayItems(res.ebay_items ?? []);
      })
      .catch(() => {
        if (!cancelled) setEbayLinks([]);
        if (!cancelled) setEbayItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEbay(false);
      });
    return () => {
      cancelled = true;
    };
  }, [antique?.id, antique?.name, antique?.specification]);

  const displayEbayLinks =
    antique?.specification?.ebay_links?.length > 0
      ? antique.specification.ebay_links
      : ebayLinks;
  const displayEbayItems =
    antique?.specification?.ebay_items?.length > 0
      ? antique.specification.ebay_items
      : ebayItems;
  const hasEbayData =
    displayEbayLinks.length > 0 || displayEbayItems.length > 0;
  const firstEbayUrl =
    displayEbayLinks[0] ?? displayEbayItems[0]?.itemWebUrl ?? null;

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent?.(true);
      RNStatusBar.setBackgroundColor?.("transparent");
    }
  }, []);

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
    const runTabSwitch = () => {
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
    if (!isExpandedRef.current) {
      doExpand(runTabSwitch);
    } else {
      runTabSwitch();
    }
  };

  useEffect(() => {
    if (!showAddSheet || !user?.id || !supabase) return;
    const h = Dimensions.get("window").height;
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
    setLoadingCollections(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("collections")
          .select("id, collection_name, antiques_ids")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
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
      const h = Dimensions.get("window").height;
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
        setShowAddSheet(false);
        onDone?.();
      });
    },
    [sheetOverlayOpacity, sheetTranslateY],
  );

  const handleOpenAddSheet = () => {
    if (!user?.id || !antique?.id) {
      Alert.alert(
        "Login required",
        "Please sign in to add items to a collection.",
      );
      return;
    }
    setShowAddSheet(true);
  };

  const openOptionsSheet = useCallback(() => {
    setShowOptionsSheet(true);
  }, []);

  const closeOptionsSheet = useCallback(() => {
    const h = Dimensions.get("window").height;
    Animated.parallel([
      Animated.timing(optionsSheetOverlay, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(optionsSheetTranslateY, {
        toValue: h,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowOptionsSheet(false));
  }, [optionsSheetOverlay, optionsSheetTranslateY]);

  useEffect(() => {
    if (!showOptionsSheet) return;
    const h = Dimensions.get("window").height;
    optionsSheetOverlay.setValue(0);
    optionsSheetTranslateY.setValue(h);
    Animated.parallel([
      Animated.timing(optionsSheetOverlay, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(optionsSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showOptionsSheet, optionsSheetOverlay, optionsSheetTranslateY]);

  const doExpand = useCallback(
    (onDone) => {
      isExpandedRef.current = true;
      setIsExpanded(true);
      Animated.spring(sheetY, {
        toValue: EXPANDED_Y,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => onDone?.());
      Animated.timing(expandProgress, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    },
    [sheetY, expandProgress],
  );

  const doCollapse = useCallback(() => {
    isExpandedRef.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.spring(sheetY, {
      toValue: COLLAPSED_Y,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    Animated.timing(expandProgress, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  }, [sheetY, expandProgress]);

  const doExpandRef = useRef(doExpand);
  const doCollapseRef = useRef(doCollapse);
  doExpandRef.current = doExpand;
  doCollapseRef.current = doCollapse;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && Math.abs(gs.dy) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -50 && !isExpandedRef.current) {
          doExpandRef.current?.();
        } else if (
          gs.dy > 50 &&
          isExpandedRef.current &&
          contentScrollYRef.current <= 0
        ) {
          doCollapseRef.current?.();
        }
      },
    }),
  ).current;

  /** Closed holatda content ustida tepaga swipe → sheet ochiladi; expanded da scroll ishlashi uchun tutmaydi */
  const contentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (isExpandedRef.current) return false;
        return Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && Math.abs(gs.dy) > 10;
      },
      onPanResponderRelease: (_, gs) => {
        if (!isExpandedRef.current && gs.dy < -50) doExpandRef.current?.();
      },
    }),
  ).current;

  const handleContentScrollEndDrag = useCallback(
    (e) => {
      if (!isExpandedRef.current) return;
      const y = e.nativeEvent.contentOffset.y;
      if (y > 0) return;
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (y <= -30 || (y <= 0 && vy < -1.5)) {
        doCollapse();
      }
    },
    [doCollapse],
  );

  const handleContentScroll = useCallback((e) => {
    contentScrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const showChangeCollection =
    !fromHistory && !!user?.id && !!antique?.id && inAnyCollection;

  const handleChangeCollection = useCallback(() => {
    closeOptionsSheet();
    if (user?.id && antique?.id) {
      setTimeout(() => setShowAddSheet(true), 280);
    }
  }, [closeOptionsSheet, user?.id, antique?.id]);

  const handleShare = useCallback(async () => {
    closeOptionsSheet();
    try {
      await Share.share({
        message: antique?.name
          ? `${antique.name} – Antique item from Antique app`
          : "Check out this antique from Antique app",
        title: antique?.name || "Antique",
      });
    } catch (_) {}
  }, [closeOptionsSheet, antique?.name]);

  const handleDelete = useCallback(() => {
    closeOptionsSheet();
    if (fromHistory) {
      Alert.alert(
        "Remove from history",
        "Remove this item from your scan history?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              if (!user?.id || !antique?.id || !supabase) return;
              try {
                const { error } = await supabase
                  .from("snap_history")
                  .delete()
                  .eq("user_id", user.id)
                  .eq("antique_id", antique.id);
                if (error) throw error;
                navigation.goBack();
              } catch (e) {
                Alert.alert(
                  "Error",
                  e?.message || "Failed to remove from history",
                );
              }
            },
          },
        ],
      );
      return;
    }
    if (fromCollectionId) {
      Alert.alert(
        "Remove from collection",
        "Remove this item from the collection?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              if (!fromCollectionId || !antique?.id || !supabase) return;
              try {
                const ids = Array.isArray(fromCollectionAntiquesIds)
                  ? fromCollectionAntiquesIds
                  : [];
                const newIds = ids.filter((id) => id !== antique.id);
                const { error } = await supabase
                  .from("collections")
                  .update({
                    antiques_ids: newIds,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", fromCollectionId);
                if (error) throw error;
                navigation.goBack();
              } catch (e) {
                Alert.alert(
                  "Error",
                  e?.message || "Failed to remove from collection",
                );
              }
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      "Delete item",
      "Permanently delete this item? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!antique?.id || !supabase) return;
            try {
              const { error } = await supabase
                .from("antiques")
                .delete()
                .eq("id", antique.id);
              if (error) throw error;
              navigation.goBack();
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to delete");
            }
          },
        },
      ],
    );
  }, [
    closeOptionsSheet,
    fromHistory,
    fromCollectionId,
    fromCollectionAntiquesIds,
    user?.id,
    antique?.id,
    supabase,
    navigation,
  ]);

  const addAntiqueToCollection = useCallback(
    async (coll) => {
      if (!antique?.id || !supabase) return;
      const ids = Array.isArray(coll.antiques_ids) ? coll.antiques_ids : [];
      if (ids.includes(antique.id)) {
        Alert.alert(
          "Already added",
          "This item is already in this collection.",
        );
        return;
      }
      try {
        const { error } = await supabase
          .from("collections")
          .update({
            antiques_ids: [...ids, antique.id],
            updated_at: new Date().toISOString(),
          })
          .eq("id", coll.id);
        if (error) throw error;
        await refreshCollectionStatus();
        closeAddSheet();
        Alert.alert("Added", "Item added to collection.");
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to add to collection");
      }
    },
    [antique?.id, supabase, closeAddSheet, refreshCollectionStatus],
  );

  const handleCreateNewCollection = useCallback(async () => {
    if (!user?.id || !antique?.id || !supabase) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("collections").insert({
        user_id: user.id,
        collection_name: "My Collection",
        antiques_ids: [antique.id],
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      await refreshCollectionStatus();
      closeAddSheet();
      Alert.alert("Added", "New collection created and item added.");
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to create collection");
    }
  }, [user?.id, antique?.id, supabase, closeAddSheet, refreshCollectionStatus]);

  if (loading) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!antique) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        <Text style={styles.emptyText}>Item not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl =
    Array.isArray(antique.image_url)?.[0] || antique.image_url || null;
  const ageYrs = antique.estimated_age_years ?? 0;
  const rarityScore = antique.rarity_score ?? 0;
  const rarityMax = antique.rarity_max_score ?? 10;
  const growthPct =
    antique.avg_growth_percentage != null
      ? (antique.avg_growth_percentage * 100).toFixed(0)
      : "0";
  const getConditionStyle = (label, s) => {
    if (!s || s === "N/A") return "bad";
    const lower = s.toLowerCase();
    if (lower === "excellent") return "good";
    if (lower === "good") return label === "Dial & Hands" ? "neutral" : "good";
    return "bad"; // fair, poor, etc.
  };

  const SPEC_LABELS = {
    case_material: "Case Material",
    glass_type: "Glass Type",
    construction: "Construction",
    era: "Era",
    style: "Style",
    dimensions: "Dimensions",
  };
  const getSpecificationRows = (a) => {
    const spec = a?.specification;
    const isEmpty =
      !spec ||
      (typeof spec === "object" &&
        !Array.isArray(spec) &&
        Object.keys(spec).length === 0);
    if (isEmpty) {
      const rows = [
        {
          key: "Case Material",
          value:
            (Array.isArray(a?.category) ? a.category[0] : a?.category) || null,
        },
        {
          key: "Era",
          value: [a?.period_start_year, a?.period_end_year].filter(Boolean)
            .length
            ? `${a.period_start_year} – ${a.period_end_year}`
            : null,
        },
        { key: "Origin", value: a?.origin_country || null },
      ].filter((r) => r.value);
      return rows.length ? rows : [{ key: "—", value: "No specification" }];
    }
    if (Array.isArray(spec))
      return spec.map(({ key, value }) => ({
        key: key || "—",
        value: value ?? "—",
      }));
    return Object.entries(spec)
      .filter(
        ([k]) =>
          k !== "ebay_links" &&
          k !== "ebay_items" &&
          k !== "estimated_market_value_usd" &&
          k !== "estimated_market_value_low_usd" &&
          k !== "estimated_market_value_high_usd",
      )
      .map(([k, v]) => ({
        key:
          SPEC_LABELS[k] ||
          k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: v ?? "—",
      }));
  };

  const buildOriginProvenanceFallback = (a) => {
    const place = a?.origin_country || "Unknown";
    const period = [a?.period_start_year, a?.period_end_year].filter(Boolean)
      .length
      ? `${a.period_start_year}–${a.period_end_year}`
      : "";
    return period
      ? `Likely from ${place} (${period}). ${a?.description || ""}`.trim()
      : a?.description || "No origin information.";
  };

  const formatHistoryDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return "—";
    }
  };

  const formatPurchasePrice = (v) => {
    if (v == null || v === "") return "—";
    const converted = rate * Number(v);
    if (Number.isNaN(converted)) return "—";
    return formatPriceWithCurrency(converted, displayCurrency);
  };

  const cardWidth = (width - 32 - 16) / 3;
  const geminiEstimate =
    antique.specification?.estimated_market_value_usd != null
      ? Number(antique.specification.estimated_market_value_usd)
      : null;
  const geminiLow =
    antique.specification?.estimated_market_value_low_usd != null
      ? Number(antique.specification.estimated_market_value_low_usd)
      : null;
  const geminiHigh =
    antique.specification?.estimated_market_value_high_usd != null
      ? Number(antique.specification.estimated_market_value_high_usd)
      : null;
  // Current market value: eBay low yoki 0 bo‘lsa Gemini
  const displayPriceUsd =
    antique.market_value_min != null && Number(antique.market_value_min) > 0
      ? Number(antique.market_value_min)
      : (geminiEstimate ?? 0);
  // Low / High: eBay dan; 0 bo‘lsa Gemini’dan (low_usd, high_usd yoki bitta estimated)
  const displayLowUsd =
    antique.market_value_min != null && Number(antique.market_value_min) > 0
      ? Number(antique.market_value_min)
      : (geminiLow ?? geminiEstimate ?? 0);
  const displayHighUsd =
    antique.market_value_max != null && Number(antique.market_value_max) > 0
      ? Number(antique.market_value_max)
      : (geminiHigh ?? geminiEstimate ?? 0);

  const handleClose = async () => {
    if (fromScan && !hasShownRateAfterFirstScan) {
      await requestAppReview();
      setHasShownRateAfterFirstScan(true);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      {/* Image area: 1:1, rasm status bar ostiga kiradi */}
      <View style={[styles.imageArea, { height: IMAGE_SIZE }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.heroImage,
              { width: IMAGE_SIZE, height: IMAGE_SIZE },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.heroImage,
              styles.placeholderImage,
              { width: IMAGE_SIZE, height: IMAGE_SIZE },
            ]}
          />
        )}
      </View>

      {/* Header over image (visible when sheet collapsed) */}
      <View
        style={[styles.header, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View style={{ opacity: closeBtnImageOpacity }}>
          <TouchableOpacity onPress={handleClose} style={styles.headerCloseBtn}>
            <X size={20} color={colors.textBase} weight="bold" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ opacity: closeBtnImageOpacity }}>
          <TouchableOpacity
            onPress={openOptionsSheet}
            style={styles.headerMenuBtn}
            accessibilityLabel="More options"
          >
            <DotsThreeOutlineIcon
              size={22}
              color={colors.textBase}
              weight="fill"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Content sheet: faqat sheetY (native driver) tashqi viewda; expandProgress (JS driver) ichki viewda */}
      <Animated.View
        style={[
          styles.contentSheet,
          {
            transform: [{ translateY: sheetY }],
            backgroundColor: colors.bgBase,
          },
        ]}
      >
        <Animated.View style={{ flex: 1, paddingTop: sheetPaddingTop }}>
        <Animated.View {...panResponder.panHandlers} collapsable={false}>
          <Animated.View style={{ height: spacerHeight,}} />
          <Animated.View
            style={[
              styles.handleWrap,
              { opacity: handleOpacity, paddingVertical: handlePadding },
            ]}
          >
            <Animated.View
              style={[
                styles.headerHandle,
                { height: handleAnimHeight, backgroundColor: colors.border2, marginBottom: handleMarginBottom },
              ]}
            />
          </Animated.View>
          {/* X va dots: yopiqda joy olmaydi (height 0), ochilish animatsiyasida paydo bo‘ladi */}
          <Animated.View style={[styles.sheetHeaderRowWrap, { height: headerRowHeight }]}>
            <View style={styles.sheetHeaderRow}>
              <Animated.View style={{ opacity: closeBtnStickyOpacity }}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.headerCloseBtn}
                >
                  <X size={20} color={colors.textBase} weight="bold" />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ opacity: closeBtnStickyOpacity }}>
                <TouchableOpacity
                  onPress={openOptionsSheet}
                  style={styles.headerMenuBtn}
                  accessibilityLabel="More options"
                >
                  <DotsThreeOutlineIcon
                    size={22}
                    color={colors.textBase}
                    weight="fill"
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>

        <View
          style={styles.contentScrollWrap}
          {...contentPanResponder.panHandlers}
        >
          <ScrollView
            ref={scrollRef}
            scrollEnabled={isExpanded}
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.contentScrollContent,
              { paddingBottom: insets.bottom + 70 },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleContentScroll}
            onScrollEndDrag={handleContentScrollEndDrag}
            scrollEventThrottle={16}
            bounces
          >
            <View
              style={[styles.contentArea, { backgroundColor: colors.bgBase }]}
            >
              <View style={styles.titleBlock}>
                <Text style={styles.name}>{antique.name}</Text>
                <Text style={styles.originLine}>
                  {antique.origin_country ?? "Unknown"} ·{" "}
                  {antique.period_start_year ?? 0} –{" "}
                  {antique.period_end_year ?? 0} yrs
                </Text>
              </View>

              <View style={styles.metricRow}>
                <View style={[styles.metricCard, { width: cardWidth }]}>
                  <CalendarBlank size={24} color={colors.brand} />
                  <Text style={styles.metricLabel}>Age</Text>
                  <Text style={styles.metricValue}>{ageYrs} yrs</Text>
                </View>
                <View style={[styles.metricCard, { width: cardWidth }]}>
                  <Medal size={24} color={colors.brand} />
                  <Text style={styles.metricLabel}>Rarity</Text>
                  <Text style={styles.metricValue}>
                    {rarityScore} / {rarityMax}
                  </Text>
                </View>
                <View style={[styles.metricCard, { width: cardWidth }]}>
                  <CheckCircle size={24} color={colors.brand} />
                  <Text style={styles.metricLabel}>Condition</Text>
                  <Text style={styles.metricValue}>
                    {antique.overall_condition_summary ?? "Good"}
                  </Text>
                </View>
              </View>

              <View style={styles.marketValueCard}>
                <View style={styles.marketValueHeader}>
                  <TrendUp size={20} color={colors.brand} />
                  <Text style={styles.marketValueTitle}>Market Analysis</Text>
                  <View style={styles.marketValueLiveTag}>
                    <Text style={styles.marketValueLiveText}>LIVE DATA</Text>
                  </View>
                </View>
                <View style={styles.marketValueCurrentBlock}>
                  <Text style={styles.marketValueCurrentLabel}>
                    Current market value
                  </Text>
                  <Text style={styles.marketValueCurrentValue}>
                    {displayPriceUsd > 0
                      ? formatPriceUsd(displayPriceUsd, displayCurrency, rate)
                      : "—"}
                  </Text>
                </View>
                <View style={styles.marketValueLowHighRow}>
                  <View style={styles.marketValueLowHighBlock}>
                    <Text style={styles.marketValueLowHighLabel}>Low</Text>
                    <Text style={styles.marketValueLowHighValue}>
                      {displayLowUsd > 0
                        ? formatPriceUsd(displayLowUsd, displayCurrency, rate)
                        : "—"}
                    </Text>
                  </View>
                  <View style={styles.marketValueLowHighBlock}>
                    <Text style={styles.marketValueLowHighLabel}>High</Text>
                    <Text style={styles.marketValueLowHighValue}>
                      {displayHighUsd > 0
                        ? formatPriceUsd(displayHighUsd, displayCurrency, rate)
                        : "—"}
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
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab && styles.tabTextActive,
                      ]}
                    >
                      {tab === "details"
                        ? "Details"
                        : tab === "condition"
                          ? "Condition"
                          : "History"}
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
                {activeTab === "details" && (
                  <View style={styles.tabPanel}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.bodyText}>
                      {antique.description || "No description available."}
                    </Text>

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                      Specification
                    </Text>
                    <View style={styles.specList}>
                      {getSpecificationRows(antique).map(
                        ({ key: specKey, value }) => (
                          <View key={specKey} style={styles.specRow}>
                            <Text style={styles.specLabel}>{specKey}</Text>
                            <Text style={styles.specValue}>{value}</Text>
                          </View>
                        ),
                      )}
                    </View>

                    <View style={styles.originCard}>
                      <View style={styles.originTitleRow}>
                        <MapPin size={18} color={colors.textBase} />
                        <Text style={styles.originTitle}>
                          Origin & Provenance
                        </Text>
                      </View>
                      <Text style={styles.originText}>
                        {antique.origin_provenance ||
                          buildOriginProvenanceFallback(antique)}
                      </Text>
                    </View>
                  </View>
                )}

                {activeTab === "condition" && (
                  <View style={styles.tabPanel}>
                    <View style={styles.conditionGradeBlock}>
                      <View style={styles.conditionGradeCircle}>
                        <Text style={styles.conditionGradeText}>
                          {antique.condition_grade ?? "B+"}
                        </Text>
                      </View>
                      <Text style={styles.conditionOverallTitle}>
                        Overall Condition:{" "}
                        {antique.overall_condition_summary ?? "Good"}
                      </Text>
                      <Text style={styles.conditionOverallSubtitle}>
                        {antique.condition_description ||
                          "Well-preserved with age-appropriate wear"}
                      </Text>
                    </View>
                    <View style={styles.conditionList}>
                      <ConditionRow
                        label="Mechanical Function"
                        status={antique.mechanical_function_status ?? "N/A"}
                        statusStyle={getConditionStyle(
                          "Mechanical Function",
                          antique.mechanical_function_status,
                        )}
                        note={antique.mechanical_function_notes}
                        styles={styles}
                        colors={colors}
                      />
                      <ConditionRow
                        label="Case Condition"
                        status={antique.case_condition_status ?? "N/A"}
                        statusStyle={getConditionStyle(
                          "Case Condition",
                          antique.case_condition_status,
                        )}
                        note={antique.case_condition_notes}
                        styles={styles}
                        colors={colors}
                      />
                      <ConditionRow
                        label="Dial & Hands"
                        status={antique.dial_hands_condition_status ?? "N/A"}
                        statusStyle={getConditionStyle(
                          "Dial & Hands",
                          antique.dial_hands_condition_status,
                        )}
                        note={antique.dial_hands_condition_notes}
                        styles={styles}
                        colors={colors}
                      />
                      <ConditionRow
                        label="Crystal"
                        status={antique.crystal_condition_status ?? "N/A"}
                        statusStyle={getConditionStyle(
                          "Crystal",
                          antique.crystal_condition_status,
                        )}
                        note={antique.crystal_condition_notes}
                        styles={styles}
                        colors={colors}
                      />
                    </View>
                  </View>
                )}

                {activeTab === "history" && (
                  <View style={styles.tabPanel}>
                    <Text style={styles.sectionTitle}>Acquisition Details</Text>
                    <View style={styles.acquisitionRows}>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Date Added</Text>
                        <Text style={styles.metaValue}>
                          {formatHistoryDate(antique.created_at)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Source</Text>
                        <Text style={styles.metaValue}>
                          {antique.source || "AI Analysis"}
                        </Text>
                      </View>
                      <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.metaLabel}>Purchase Price</Text>
                        <Text style={styles.metaValue}>
                          {formatPurchasePrice(antique.purchase_price)}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                      Item Timeline
                    </Text>
                    <View style={styles.timeline}>
                      <TimelineItem
                        Icon={Cube}
                        title="Manufactured"
                        subtitle={`${antique.period_start_year || "?"}–${antique.period_end_year || "?"} • ${antique.origin_country || "Unknown"}`}
                        isFirst
                        isLast={false}
                        styles={styles}
                        colors={colors}
                      />
                      <TimelineItem
                        Icon={Eye}
                        title="Identified"
                        subtitle={`${formatHistoryDate(antique.created_at)} • AI Analysis`}
                        isFirst={false}
                        isLast={false}
                        styles={styles}
                        colors={colors}
                      />
                      <TimelineItem
                        Icon={CheckCircle}
                        title="Condition Assessed"
                        subtitle={`${formatHistoryDate(antique.created_at)} • Grade: ${antique.overall_condition_summary || "Good"} (${antique.condition_grade || "B+"})`}
                        isFirst={false}
                        isLast
                        styles={styles}
                        colors={colors}
                      />
                    </View>
                  </View>
                )}
              </Animated.View>

              {/* Sahifa oxirida: eBay’da sotib olish */}
              {loadingEbay ? (
                <View style={[styles.ebayCard, styles.ebayCardLoading]}>
                  <ActivityIndicator size="small" color={colors.brand} />
                  <Text style={styles.ebayLoadingText}>Loading eBay…</Text>
                </View>
              ) : hasEbayData && firstEbayUrl ? (
                <View style={styles.ebayCard}>
                  <Text style={styles.ebaySectionTitle}>
                    Buy this product on eBay
                  </Text>
                  <Text style={styles.ebayCardSubtext}>
                    Shu mahsulotni eBay’da sotib olish mumkin
                  </Text>
                  <TouchableOpacity
                    style={styles.ebayPrimaryBtn}
                    onPress={() => Linking.openURL(firstEbayUrl)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.ebayPrimaryBtnContent}>
                      <ArrowSquareOut size={20} color={colors.textWhite} />
                      <Text style={styles.ebayPrimaryBtnText}>
                        Open on eBay
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
        </Animated.View>
      </Animated.View>

      {/* Footer har doim ekran pastida ko‘rinadi (collapsed/expanded) */}
      {!isInCurrentCollection && (
        <View
          style={[
            styles.footer,
            styles.footerFixed,
            { paddingBottom: insets.bottom },
          ]}
        >
          {inAnyCollection ? (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                if (collectionForLink) {
                  navigation.navigate("CollectionDetail", {
                    collectionId: collectionForLink.id,
                    collectionName: collectionForLink.collection_name,
                    antiquesIds: collectionForLink.antiques_ids || [],
                  });
                } else {
                  navigation.navigate("MainTabs", { screen: "Collection" });
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

      {/* Options bottom sheet: Change Collection, Share, Delete */}
      <Modal
        visible={showOptionsSheet}
        transparent
        animationType="none"
        onRequestClose={closeOptionsSheet}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.sheetOverlay,
              { opacity: optionsSheetOverlay },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeOptionsSheet}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              styles.optionsSheet,
              {
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY: optionsSheetTranslateY }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              {showChangeCollection && (
                <Pressable
                  style={styles.optionsSheetRow}
                  onPress={handleChangeCollection}
                >
                  <FolderSimpleIcon
                    size={22}
                    color={colors.textBase}
                    weight="bold"
                  />
                  <Text style={styles.optionsSheetRowText}>
                    Change Collection
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.optionsSheetRow} onPress={handleShare}>
                <ShareNetwork size={22} color={colors.textBase} weight="bold" />
                <Text style={styles.optionsSheetRowText}>Share</Text>
              </Pressable>
              <Pressable
                style={[styles.optionsSheetRow, styles.optionsSheetRowDanger]}
                onPress={handleDelete}
              >
                <Trash size={22} color={colors.red} weight="bold" />
                <Text
                  style={[
                    styles.optionsSheetRowText,
                    styles.optionsSheetRowTextDanger,
                  ]}
                >
                  {fromHistory
                    ? "Remove from history"
                    : fromCollectionId
                      ? "Remove from collection"
                      : "Delete item"}
                </Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showAddSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeAddSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.sheetOverlay,
              { opacity: sheetOverlayOpacity },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closeAddSheet()}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom,
                maxHeight: "70%",
                transform: [{ translateY: sheetTranslateY }],
              },
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
                  <Pressable
                    style={[styles.sheetRow, styles.sheetRowCreate]}
                    onPress={handleCreateNewCollection}
                  >
                    <PlusCircle size={22} color={colors.brand} weight="bold" />
                    <Text
                      style={[styles.sheetRowText, { color: colors.brand }]}
                    >
                      Create new collection
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView
                  style={styles.sheetScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {collections.map((coll) => {
                    const ids = Array.isArray(coll.antiques_ids)
                      ? coll.antiques_ids
                      : [];
                    const alreadyIn =
                      antique?.id != null && ids.includes(antique.id);
                    return (
                      <Pressable
                        key={coll.id}
                        style={styles.sheetRow}
                        onPress={() =>
                          alreadyIn
                            ? Alert.alert(
                                "Already added",
                                "This item is already in this collection.",
                              )
                            : addAntiqueToCollection(coll)
                        }
                      >
                        {alreadyIn ? (
                          <CheckCircle size={22} color={colors.green} />
                        ) : (
                          <FolderSimpleIcon
                            size={22}
                            color={colors.textBase}
                            weight="bold"
                          />
                        )}
                        <Text style={styles.sheetRowText} numberOfLines={1}>
                          {coll.collection_name || "Collection"}
                        </Text>
                        <Text style={styles.sheetRowSubtext}>
                          {ids.length} items
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={[styles.sheetRow, styles.sheetRowCreate]}
                    onPress={handleCreateNewCollection}
                  >
                    <PlusCircle size={22} color={colors.brand} />
                    <Text
                      style={[styles.sheetRowText, { color: colors.brand }]}
                    >
                      Create new collection
                    </Text>
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

function createStyles(colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { justifyContent: "center", alignItems: "center" },
  imageArea: {
    width: "100%",
    backgroundColor: colors.bgBaseElevated,
  },
  heroImage: {
    width: "100%",
    backgroundColor: colors.bgBaseElevated,
  },
  contentSheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleWrap: {
    alignSelf: "center",
  },
  headerHandle: {
    width: 40,
    borderRadius: 3,
    overflow: "hidden",
  },
  sheetHeaderRowWrap: {
    overflow: "hidden",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  contentScrollWrap: { flex: 1 },
  contentScroll: { flex: 1 },
  contentScrollContent: { paddingTop: 0 },
  contentArea: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 0, paddingTop: 0 },
  mainImage: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    // backgroundColor: colors.border1,
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  marketValueHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
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
    flexDirection: "row",
    gap: 12,
  },
  marketValueLowHighBlock: {
    flex: 1,
    backgroundColor: colors.bgWhiteA3,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
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
  ebayCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ebayCardLoading: {
    alignItems: "center",
  },
  ebaySectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
    marginBottom: 4,
  },
  ebayCardSubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  ebayPrimaryBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ebayList: { marginBottom: 12 },
  ebayItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  ebayItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.border1,
  },
  ebayItemImagePlaceholder: {},
  ebayItemBody: { flex: 1, marginLeft: 12 },
  ebayItemTitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textBase,
  },
  ebayItemPrice: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.brand,
    marginTop: 2,
  },
  ebayPrimaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ebayPrimaryBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
  },
  ebayLoadingText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 8,
  },
  tabBar: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: colors.bgWhite,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIndicator: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: colors.border1,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
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
    shadowColor: "#000",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    textAlign: "right",
  },
  originCard: {
    marginTop: 20,
    backgroundColor: colors.brandLight,
    borderRadius: 12,
    padding: 16,
  },
  originTitleRow: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textBase,
  },
  conditionGradeBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  conditionGradeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  conditionList: {},
  conditionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  conditionRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineLeft: {
    width: 32,
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
    paddingVertical: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: colors.bgWhite,
  },
  footerFixed: {
    zIndex: 20,
  },
  addBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
  },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  backBtn: { marginTop: 16 },
  backBtnText: { fontSize: 16, color: colors.brand },
  sheetOverlay: { backgroundColor: "rgba(0,0,0,0.4)" },
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
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textBase,
    marginBottom: 16,
    textAlign: "center",
  },
  sheetScroll: { maxHeight: 320 },
  sheetLoading: { paddingVertical: 24, alignItems: "center" },
  sheetEmpty: { paddingBottom: 8 },
  sheetEmptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
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
  optionsSheet: {},
  optionsSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  optionsSheetRowDanger: { borderBottomWidth: 0 },
  optionsSheetRowText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textBase,
  },
  optionsSheetRowTextDanger: { color: colors.red },
  });
}

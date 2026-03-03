import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  CaretRight,
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
  getDisplayMarketValueUsd,
} from "../../lib/currency";
import { requestAppReview } from "../../lib/requestAppReview";
import {
  fetchMarketPricesFromEbay,
  buildEbaySearchQueryFromAntique,
} from "../../lib/ebay";
import { t } from "../../lib/i18n";
import { normalizeCategoryDisplay } from "../../lib/antiqueDisplay";
import { SAVED_COLLECTION_NAME } from "../../stores/useLocalCollectionStore";
import { checkIsPro } from "../../lib/revenueCat";

const TAB_NAMES = [
  "details",
  "condition",
  "provenance",
  "authenticity",
  "careTips",
  "ebay",
  "expert",
];

const CONDITION_BADGE_OPTIONS = {
  surface_condition: [
    "Pristine",
    "Minor Wear",
    "Moderate Wear",
    "Heavy Wear",
    "Damaged",
  ],
  structural_integrity: [
    "Intact",
    "Stable",
    "Minor Issues",
    "Compromised",
    "Broken",
  ],
  age_wear: [
    "Minimal",
    "Light Patina",
    "Moderate Aging",
    "Heavy Aging",
    "Severe Deterioration",
  ],
  authenticity_markers: [
    "Strong",
    "Consistent",
    "Partial",
    "Weak",
    "Inconclusive",
  ],
};

function ConditionBadgeRow({ label, value, options, styles }) {
  if (!value || !options) return null;
  const normalized = String(value).trim();
  const index = options.findIndex(
    (opt) => opt.toLowerCase() === normalized.toLowerCase(),
  );
  const level = index >= 0 && index <= 4 ? index : -1;
  const displayText = index >= 0 ? options[index] : value;
  const badgeStyle =
    level >= 0
      ? [styles.conditionBadgeBase, styles[`conditionBadgeLevel${level}`]]
      : styles.conditionBadgeBase;
  const textStyle =
    level >= 0
      ? [styles.conditionBadgeText, styles[`conditionBadgeTextLevel${level}`]]
      : styles.conditionBadgeText;
  return (
    <View style={styles.conditionBadgeRow}>
      <Text style={styles.conditionBadgeRowLabel}>{label}</Text>
      <View style={badgeStyle}>
        <Text style={textStyle} numberOfLines={1}>
          {displayText}
        </Text>
      </View>
    </View>
  );
}

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

function TimelineItem({
  Icon,
  title,
  subtitle,
  isFirst,
  isLast,
  styles,
  colors,
}) {
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
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [sectionTops, setSectionTops] = useState([
    0, 500, 1000, 1500, 2000, 2500, 3000,
  ]);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [bouncesEnabled, setBouncesEnabled] = useState(false);
  const bouncesThresholdRef = useRef(false);
  const [buttonRowY, setButtonRowY] = useState(0);
  const buttonRowYRef = useRef(0);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [inAnyCollection, setInAnyCollection] = useState(false);
  const [collectionForLink, setCollectionForLink] = useState(null);
  const [ebayItems, setEbayItems] = useState([]);
  const [ebayLinks, setEbayLinks] = useState([]);
  const [loadingEbay, setLoadingEbay] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [isPro, setIsPro] = useState(false);
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
  const stickySectionScrollRef = useRef(null);
  const inFlowSectionScrollRef = useRef(null);
  const scrollingToSectionIndexRef = useRef(null);
  const SECTION_BUTTON_SLOT_WIDTH = 96;

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
      else setAntique(null);
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
    if (!antique || !isPro) return;
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
  }, [antique?.id, antique?.name, antique?.specification, isPro]);

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

  const ebayGridItems = useMemo(() => {
    const items = (displayEbayItems || []).filter((it) => it?.itemWebUrl);
    if (items.length === 0) return [];
    const withNum = items.map((it) => ({
      ...it,
      priceNum: parseFloat(String(it.price || "0")) || 0,
    }));
    const avg =
      withNum.reduce((s, it) => s + it.priceNum, 0) / withNum.length || 0;
    const sorted = [...withNum].sort(
      (a, b) => Math.abs(a.priceNum - avg) - Math.abs(b.priceNum - avg),
    );
    return sorted.slice(0, 4);
  }, [displayEbayItems]);

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent?.(true);
      RNStatusBar.setBackgroundColor?.("transparent");
    }
  }, []);

  const getTabLabel = (tab) => {
    const labels = {
      details: "antique.tabDetails",
      condition: "antique.tabCondition",
      provenance: "antique.tabProvenance",
      authenticity: "antique.tabAuthenticity",
      careTips: "antique.tabCareTips",
      ebay: "antique.tabEbay",
      expert: "antique.tabExpert",
    };
    return t(labels[tab] || tab);
  };

  const scrollToSection = (index) => {
    scrollingToSectionIndexRef.current = index;
    setActiveSectionIndex(index);
    const sectionY = sectionTops[index] ?? 0;
    const y = Math.max(0, sectionY - SCROLL_SECTION_OFFSET);
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const handleScrollSection = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const threshold = 80;
    const scrollingTo = scrollingToSectionIndexRef.current;
    if (scrollingTo !== null) {
      const targetY = sectionTops[scrollingTo] ?? 0;
      if (y >= targetY - threshold) {
        scrollingToSectionIndexRef.current = null;
      }
      return;
    }
    let next = 0;
    if (sectionTops[6] > 0 && y >= sectionTops[6] - threshold) next = 6;
    else if (sectionTops[5] > 0 && y >= sectionTops[5] - threshold) next = 5;
    else if (sectionTops[4] > 0 && y >= sectionTops[4] - threshold) next = 4;
    else if (sectionTops[3] > 0 && y >= sectionTops[3] - threshold) next = 3;
    else if (sectionTops[2] > 0 && y >= sectionTops[2] - threshold) next = 2;
    else if (sectionTops[1] > 0 && y >= sectionTops[1] - threshold) next = 1;
    else next = 0;
    setActiveSectionIndex((prev) => (prev !== next ? next : prev));
  };

  const reportSectionLayout = (index, y) => {
    setSectionTops((prev) => {
      const next = [...prev];
      next[index] = y;
      return next;
    });
  };

  useEffect(() => {
    buttonRowYRef.current = buttonRowY;
  }, [buttonRowY]);

  useEffect(() => {
    const x = Math.max(0, activeSectionIndex * SECTION_BUTTON_SLOT_WIDTH - 60);
    stickySectionScrollRef.current?.scrollTo({ x, animated: true });
    inFlowSectionScrollRef.current?.scrollTo({ x, animated: true });
  }, [activeSectionIndex]);

  useEffect(() => {
    if (!showStickyBar) return;
    const x = Math.max(0, activeSectionIndex * SECTION_BUTTON_SLOT_WIDTH - 60);
    const t = setTimeout(() => {
      stickySectionScrollRef.current?.scrollTo({ x, animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [showStickyBar, activeSectionIndex]);

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
    checkIsPro().then(setIsPro);
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
    if (!user?.id) {
      const rootNav = navigation.getParent?.();
      rootNav?.reset?.({ index: 0, routes: [{ name: "GetStarted" }] });
      return;
    }
    if (!antique?.id) {
      Alert.alert(
        t("antique.loginRequired"),
        t("antique.loginRequiredMessage"),
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

  const STICKY_BAR_PRELOAD_OFFSET = 5;
  const SCROLL_SECTION_OFFSET = 60;

  const BOUNCES_THRESHOLD = 200;

  const handleContentScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    contentScrollYRef.current = y;
    const threshold = buttonRowYRef.current - STICKY_BAR_PRELOAD_OFFSET;
    setShowStickyBar((prev) => {
      const next = y >= threshold;
      return next !== prev ? next : prev;
    });
    const shouldBounce = y > BOUNCES_THRESHOLD;
    if (bouncesThresholdRef.current !== shouldBounce) {
      bouncesThresholdRef.current = shouldBounce;
      setBouncesEnabled(shouldBounce);
    }
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
        t("antique.removeFromHistoryTitle"),
        t("antique.removeFromHistoryMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
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
                  t("common.error"),
                  e?.message || t("antique.removeFromHistoryMessage"),
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
        t("antique.removeFromCollectionTitle"),
        t("antique.removeFromCollectionMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
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
                  t("common.error"),
                  e?.message || t("antique.removeFromCollectionMessage"),
                );
              }
            },
          },
        ],
      );
      return;
    }
    Alert.alert(t("antique.deleteItemTitle"), t("antique.deleteItemMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
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
            Alert.alert(
              t("common.error"),
              e?.message || t("antique.deleteItemMessage"),
            );
          }
        },
      },
    ]);
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
          t("antique.alreadyAdded"),
          t("antique.alreadyInCollection"),
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
        Alert.alert(
          t("antique.addedTitle"),
          t("antique.addedToCollectionMessage"),
        );
      } catch (e) {
        Alert.alert(
          t("common.error"),
          e?.message || t("antique.addedToCollectionMessage"),
        );
      }
    },
    [antique?.id, supabase, closeAddSheet, refreshCollectionStatus],
  );

  const handleCreateNewCollection = useCallback(async () => {
    if (!user?.id || !antique?.id || !supabase) return;
    if (!isPro) {
      closeAddSheet();
      navigation.navigate("Pro", { fromAntique: true });
      return;
    }
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
      Alert.alert(
        t("antique.addedTitle"),
        t("antique.newCollectionCreatedMessage"),
      );
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e?.message || t("antique.newCollectionCreatedMessage"),
      );
    }
  }, [
    user?.id,
    antique?.id,
    supabase,
    closeAddSheet,
    refreshCollectionStatus,
    isPro,
    navigation,
  ]);

  if (loading) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <StatusBar style={colors.isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!antique) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <StatusBar style={colors.isDark ? "light" : "dark"} />
        <Text style={styles.emptyText}>{t("antique.itemNotFound")}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{t("antique.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl =
    Array.isArray(antique.image_url)?.[0] || antique.image_url || null;
  const ageYrs = antique.estimated_age_years ?? 0;
  const rarityScore = antique.rarity_score ?? 0;
  const rarityMax = antique.rarity_max_score ?? 10;
  const spec = antique.specification ?? {};
  // Fallbacks so we don't show "0 yrs", "0/10", "Unknown · 0 – 0 yrs" when data is in specification only
  const hasPeriodYears =
    (antique.period_start_year != null && antique.period_start_year !== 0) ||
    (antique.period_end_year != null && antique.period_end_year !== 0);
  const originLineText = hasPeriodYears
    ? `${antique.origin_country ?? spec.origin ?? "Unknown"} · ${antique.period_start_year ?? "?"} – ${antique.period_end_year ?? "?"} ${t("antique.yrs")}`
    : `${antique.origin_country ?? spec.origin ?? "Unknown"} · ${spec.period || "—"}`;
  // Age card: number "120" or range "200-230" (from estimated_age_display e.g. "c. 200-230 years")
  const ageDisplay = (() => {
    if (ageYrs > 0) return `${ageYrs} ${t("antique.yrs")}`;
    const raw = spec.estimated_age_display;
    if (!raw || typeof raw !== "string") return "—";
    const s = raw.trim();
    const rangeMatch = s.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]}`;
    const singleMatch = s.match(/(\d+)/);
    if (singleMatch) return `${singleMatch[1]} ${t("antique.yrs")}`;
    return s || "—";
  })();
  // Rarity card: always "X/10". If only label (e.g. "Rare"), map to score.
  const RARITY_LABEL_TO_SCORE = {
    common: 2,
    uncommon: 4,
    rare: 7,
    "very rare": 8,
    "extremely rare": 9,
  };
  const rarityDisplay = (() => {
    if (rarityScore > 0) return `${rarityScore} / ${rarityMax}`;
    const label = (spec.rarity_label || "").trim().toLowerCase();
    const mapped = label ? RARITY_LABEL_TO_SCORE[label] : null;
    if (mapped != null) return `${mapped} / ${rarityMax}`;
    return "—";
  })();
  const rarityScoreForColor =
    rarityScore > 0
      ? rarityScore
      : (() => {
          const label = (spec.rarity_label || "").trim().toLowerCase();
          return label ? RARITY_LABEL_TO_SCORE[label] ?? 0 : 0;
        })();
  const getRarityCircleColors = (score) => {
    const isDark = colors.isDark;
    if (score >= 9) {
      return isDark
        ? { bg: "rgba(74, 222, 128, 0.2)", text: "#86efac" }
        : { bg: "rgba(34, 197, 94, 0.22)", text: "#15803d" };
    }
    if (score >= 7) {
      return isDark
        ? { bg: "rgba(250, 204, 21, 0.18)", text: "#fde047" }
        : { bg: "rgba(234, 179, 8, 0.28)", text: "#854d0e" };
    }
    if (score >= 5) {
      return isDark
        ? { bg: "rgba(251, 146, 60, 0.2)", text: "#fdba74" }
        : { bg: "rgba(249, 115, 22, 0.22)", text: "#c2410c" };
    }
    if (score >= 3) {
      return isDark
        ? { bg: "rgba(248, 113, 113, 0.2)", text: "#fca5a5" }
        : { bg: "rgba(239, 68, 68, 0.22)", text: "#b91c1c" };
    }
    if (score >= 1) {
      return isDark
        ? { bg: "rgba(225, 29, 72, 0.18)", text: "#fb7185" }
        : { bg: "rgba(185, 28, 28, 0.2)", text: "#7f1d1d" };
    }
    return { bg: colors.border2, text: colors.textSecondary };
  };
  const rarityCircleColors = getRarityCircleColors(rarityScoreForColor);
  const descriptionText =
    antique.description?.trim() ||
    (() => {
      const period =
        spec.period ||
        (antique.period_start_year != null && antique.period_end_year != null
          ? `${antique.period_start_year}–${antique.period_end_year}`
          : null);
      const origin = spec.origin || antique.origin_country;
      const material = spec.material;
      const dimensions = spec.dimensions;
      const maker = spec.maker;
      const sentences = [];
      if (period)
        sentences.push(`This item is attributed to the ${period} period.`);
      if (origin) sentences.push(`It likely originates from ${origin}.`);
      if (material) sentences.push(`The material is ${material}.`);
      if (dimensions) sentences.push(dimensions);
      if (maker && maker !== "Unknown")
        sentences.push(`Maker or workshop: ${maker}.`);
      return sentences.length ? sentences.join(" ") : null;
    })() ||
    t("antique.noDescription");
  const growthPct =
    antique.avg_growth_percentage != null
      ? (antique.avg_growth_percentage * 100).toFixed(0)
      : "0";
  const CONDITION_LABELS = [
    "Excellent",
    "Very Good",
    "Good",
    "Fair",
    "Poor",
    "Damaged",
  ];
  const normalizeConditionSummary = (raw) => {
    if (!raw || typeof raw !== "string") return "Good";
    const trimmed = raw.replace(/^Overall Condition:\s*/i, "").trim();
    const lower = trimmed.toLowerCase();
    const found = CONDITION_LABELS.find(
      (l) => l.toLowerCase() === lower || lower.includes(l.toLowerCase()),
    );
    if (found) return found;
    if (lower.includes("excellent")) return "Excellent";
    if (lower.includes("very good")) return "Very Good";
    if (lower.includes("good")) return "Good";
    if (lower.includes("fair")) return "Fair";
    if (lower.includes("poor")) return "Poor";
    if (lower.includes("damaged")) return "Damaged";
    return "Good";
  };

  const getConditionStyle = (label, s) => {
    if (!s || s === "N/A") return "bad";
    const lower = s.toLowerCase();
    if (lower === "excellent") return "good";
    if (lower === "good") return label === "Dial & Hands" ? "neutral" : "good";
    return "bad"; // fair, poor, etc.
  };

  const getDetailsSpecRows = (a) => {
    const spec = a?.specification ?? {};
    const rawCategory =
      spec.category ??
      (Array.isArray(a?.category) ? a.category[0] : a?.category);
    const category = normalizeCategoryDisplay(a?.name, rawCategory);
    const period =
      spec.period ??
      (a?.period_start_year != null && a?.period_end_year != null
        ? `${a.period_start_year} – ${a.period_end_year}`
        : null);
    const origin = spec.origin ?? a?.origin_country;
    const estimatedAge =
      spec.estimated_age_display ??
      (a?.estimated_age_years != null
        ? `~${a.estimated_age_years} years`
        : null);
    return [
      { labelKey: "antique.specCategory", value: category },
      { labelKey: "antique.specPeriod", value: period },
      { labelKey: "antique.specOrigin", value: origin },
      { labelKey: "antique.specMaker", value: spec.maker },
      { labelKey: "antique.specMaterial", value: spec.material },
      { labelKey: "antique.specDimensions", value: spec.dimensions },
      { labelKey: "antique.specEstimatedAge", value: estimatedAge },
    ];
  };

  const getValueInsightRows = (a) => {
    const spec = a?.specification ?? {};
    const rarity =
      spec.rarity_label ??
      (() => {
        const score = a?.rarity_score ?? 0;
        if (score <= 2) return "Common";
        if (score <= 4) return "Uncommon";
        if (score <= 6) return "Rare";
        if (score <= 8) return "Very Rare";
        return "Extremely Rare";
      })();
    return [
      { labelKey: "antique.valueRarity", value: rarity },
      { labelKey: "antique.valueMarketDemand", value: spec.market_demand },
    ];
  };

  const buildOriginProvenanceFallback = (a) => {
    const s = a?.specification ?? {};
    const place = a?.origin_country || s.origin || "Unknown";
    const region = s.region_of_origin || place;
    const hasYears =
      (a?.period_start_year != null && a?.period_start_year !== 0) ||
      (a?.period_end_year != null && a?.period_end_year !== 0);
    const periodStr = hasYears
      ? `${a.period_start_year}–${a.period_end_year}`
      : s.period || "";
    const typicalUse = s.typical_use;
    const material = s.material;
    const sentences = [];
    if (place || periodStr) {
      sentences.push(
        periodStr
          ? `This piece likely originates from ${place} and dates to the ${periodStr} period.`
          : `This piece likely originates from ${place}.`,
      );
    }
    if (region && region !== place) {
      sentences.push(`More specifically, it may be from ${region}.`);
    }
    if (typicalUse) {
      const useText =
        {
          circulation: "circulation or trade",
          decoration: "decoration",
          ceremony: "ceremonial use",
        }[typicalUse.toLowerCase()] || typicalUse;
      sentences.push(`It was typically used for ${useText}.`);
    }
    if (material) {
      sentences.push(`Materials are consistent with ${material}.`);
    }
    const desc = (a?.description || "").trim();
    if (desc) sentences.push(desc);
    const text = sentences.join(" ").trim();
    return text || "No origin information.";
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
  // Current market value: Gemini estimate’ga eng yaqin eBay narxi; fallback — eBay listinglarining o‘rtacha narxi. (min+max)/2 hech qachon ishlatilmaydi
  const displayPriceUsd = getDisplayMarketValueUsd(antique);
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
      setHasShownRateAfterFirstScan(true);
      await requestAppReview();
      // Native review dialog ko‘rinsin, keyin back
      await new Promise((r) => setTimeout(r, 400));
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar style={colors.isDark ? "light" : "dark"} />

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
            accessibilityLabel={t("antique.moreOptions")}
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
            <Animated.View style={{ height: spacerHeight }} />
            <Animated.View
              style={[
                styles.handleWrap,
                { opacity: handleOpacity, paddingVertical: handlePadding },
              ]}
            >
              <Animated.View
                style={[
                  styles.headerHandle,
                  {
                    height: handleAnimHeight,
                    backgroundColor: colors.border2,
                    marginBottom: handleMarginBottom,
                  },
                ]}
              />
            </Animated.View>
            {/* X va dots: yopiqda joy olmaydi (height 0), ochilish animatsiyasida paydo bo‘ladi */}
            <Animated.View
              style={[styles.sheetHeaderRowWrap, { height: headerRowHeight }]}
            >
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
                    accessibilityLabel={t("antique.moreOptions")}
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
            {showStickyBar && (
              <View
                style={[
                  styles.stickySectionRowStuck,
                  { backgroundColor: colors.bgBase },
                ]}
                pointerEvents="box-none"
              >
                <ScrollView
                  ref={stickySectionScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.stickySectionRowScrollContent,
                    styles.stickySectionRowScrollContentStuck,
                    styles.stickySectionRowWrap,
                  ]}
                  style={styles.stickySectionRowScroll}
                >
                  {TAB_NAMES.map((tab, index) => (
                    <Pressable
                      key={tab}
                      style={[
                        styles.stickySectionBtn,
                        activeSectionIndex === index &&
                          styles.stickySectionBtnActive,
                      ]}
                      onPress={() => scrollToSection(index)}
                    >
                      <Text
                        style={[
                          styles.stickySectionBtnText,
                          activeSectionIndex === index &&
                            styles.stickySectionBtnTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {getTabLabel(tab)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <ScrollView
              ref={scrollRef}
              scrollEnabled={isExpanded}
              style={styles.contentScroll}
              contentContainerStyle={[
                styles.contentScrollContent,
                {
                  paddingBottom: isInCurrentCollection
                    ? insets.bottom
                    : insets.bottom + 70,
                },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => {
                handleContentScroll(e);
                handleScrollSection(e);
              }}
              onMomentumScrollEnd={() => {
                scrollingToSectionIndexRef.current = null;
              }}
              onScrollEndDrag={handleContentScrollEndDrag}
              scrollEventThrottle={16}
              bounces={bouncesEnabled}
            >
              <View
                style={[styles.contentArea, { backgroundColor: colors.bgBase }]}
              >
                <View style={styles.titleBlock}>
                  <Text style={styles.name}>{antique.name}</Text>
                  <Text style={styles.originLine}>{originLineText}</Text>
                </View>

                {/* Age and rarity section */}
                <View style={styles.metricRow}>
                  <View style={[styles.metricCard, { width: cardWidth }]}>
                    <CalendarBlank size={24} color={colors.brand} />
                    <Text style={styles.metricLabel}>{t("antique.age")}</Text>
                    <Text style={styles.metricValue}>{ageDisplay}</Text>
                  </View>
                  <View style={[styles.metricCard, { width: cardWidth }]}>
                    <Medal size={24} color={colors.brand} />
                    <Text style={styles.metricLabel}>
                      {t("antique.rarity")}
                    </Text>
                    <Text style={styles.metricValue}>{rarityDisplay}</Text>
                  </View>
                  <View style={[styles.metricCard, { width: cardWidth }]}>
                    <CheckCircle size={24} color={colors.brand} />
                    <Text style={styles.metricLabel}>
                      {t("antique.condition")}
                    </Text>
                    <Text style={styles.metricValue}>
                      {normalizeConditionSummary(
                        antique.overall_condition_summary,
                      )}
                    </Text>
                  </View>
                </View>

                {/* Market value section */}
                <View style={styles.marketValueCard}>
                  <View style={styles.marketValueHeader}>
                    <TrendUp size={20} color={colors.brand} />
                    <View style={styles.marketValueTitleContainer}>
                      <Text style={styles.marketValueTitle}>
                        {t("antique.marketAnalysis")}
                      </Text>
                      <Text style={styles.marketValueDescription}>
                        Pricing sourced from eBay
                      </Text>
                    </View>
                    <View style={styles.marketValueLiveTag}>
                      <Text style={styles.marketValueLiveText}>
                        {t("antique.liveData")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.marketValueCurrentBlock}>
                    <Text style={styles.marketValueCurrentLabel}>
                      {t("antique.currentMarketValue")}
                    </Text>
                    <Text style={styles.marketValueCurrentValue}>
                      {displayPriceUsd > 0
                        ? formatPriceUsd(displayPriceUsd, displayCurrency, rate)
                        : "—"}
                    </Text>
                  </View>
                  <View style={styles.marketValueLowHighRow}>
                    <View style={styles.marketValueLowHighBlock}>
                      <Text style={styles.marketValueLowHighLabel}>
                        {t("antique.low")}
                      </Text>
                      <Text style={styles.marketValueLowHighValue}>
                        {displayLowUsd > 0
                          ? formatPriceUsd(displayLowUsd, displayCurrency, rate)
                          : "—"}
                      </Text>
                    </View>
                    <View style={styles.marketValueLowHighBlock}>
                      <Text style={styles.marketValueLowHighLabel}>
                        {t("antique.high")}
                      </Text>
                      <Text style={styles.marketValueLowHighValue}>
                        {displayHighUsd > 0
                          ? formatPriceUsd(
                              displayHighUsd,
                              displayCurrency,
                              rate,
                            )
                          : "—"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Sticky section buttons */}
                <View
                  style={[
                    styles.sectionButtonsInFlow,
                    showStickyBar && styles.sectionButtonsInFlowHidden,
                  ]}
                  onLayout={(e) => {
                    const y = e.nativeEvent.layout.y;
                    setButtonRowY(y);
                  }}
                >
                  <ScrollView
                    ref={inFlowSectionScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.stickySectionRowScrollContent,
                      styles.stickySectionRowScrollContentStuck,
                      styles.stickySectionRowWrap,
                      { backgroundColor: colors.bgBase },
                    ]}
                    style={styles.stickySectionRowScroll}
                  >
                    {TAB_NAMES.map((tab, index) => (
                      <Pressable
                        key={tab}
                        style={[
                          styles.stickySectionBtn,
                          activeSectionIndex === index &&
                            styles.stickySectionBtnActive,
                        ]}
                        onPress={() => scrollToSection(index)}
                      >
                        <Text
                          style={[
                            styles.stickySectionBtnText,
                            activeSectionIndex === index &&
                              styles.stickySectionBtnTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {getTabLabel(tab)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Description section */}
                <View
                  style={styles.tabPanel}
                  onLayout={(e) =>
                    reportSectionLayout(0, e.nativeEvent.layout.y)
                  }
                >
                  <Text style={styles.sectionTitle}>
                    {t("antique.description")}
                  </Text>
                  <Text style={styles.bodyText}>{descriptionText}</Text>

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    {t("antique.specification")}
                  </Text>
                  <View style={styles.specList}>
                    {getDetailsSpecRows(antique).map(({ labelKey, value }) => (
                      <View key={labelKey} style={styles.specRow}>
                        <Text style={styles.specLabel}>{t(labelKey)}</Text>
                        <Text style={styles.specValue}>{value ?? "—"}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    {t("antique.valueInsight")}
                  </Text>
                  <View style={styles.specList}>
                    {getValueInsightRows(antique).map(({ labelKey, value }) => (
                      <View key={labelKey} style={styles.specRow}>
                        <Text style={styles.specLabel}>{t(labelKey)}</Text>
                        <Text style={styles.specValue}>{value ?? "—"}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Condition section */}
                <View
                  style={[styles.tabPanel, { marginTop: 24 }]}
                  onLayout={(e) =>
                    reportSectionLayout(1, e.nativeEvent.layout.y)
                  }
                >
                  <View style={styles.conditionGradeBlock}>
                    <View
                      style={[
                        styles.conditionGradeCircle,
                        {
                          backgroundColor: rarityCircleColors.bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.conditionGradeText,
                          { color: rarityCircleColors.text },
                        ]}
                      >
                        {rarityDisplay}
                      </Text>
                    </View>
                    <Text style={styles.conditionOverallTitle}>
                      {normalizeConditionSummary(
                        antique.overall_condition_summary,
                      )}
                    </Text>
                    <Text style={styles.conditionOverallSubtitle}>
                      {antique.condition_description ||
                        t("antique.wellPreserved")}
                    </Text>
                  </View>
                  <View style={styles.conditionList}>
                    <ConditionBadgeRow
                      label={t("antique.conditionSurfaceCondition")}
                      value={
                        antique.specification?.surface_condition ??
                        antique.surface_condition
                      }
                      options={CONDITION_BADGE_OPTIONS.surface_condition}
                      styles={styles}
                    />
                    <ConditionBadgeRow
                      label={t("antique.conditionStructuralIntegrity")}
                      value={
                        antique.specification?.structural_integrity ??
                        antique.structural_integrity
                      }
                      options={CONDITION_BADGE_OPTIONS.structural_integrity}
                      styles={styles}
                    />
                    <ConditionBadgeRow
                      label={t("antique.conditionAgeWear")}
                      value={
                        antique.specification?.age_wear ?? antique.age_wear
                      }
                      options={CONDITION_BADGE_OPTIONS.age_wear}
                      styles={styles}
                    />
                    <ConditionBadgeRow
                      label={t("antique.conditionAuthenticityMarkers")}
                      value={
                        antique.specification?.authenticity_markers ??
                        antique.authenticity_markers
                      }
                      options={CONDITION_BADGE_OPTIONS.authenticity_markers}
                      styles={styles}
                    />
                  </View>
                </View>

                {/* Provenance section */}
                <View
                  style={[styles.tabPanel, { marginTop: 24, padding: 0 }]}
                  onLayout={(e) =>
                    reportSectionLayout(2, e.nativeEvent.layout.y)
                  }
                >
                  <View style={[styles.originCard, { marginTop: 0 }]}>
                    <View style={styles.originTitleRow}>
                      <MapPin size={18} color={colors.textBase} />
                      <Text style={styles.originTitle}>
                        {t("antique.originProvenance")}
                      </Text>
                    </View>
                    {(antique.specification?.region_of_origin ||
                      antique.specification?.typical_use) && (
                      <View style={styles.originMetaRow}>
                        {antique.specification?.region_of_origin != null && (
                          <View style={styles.originMetaItem}>
                            <Text style={styles.originMetaLabel}>
                              {t("antique.regionOfOrigin")}
                            </Text>
                            <Text style={styles.originMetaValue}>
                              {antique.specification.region_of_origin}
                            </Text>
                          </View>
                        )}
                        {antique.specification?.typical_use != null && (
                          <View style={styles.originMetaItem}>
                            <Text style={styles.originMetaLabel}>
                              {t("antique.typicalUse")}
                            </Text>
                            <Text style={styles.originMetaValue}>
                              {(() => {
                                const key = `antique.typicalUse_${antique.specification.typical_use}`;
                                const translated = t(key);
                                return translated !== key
                                  ? translated
                                  : antique.specification.typical_use;
                              })()}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={styles.originText}>
                      {antique.origin_provenance ||
                        buildOriginProvenanceFallback(antique)}
                    </Text>
                  </View>
                  {/* <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                    {t("antique.acquisitionDetails")}
                  </Text>
                  <View style={styles.acquisitionRows}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>
                        {t("antique.dateAdded")}
                      </Text>
                      <Text style={styles.metaValue}>
                        {formatHistoryDate(antique.created_at)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>
                        {t("antique.source")}
                      </Text>
                      <Text style={styles.metaValue}>
                        {antique.source || t("antique.aiAnalysis")}
                      </Text>
                    </View>
                    <View
                      style={[styles.metaRow, { borderBottomWidth: 0 }]}
                    >
                      <Text style={styles.metaLabel}>
                        {t("antique.purchasePrice")}
                      </Text>
                      <Text style={styles.metaValue}>
                        {formatPurchasePrice(antique.purchase_price)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                    {t("antique.itemTimeline")}
                  </Text>
                  <View style={styles.timeline}>
                    <TimelineItem
                      Icon={Cube}
                      title={t("antique.timelineManufactured")}
                      subtitle={`${antique.period_start_year || "?"}–${antique.period_end_year || "?"} • ${antique.origin_country || "Unknown"}`}
                      isFirst
                      isLast={false}
                      styles={styles}
                      colors={colors}
                    />
                    <TimelineItem
                      Icon={Eye}
                      title={t("antique.timelineIdentified")}
                      subtitle={`${formatHistoryDate(antique.created_at)} • ${t("antique.aiAnalysis")}`}
                      isFirst={false}
                      isLast={false}
                      styles={styles}
                      colors={colors}
                    />
                    <TimelineItem
                      Icon={CheckCircle}
                      title={t("antique.timelineConditionAssessed")}
                      subtitle={`${formatHistoryDate(antique.created_at)} • ${normalizeConditionSummary(antique.overall_condition_summary)} • Rarity: ${rarityScore}/${rarityMax}`}
                      isFirst={false}
                      isLast
                      styles={styles}
                      colors={colors}
                    />
                  </View> */}
                </View>

                {/* Authenticity section */}
                <View
                  style={[styles.tabPanel, { marginTop: 24 }]}
                  onLayout={(e) =>
                    reportSectionLayout(3, e.nativeEvent.layout.y)
                  }
                >
                  <Text style={styles.sectionTitle}>
                    {t("antique.tabAuthenticity")}
                  </Text>
                  <View style={styles.authenticityConfidenceRow}>
                    <Text style={styles.specLabel}>
                      {t("antique.authenticityConfidenceLevel")}
                    </Text>
                    <View
                      style={[
                        styles.authenticityConfidenceBadge,
                        styles[
                          `authenticityConfidence_${(
                            antique.specification
                              ?.authenticity_confidence_level || "medium"
                          ).toLowerCase()}`
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.authenticityConfidenceText,
                          styles[
                            `authenticityConfidenceText_${(
                              antique.specification
                                ?.authenticity_confidence_level || "medium"
                            ).toLowerCase()}`
                          ],
                        ]}
                      >
                        {antique.specification?.authenticity_confidence_level ??
                          "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.specList}>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>
                        {t("antique.authenticityMaterialMatch")}
                      </Text>
                      <Text style={styles.specValue}>
                        {antique.specification?.authenticity_material_match ===
                        true
                          ? "✓"
                          : antique.specification
                                ?.authenticity_material_match === false
                            ? "✗"
                            : "—"}
                      </Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>
                        {t("antique.authenticityStyleMatch")}
                      </Text>
                      <Text style={styles.specValue}>
                        {antique.specification?.authenticity_style_match ===
                        true
                          ? "✓"
                          : antique.specification?.authenticity_style_match ===
                              false
                            ? "✗"
                            : "—"}
                      </Text>
                    </View>
                    <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.specLabel}>
                        {t("antique.authenticityWearPattern")}
                      </Text>
                      <Text style={styles.specValue}>
                        {antique.specification?.authenticity_wear_pattern ===
                        true
                          ? "✓"
                          : antique.specification?.authenticity_wear_pattern ===
                              false
                            ? "✗"
                            : "—"}
                      </Text>
                    </View>
                  </View>
                  {(
                    antique.specification?.authenticity_known_red_flags ?? ""
                  ).trim() !== "" && (
                    <View style={styles.authenticityRedFlags}>
                      <Text style={styles.authenticityRedFlagsLabel}>
                        {t("antique.authenticityKnownRedFlags")}
                      </Text>
                      <Text style={styles.authenticityRedFlagsText}>
                        {antique.specification.authenticity_known_red_flags}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.authenticityDisclaimer}>
                    {t("antique.authenticityDisclaimer")}
                  </Text>
                </View>

                {/* Care tips section */}
                <View
                  style={[styles.tabPanel, { marginTop: 24 }]}
                  onLayout={(e) =>
                    reportSectionLayout(4, e.nativeEvent.layout.y)
                  }
                >
                  <Text style={styles.sectionTitle}>
                    {t("antique.tabCareTips")}
                  </Text>
                  <Text style={styles.bodyText}>
                    {antique.specification?.care_tips?.trim() ||
                      t("antique.careTipsPlaceholder")}
                  </Text>
                </View>

                {/* eBay section */}
                <View
                  style={{ marginVertical: 24 }}
                  onLayout={(e) =>
                    reportSectionLayout(5, e.nativeEvent.layout.y)
                  }
                >
                  <View style={styles.ebaySectionHeader}>
                    <Text style={styles.ebaySectionTitle}>
                      {t("antique.ebaySimilarProducts")}
                    </Text>
                    <View style={styles.ebayLiveBadge}>
                      <Text style={styles.ebayLiveBadgeText}>
                        {t("antique.ebayLive")}
                      </Text>
                    </View>
                  </View>
                  {!isPro ? (
                    <Pressable
                      style={[
                        styles.ebayUnlockCard,
                        { backgroundColor: colors.bgWhite },
                      ]}
                      onPress={() =>
                        navigation.navigate("Pro", { fromAntique: true })
                      }
                    >
                      <Text style={styles.ebayUnlockTitle}>
                        {t("antique.ebayUnlockTitle")}
                      </Text>
                      <Text style={styles.ebayUnlockSubtitle}>
                        {t("antique.ebayUnlockSubtitle")}
                      </Text>
                      <View style={styles.ebayUnlockBtnWrap}>
                        <Text style={styles.ebayUnlockBtnText}>
                          {t("antique.ebayUnlockButton")}
                        </Text>
                      </View>
                    </Pressable>
                  ) : loadingEbay ? (
                    <View style={[styles.ebayCard, styles.ebayCardLoading]}>
                      <ActivityIndicator size="small" color={colors.brand} />
                      <Text style={styles.ebayLoadingText}>
                        {t("antique.loadingEbay")}
                      </Text>
                    </View>
                  ) : ebayGridItems.length > 0 ? (
                    <View style={styles.ebayGridWrap}>
                      <View style={styles.ebayGrid}>
                        {ebayGridItems.map((item, idx) => {
                          const cardW = (width - 32 - 10) / 2;
                          const url = item.itemWebUrl || firstEbayUrl;
                          return (
                            <Pressable
                              key={idx}
                              style={[styles.ebayGridCard, { width: cardW }]}
                              onPress={() => url && Linking.openURL(url)}
                            >
                              <View style={styles.ebayGridCardImageWrap}>
                                {item.imageUrl ? (
                                  <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.ebayGridCardImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.ebayGridCardImage,
                                      styles.ebayGridCardImagePlaceholder,
                                    ]}
                                  />
                                )}
                              </View>
                              <Text
                                style={styles.ebayGridCardTitle}
                                numberOfLines={2}
                              >
                                {item.title || "eBay item"}
                              </Text>
                              <View style={styles.ebayGridCardBottom}>
                                <Text
                                  style={styles.ebayGridCardPrice}
                                  numberOfLines={1}
                                >
                                  {item.price ? `$${item.price}` : "—"}
                                </Text>
                                <CaretRight
                                  size={18}
                                  color={colors.textTertiary}
                                  weight="bold"
                                />
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Expert section */}
                <View
                  style={[styles.tabPanel, { marginTop: 0, padding: 0 }]}
                  onLayout={(e) =>
                    reportSectionLayout(6, e.nativeEvent.layout.y)
                  }
                >
                  <Pressable
                    style={[styles.expertCard]}
                    onPress={() =>
                      navigation.navigate("AssistantChat", {
                        fromExpertTab: true,
                        itemCategory:
                          antique?.specification?.category ??
                          antique?.category?.[0],
                      })
                    }
                  >
                    <View
                      style={[styles.expertCardContent, { marginLeft: 20 }]}
                    >
                      <Text style={styles.expertCardTitle}>
                        {t("antique.expertCardTitle")}
                      </Text>
                      <Text style={styles.expertCardSubtitle}>
                        {t("antique.expertCardSubtitle")}
                      </Text>
                    </View>
                    <View style={styles.expertCardIllustration}>
                      <Image
                        source={require("../../assets/bro.png")}
                        style={styles.expertCardImage}
                        resizeMode="contain"
                      />
                    </View>
                  </Pressable>
                </View>
                <View style={{ height: 16 }}></View>
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
                    collectionName:
                      collectionForLink.collection_name ===
                      SAVED_COLLECTION_NAME
                        ? t("collection.savedName")
                        : collectionForLink.collection_name,
                    antiquesIds: collectionForLink.antiques_ids || [],
                  });
                } else {
                  navigation.navigate("MainTabs", { screen: "Collection" });
                }
              }}
            >
              <Text style={styles.addBtnText}>
                {t("antique.seeYourCollection")}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.addBtn} onPress={handleOpenAddSheet}>
              <Text style={styles.addBtnText}>
                {t("antique.addToCollection")}
              </Text>
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
                    {t("antique.changeCollection")}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.optionsSheetRow} onPress={handleShare}>
                <ShareNetwork size={22} color={colors.textBase} weight="bold" />
                <Text style={styles.optionsSheetRowText}>
                  {t("antique.share")}
                </Text>
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
                    ? t("home.removeFromHistoryTitle")
                    : fromCollectionId
                      ? t("collectionDetail.removeFromCollection")
                      : t("common.delete")}
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
              <Text style={styles.sheetTitle}>
                {t("antique.addToCollectionSheet")}
              </Text>
              {loadingCollections ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : collections.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>
                    {t("antique.noCollectionsYet")}
                  </Text>
                  <Pressable
                    style={[styles.sheetRow, styles.sheetRowCreate]}
                    onPress={handleCreateNewCollection}
                  >
                    <PlusCircle size={22} color={colors.brand} weight="bold" />
                    <Text
                      style={[styles.sheetRowText, { color: colors.brand }]}
                    >
                      {t("antique.createNewCollection")}
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
                                t("antique.alreadyAdded"),
                                t("antique.alreadyInCollection"),
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
                          {coll.collection_name === SAVED_COLLECTION_NAME
                            ? t("collection.savedName")
                            : coll.collection_name || "Collection"}
                        </Text>
                        <Text style={styles.sheetRowSubtext}>
                          {ids.length} {t("antique.itemsCount")}
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
                      {t("antique.createNewCollection")}
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
    contentScrollWrap: { flex: 1, flexDirection: "column" },
    contentScroll: { flex: 1 },
    contentScrollContent: { paddingTop: 0 },
    contentArea: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    stickySectionRowStuck: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    stickySectionRowScroll: {
      flexGrow: 0,
    },
    stickySectionRowScrollContent: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 0,
    },
    stickySectionRowScrollContentStuck: {
      paddingHorizontal: 16,
    },
    stickySectionRowWrap: {
      paddingVertical: 8,
      // borderBottomWidth: 1,
      // borderBottomColor: colors.border1,
    },
    sectionButtonsInFlow: {
      marginBottom: 16,
      marginHorizontal: -16,
    },
    sectionButtonsInFlowHidden: {
      opacity: 0,
    },
    stickySectionBtn: {
      minWidth: 88,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: colors.bgBaseElevated,
    },
    stickySectionBtnActive: {
      backgroundColor: colors.isDark ? "#ffffff" : "#000000",
    },
    stickySectionBtnText: {
      fontSize: 14,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
    },
    stickySectionBtnTextActive: {
      color: colors.isDark ? "#000000" : "#ffffff",
      fontFamily: fonts.semiBold,
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
    marketValueTitleContainer: {
      flex: 1,
      marginLeft: 2,
      flexDirection: "column",
      gap: 2,
    },
    marketValueTitle: {
      fontSize: 16,
      fontFamily: fonts.medium,
      color: colors.textBase,
    },
    marketValueDescription: {
      fontSize: 14,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
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
    ebayGridWrap: {
      marginBottom: 20,
    },
    ebayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 8,
    },
    ebayGridCard: {
      backgroundColor: colors.bgWhite,
      borderRadius: 12,
      padding: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    ebayGridCardImageWrap: {
      width: "100%",
      height: 140,
      borderTopEndRadius: 12,
      borderTopStartRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.border1,
    },
    ebayGridCardImage: {
      width: "100%",
      height: "100%",
    },
    ebayGridCardImagePlaceholder: {
      backgroundColor: colors.border2,
    },
    ebayGridCardTitle: {
      fontSize: 16,
      fontFamily: fonts.medium,
      color: colors.textBase,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    ebayGridCardBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      paddingHorizontal: 12,
    },
    ebayGridCardPrice: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.brand,
      flex: 1,
    },
    ebaySectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      // justifyContent: "space-between",
      marginBottom: 12,
    },
    ebaySectionTitle: {
      fontSize: 20,
      fontFamily: fonts.semiBold,
      color: colors.textBase,
    },
    ebayLiveBadge: {
      backgroundColor: "#C62828",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      marginLeft: 12,
    },
    ebayLiveBadgeText: {
      fontSize: 12,
      fontFamily: fonts.semiBold,
      color: "#fff",
    },
    ebayUnlockCard: {
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    ebayUnlockTitle: {
      fontSize: 20,
      fontFamily: fonts.semiBold,
      color: colors.textBase,
      marginBottom: 8,
      textAlign: "center",
    },
    ebayUnlockSubtitle: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: 20,
      marginHorizontal: 16,
      textAlign: "center",
    },
    ebayUnlockBtnWrap: {
      backgroundColor: colors.brand,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      minWidth: 200,
      alignItems: "center",
    },
    ebayUnlockBtnText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: "#fff",
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
      backgroundColor: colors.bgBaseElevated,
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
      textAlign: "right",
    },
    originCard: {
      marginTop: 20,
      // backgroundColor: colors.brandLight,
      borderRadius: 12,
      padding: 20,
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
    originMetaRow: {
      marginBottom: 12,
    },
    originMetaItem: {
      marginBottom: 6,
    },
    originMetaLabel: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    originMetaValue: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textBase,
    },
    originText: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textBase,
      lineHeight: 22,
    },
    authenticityConfidenceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    authenticityConfidenceBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    authenticityConfidence_high: { backgroundColor: "#dcfce7" },
    authenticityConfidence_medium: { backgroundColor: "#fef9c3" },
    authenticityConfidence_low: { backgroundColor: "#fee2e2" },
    authenticityConfidenceText: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
    },
    authenticityConfidenceText_high: { color: "#166534" },
    authenticityConfidenceText_medium: { color: "#854d0e" },
    authenticityConfidenceText_low: { color: "#b91c1c" },
    authenticityRedFlags: {
      marginTop: 12,
      marginBottom: 16,
    },
    authenticityRedFlagsLabel: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
      color: colors.textBase,
      marginBottom: 4,
    },
    authenticityRedFlagsText: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    authenticityDisclaimer: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: colors.textTertiary,
      fontStyle: "italic",
      lineHeight: 18,
    },
    expertCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.bgWhite,
    },
    expertCardContent: {
      flex: 1,
      marginRight: 16,
    },
    expertCardTitle: {
      fontSize: 18,
      fontFamily: fonts.bold,
      color: colors.textBase,
      marginBottom: 6,
    },
    expertCardSubtitle: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    expertCardIllustration: {
      width: 100,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    expertCardImage: {
      width: 100,
      height: 100,
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
      width: 72,
      height: 72,
      borderRadius: 50,
      backgroundColor: colors.brandLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    conditionGradeText: {
      fontSize: 18,
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
    conditionBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    conditionBadgeRowLabel: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.textBase,
      flex: 1,
    },
    conditionBadgeBase: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      maxWidth: "55%",
      backgroundColor: colors.border2,
    },
    conditionBadgeText: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
    },
    conditionBadgeLevel0: { backgroundColor: "#dcfce7" },
    conditionBadgeTextLevel0: { color: "#166534" },
    conditionBadgeLevel1: { backgroundColor: "#fef9c3" },
    conditionBadgeTextLevel1: { color: "#854d0e" },
    conditionBadgeLevel2: { backgroundColor: "#ffedd5" },
    conditionBadgeTextLevel2: { color: "#c2410c" },
    conditionBadgeLevel3: { backgroundColor: "#fee2e2" },
    conditionBadgeTextLevel3: { color: "#b91c1c" },
    conditionBadgeLevel4: { backgroundColor: "#fecaca" },
    conditionBadgeTextLevel4: { color: "#7f1d1d" },
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
      borderTopWidth: 1.5,
      borderTopColor: colors.border1,
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

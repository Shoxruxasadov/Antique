import { useRef, useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../theme";
import { useAppSettingsStore } from "../../stores/useAppSettingsStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useExchangeRatesStore } from "../../stores/useExchangeRatesStore";
import { formatPriceRangeUsd } from "../../lib/currency";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const CARD_COUNT = 6;
const DELAY_STEP = 70;
const ANIM_DURATION = 550;

const CURRENCY_FLAGS = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  CNY: "🇨🇳",
  SGD: "🇸🇬",
  HKD: "🇭🇰",
  KRW: "🇰🇷",
  INR: "🇮🇳",
  RUB: "🇷🇺",
  BRL: "🇧🇷",
  MXN: "🇲🇽",
  ZAR: "🇿🇦",
  TRY: "🇹🇷",
  AED: "🇦🇪",
  SAR: "🇸🇦",
};

const MOCK_BLOG_POSTS = [
  {
    id: "1",
    title: "Understanding Antique Rarity: What Makes a Antique Valuable?",
    readTime: "3 min read",
  },
  {
    id: "2",
    title: "Understanding Coin Rarity: What Makes a Coin Valuable?",
    readTime: "5 min read",
  },
];

function createCardAnims() {
  return Array.from({ length: CARD_COUNT }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(36),
  }));
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const rates = useExchangeRatesStore((s) => s.rates);
  const displayCurrency =
    !rates && preferredCurrency !== "USD" ? "USD" : preferredCurrency;
  const rate = displayCurrency === "USD" ? 1 : (rates?.[displayCurrency] ?? 1);
  const user = useAuthStore((s) => s.user);

  const [lastSnaps, setLastSnaps] = useState([]);
  const [showHistoryOptionsSheet, setShowHistoryOptionsSheet] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState(null);
  const cardAnims = useRef(createCardAnims()).current;
  const hasAnimatedRef = useRef(false);
  const mainStack = navigation.getParent();
  const sheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get("window").height)).current;

  const easeOut = Easing.bezier(0.25, 0.1, 0.25, 1);

  useEffect(() => {
    if (!showHistoryOptionsSheet) return;
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
  }, [showHistoryOptionsSheet, sheetOverlayOpacity, sheetTranslateY]);

  const closeHistoryOptionsSheet = useCallback(
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
        "Remove from history",
        "Remove this item from your scan history?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await supabase.from("snap_history").delete().eq("id", snapId);
                setLastSnaps((prev) => prev.filter((s) => s.id !== snapId));
              } catch (err) {
                console.warn("Delete snap failed:", err?.message);
              }
            },
          },
        ]
      );
    });
  }, [selectedSnap, closeHistoryOptionsSheet, supabase]);

  useFocusEffect(
    useCallback(() => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;
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
              easing: easeOut,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: ANIM_DURATION,
              easing: easeOut,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }, [cardAnims, easeOut]),
  );

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !supabase) {
      setLastSnaps([]);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("snap_history")
          .select("id, image_url, antique_id, payload, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);
        setLastSnaps(data ?? []);
      } catch (_) {
        setLastSnaps([]);
      }
    })();
  }, [user?.id]);

  const snapCardWidth = width * 0.72;
  const blogCardWidth = width * 0.55;
  const rowPadding = 16;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Currency + PRO — card 0 */}
        <Animated.View
          style={{
            opacity: cardAnims[0].opacity,
            transform: [{ translateY: cardAnims[0].translateY }],
          }}
        >
          <View style={styles.header}>
            <View style={styles.currencyBlock}>
                <View style={styles.currencyFlagWrap}>
                  <Text style={styles.currencyFlag}>
                    {CURRENCY_FLAGS[preferredCurrency] || "💱"}
                  </Text>
                  <Text style={styles.currencyCode}>{preferredCurrency}</Text>
                </View>
                <Text style={styles.currencyLabel}>Preferred Currency</Text>
            </View>
            <Pressable
              style={styles.proBtn}
              onPress={() => mainStack?.navigate("Pro")}
            >
              <Ionicons name="diamond" size={18} color={colors.textWhite} />
              <Text style={styles.proBtnText}>PRO</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Main card — AI Powered Antique item Identifier — card 1 */}
        <Animated.View
          style={{
            opacity: cardAnims[1].opacity,
            transform: [{ translateY: cardAnims[1].translateY }],
          }}
        >
          <View style={styles.mainCard}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.mainCardIcon}
              resizeMode="contain"
            />
            <Text style={styles.mainCardTitle}>
              AI Powered Antique item Identifier.
            </Text>
            <Pressable
              style={styles.identifyBtn}
              onPress={() => mainStack?.navigate("Identify")}
            >
              <Ionicons name="camera" size={22} color={colors.textWhite} />
              <Text style={styles.identifyBtnText}>Identify Now</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Row 1: Snap History — card 2 */}
        <Animated.View
          style={{
            opacity: cardAnims[2].opacity,
            transform: [{ translateY: cardAnims[2].translateY }],
          }}
        >
          <Text style={styles.sectionTitle}>Snap History</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.snapRowContent}
            style={styles.snapRowScroll}
          >
            {lastSnaps.map((snap) => {
              const category = Array.isArray(snap.payload?.category)
                ? snap.payload.category.join(", ")
                : snap.payload?.category || "Antique";
              const min = snap.payload?.market_value_min;
              const max = snap.payload?.market_value_max;
              const priceStr =
                min != null && max != null
                  ? formatPriceRangeUsd(min, max, displayCurrency, rate)
                  : "";
              return (
                <Pressable
                  key={snap.id}
                  style={[styles.snapCard, { width: snapCardWidth }]}
                  onPress={() => {
                    if (snap.antique_id) {
                      mainStack?.navigate("ItemDetails", {
                        antiqueId: snap.antique_id,
                        fromHistory: true,
                      });
                    }
                  }}
                >
                  <View style={styles.snapThumbWrap}>
                    {snap.image_url ? (
                      <Image
                        source={{ uri: snap.image_url }}
                        style={styles.snapThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.snapThumb, styles.snapThumbEmpty]} />
                    )}
                  </View>
                  <View style={styles.snapInfo}>
                    <Text style={styles.snapTitle} numberOfLines={1}>
                      {snap.payload?.name || "Scan"}
                    </Text>
                    <Text style={styles.snapCategory} numberOfLines={1}>
                      {category}
                    </Text>
                    {priceStr ? (
                      <Text style={styles.snapPrice} numberOfLines={1}>
                        {priceStr}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.snapDots}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedSnap(snap);
                      setShowHistoryOptionsSheet(true);
                    }}
                    hitSlop={12}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </Pressable>
              );
            })}
            <Pressable
              style={[
                styles.seeAllBtn,
                { width: snapCardWidth * 0.32, marginRight: 0 },
              ]}
              onPress={() => {
                useAppSettingsStore.getState().setOpenCollectionToHistory(true);
                navigation.navigate('Collection');
              }}
            >
              <View style={styles.seeAllCircle}>
                <Ionicons name="arrow-forward" size={22} color={colors.brand} />
              </View>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>

        {/* Row 2: Collectors Blog — card 3 */}
        <Animated.View
          style={{
            opacity: cardAnims[3].opacity,
            transform: [{ translateY: cardAnims[3].translateY }],
          }}
        >
          <Text style={styles.sectionTitle}>Collectors Blog</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.snapRowContent}
            style={styles.snapRowScroll}
          >
            {MOCK_BLOG_POSTS.map((post) => (
              <Pressable
                key={post.id}
                style={[styles.blogCard, { width: blogCardWidth }]}
                onPress={() => mainStack?.navigate("Post", { post })}
              >
                <View style={styles.blogCardImageWrap}>
                  <View style={[styles.blogCardImage, styles.blogThumbEmpty]} />
                </View>
                <View style={styles.blogCardBody}>
                  <Text style={styles.blogCardTitle} numberOfLines={2} ellipsizeMode="tail">
                    {post.title}
                  </Text>
                  <Text style={styles.blogCardMeta}>{post.readTime}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.seeAllBtn,
                { width: blogCardWidth * 0.41, marginRight: 0 },
              ]}
              onPress={() => mainStack?.navigate("AllPosts")}
            >
              <View style={styles.seeAllCircle}>
                <Ionicons name="arrow-forward" size={22} color={colors.brand} />
              </View>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Snap history options bottom sheet */}
      <Modal
        visible={showHistoryOptionsSheet}
        transparent
        animationType="none"
        onRequestClose={() => closeHistoryOptionsSheet()}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: sheetOverlayOpacity }]}
          >
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  currencyBlock: {
    flexDirection: "column",
  },
  currencyFlagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currencyFlag: { fontSize: 24 },
  currencyCode: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textBase,
  },
  currencyLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  proBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  proBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textWhite,
  },
  mainCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mainCardIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  mainCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    fontWeight: "600",
    color: colors.textBase,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  identifyBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    backgroundColor: colors.bgInverted,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  identifyBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textWhite,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textBase,
    marginBottom: 12,
    marginTop: 20,
  },
  snapRowScroll: { 
    marginHorizontal: -16,
  },
  snapRowContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  snapCard: {
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  snapThumbWrap: { marginRight: 12 },
  snapThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.border3,
  },
  snapThumbEmpty: {},
  snapInfo: { flex: 1, minWidth: 0 },
  snapTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginBottom: 2,
  },
  snapCategory: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  snapPrice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.brand,
  },
  snapDots: { padding: 4 },
  seeAllBtn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    // paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    // marginVertical: 20,
  },
  seeAllCircle: {
    width: 36,
    height: 36,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  seeAllText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.brand,
  },
  blogCard: {
    marginRight: 12,
    flexDirection: "column",
    backgroundColor: colors.bgWhite,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  blogCardImageWrap: {
    width: "100%",
    aspectRatio: 1.35,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  blogCardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.border3,
  },
  blogThumbEmpty: {},
  blogCardBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  blogCardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginBottom: 6,
    lineHeight: 22,
  },
  blogCardMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sheetOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
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
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
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

import { useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CrownSimpleIcon,
  ArrowsClockwise,
  CurrencyDollar,
  Gear,
  FileText,
  Headset,
  Star,
  User,
  PencilSimpleIcon,
  CaretRight,
  SignOut,
} from "phosphor-react-native";
import { useColors, fonts } from "../../theme";
import { requestAppReview } from "../../lib/requestAppReview";
import { openPrivacyPolicy, openTermsOfUse } from "../../lib/legalLinks";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../stores/useAuthStore";
import { useOnboardingStore } from "../../stores/useOnboardingStore";
import { useAppSettingsStore } from "../../stores/useAppSettingsStore";

const GENERAL_ITEMS = [
  {
    id: "subscription",
    Icon: CrownSimpleIcon,
    label: "Manage Subscription",
    route: "Pro",
  },
  { id: "restore", Icon: ArrowsClockwise, label: "Restore Membership", route: null },
  {
    id: "currency",
    Icon: CurrencyDollar,
    label: "Preferred Currency",
    route: "PreferredCurrency",
  },
  {
    id: "settings",
    Icon: Gear,
    label: "App Settings",
    route: "AppSettings",
  },
];

const OTHER_ITEMS = [
  {
    id: "privacy",
    Icon: FileText,
    label: "Privacy policy",
    route: null,
  },
  {
    id: "terms",
    Icon: FileText,
    label: "Terms of use",
    route: null,
  },
  {
    id: "support",
    Icon: Headset,
    label: "Contact support",
    route: null,
  },
  { id: "rate", Icon: Star, label: "Rate the app", route: null },
];

function RowItem({ Index, Icon, label, value, onPress, styles, colors }) {
  return (
    <Pressable style={[styles.rowItem, Index === 0 && {borderTopWidth: 0}]} onPress={onPress} disabled={!onPress}>
      <Icon size={22} color={colors.textSecondary} weight="fill" />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <CaretRight size={20} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );
}

const PROFILE_CARD_COUNT = 4;
const DELAY_STEP = 70;
const ANIM_DURATION = 550;

function createCardAnims() {
  return Array.from({ length: PROFILE_CARD_COUNT }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(36),
  }));
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const tabNav = navigation.getParent();
  const mainStack = tabNav; // MainStack: contains MainTabs + AppSettings, Pro, EditProfile, etc.
  const rootNav = tabNav?.getParent();
  const cardAnims = useRef(createCardAnims()).current;
  const easeOut = Easing.bezier(0.25, 0.1, 0.25, 1);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bgBase,
        },
        containerRelative: {
          position: "relative",
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 16,
          paddingTop: 20,
        },
        headerTitle: {
          fontFamily: fonts.semiBold,
          fontSize: 24,
          color: colors.textBase,
          textAlign: "center",
          marginBottom: 24,
        },
        userCard: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.bgWhite,
          borderRadius: 16,
          padding: 16,
          marginBottom: 28,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        },
        avatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.border1,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 16,
          overflow: "hidden",
        },
        avatarImage: {
          width: 56,
          height: 56,
          borderRadius: 28,
        },
        userInfo: {
          flex: 1,
        },
        userName: {
          fontFamily: fonts.bold,
          fontSize: 17,
          color: colors.textBase,
        },
        userHint: {
          fontFamily: fonts.regular,
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 2,
        },
        loginBtn: {
          backgroundColor: colors.brand,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
        },
        loginBtnText: {
          fontFamily: fonts.semiBold,
          fontSize: 15,
          color: colors.textWhite,
        },
        editBtn: {
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
        },
        sectionTitle: {
          fontFamily: fonts.semiBold,
          fontSize: 16,
          color: colors.textSecondary,
          marginBottom: 12,
        },
        sectionCard: {
          backgroundColor: colors.bgWhite,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        },
        rowItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border3,
        },
        rowLabel: {
          flex: 1,
          fontFamily: fonts.medium,
          fontSize: 16,
          color: colors.textBase,
          marginLeft: 12,
        },
        rowValue: {
          fontFamily: fonts.medium,
          fontSize: 14,
          color: colors.textSecondary,
          marginRight: 8,
        },
        logoutBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgWhite,
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 3,
          gap: 10,
          paddingVertical: 14,
          marginBottom: 24,
        },
        logoutBtnText: {
          fontFamily: fonts.medium,
          fontSize: 16,
        },
      }),
    [colors]
  );

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

  const navigateTo = (route) => {
    if (!route) return;
    if (route === "GetStarted" || route === "SignIn") {
      if (rootNav) {
        rootNav.reset({ index: 0, routes: [{ name: route }] });
      } else {
        mainStack?.navigate(route);
      }
    } else {
      mainStack?.navigate(route);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
          signOut();
          useOnboardingStore.getState().resetOnboarding();
          useOnboardingStore.getState().resetSkippedGetStarted();
          if (rootNav) {
            rootNav.reset({ index: 0, routes: [{ name: "Onboarding" }] });
          } else {
            mainStack?.navigate("Onboarding");
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        styles.containerRelative,
        { paddingTop: insets.top },
      ]}
    >
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 78 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title — card 0 */}
        <Animated.View
          style={{
            opacity: cardAnims[0].opacity,
            transform: [{ translateY: cardAnims[0].translateY }],
          }}
        >
          <Text style={styles.headerTitle}>Profile</Text>
        </Animated.View>

        {/* User card — card 1: logged in (name, email, edit) yoki login */}
        <Animated.View
          style={{
            opacity: cardAnims[1].opacity,
            transform: [{ translateY: cardAnims[1].translateY }],
          }}
        >
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <User size={32} color={colors.textTertiary} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user ? user.full_name || user.email || "User" : "Anonym User"}
              </Text>
              <Text style={styles.userHint} numberOfLines={1}>
                {user ? user.email || "" : "Please login"}
              </Text>
            </View>
            {user ? (
              <Pressable
                style={styles.editBtn}
                onPress={() => mainStack?.navigate("EditProfile")}
              >
                <PencilSimpleIcon size={22} color={colors.textSecondary} weight="bold" />
              </Pressable>
            ) : (
              <Pressable
                style={styles.loginBtn}
                onPress={() => navigateTo("GetStarted")}
              >
                <Text style={styles.loginBtnText}>Login</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* General — card 2 */}
        <Animated.View
          style={{
            opacity: cardAnims[2].opacity,
            transform: [{ translateY: cardAnims[2].translateY }],
          }}
        >
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.sectionCard}>
            {GENERAL_ITEMS.map((item, index) => (
              <RowItem
                key={item.id}
                Index={index}
                Icon={item.Icon}
                label={item.label}
                value={item.id === "currency" ? preferredCurrency : item.value}
                onPress={item.route ? () => navigateTo(item.route) : undefined}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>

        {/* Other — card 3 */}
        <Animated.View
          style={{
            opacity: cardAnims[3].opacity,
            transform: [{ translateY: cardAnims[3].translateY }],
          }}
        >
          <Text style={styles.sectionTitle}>Other</Text>
          <View style={styles.sectionCard}>
            {OTHER_ITEMS.map((item, index) => (
              <RowItem
                key={item.id}
                Index={index}
                Icon={item.Icon}
                label={item.label}
                onPress={
                  item.id === 'rate'
                    ? () => requestAppReview()
                    : item.id === 'privacy'
                      ? openPrivacyPolicy
                      : item.id === 'terms'
                        ? openTermsOfUse
                        : item.route
                          ? () => navigateTo(item.route)
                          : undefined
                }
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>

        {/* Log out — faqat logged in bo‘lsa */}
        {user ? (
          <Animated.View
            style={{
              opacity: cardAnims[3].opacity,
              transform: [{ translateY: cardAnims[3].translateY }],
            }}
          >
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <SignOut size={22} color={colors.red} weight="regular" />
              <Text style={[styles.logoutBtnText, {color: colors.red}]}>Log out</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

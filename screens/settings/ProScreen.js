import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'phosphor-react-native';
import { openTermsOfUse, openPrivacyPolicy } from '../../lib/legalLinks';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { fonts } from '../../theme';
import { getPackageToPurchase, purchasePackage, restorePurchases } from '../../lib/revenueCat';
import { t } from '../../lib/i18n';

const COUNTDOWN_MS = 3000;
const PROGRESS_SIZE = 32;
const PROGRESS_STROKE = 3;
const PROGRESS_R = PROGRESS_SIZE / 2 - PROGRESS_STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * PROGRESS_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = 290;
const GRADIENT_HEIGHT = 140;

// PRO screen only – always dark mode (ignores app theme)
const PRO_DARK = {
  bg: '#000000',
  bgCard: '#1A1A1A',
  text: '#FFFFFF',
  textMuted: '#B0B0B0',
  border: '#3A3A3A',
  borderGold: '#C9A227',
  gold: '#C9A227',
  green: '#44D84B',
};

const FEATURE_KEYS = ['pro.feature1', 'pro.feature2', 'pro.feature3', 'pro.feature4'];

export default function ProScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState('weekly'); // 'weekly' | 'annual'
  const [showClose, setShowClose] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const closeOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: COUNTDOWN_MS,
      useNativeDriver: false,
    }).start(() => {
      Animated.parallel([
        Animated.timing(progressOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(closeOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowClose(true));
    });
  }, []);

  // 3 sekun davomida orqaga chiqishni bloklash: Android back, iOS swipe, boshqa usullar
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: showClose });
  }, [navigation, showClose]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!showClose) return true;
        return false;
      });
      return () => sub.remove();
    }
  }, [showClose]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (showClose) return;
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation, showClose]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" backgroundColor="transparent" />

      {/* Header image + gradient — image under status bar so bar is transparent */}
      <View style={[styles.headerImageWrap, { height: HEADER_IMAGE_HEIGHT }]}>
        <Image
          source={require('../../assets/PRO.png')}
          style={[styles.headerImage, { top: 0, height: HEADER_IMAGE_HEIGHT }]}
          resizeMode="cover"
        />
        <View style={[styles.gradientOverlay, { bottom: 0, height: GRADIENT_HEIGHT }]} pointerEvents="none">
          <Svg width={SCREEN_WIDTH} height={GRADIENT_HEIGHT} style={styles.gradientSvg}>
            <Defs>
              <LinearGradient id="proFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="transparent" stopOpacity="0" />
                <Stop offset="0.5" stopColor={PRO_DARK.bg} stopOpacity="0.6" />
                <Stop offset="1" stopColor={PRO_DARK.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={SCREEN_WIDTH} height={GRADIENT_HEIGHT} fill="url(#proFade)" />
          </Svg>
        </View>
        {/* 3s progress circle — then fade out; X fades in */}
        <View style={[styles.closeBtnWrap, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Animated.View style={[styles.progressWrap, { opacity: progressOpacity }]} pointerEvents="none">
            <Svg width={PROGRESS_SIZE} height={PROGRESS_SIZE} style={styles.progressSvg}>
              <Circle
                cx={PROGRESS_SIZE / 2}
                cy={PROGRESS_SIZE / 2}
                r={PROGRESS_R}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={PROGRESS_STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={PROGRESS_SIZE / 2}
                cy={PROGRESS_SIZE / 2}
                r={PROGRESS_R}
                stroke={PRO_DARK.text}
                strokeWidth={PROGRESS_STROKE}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${PROGRESS_SIZE / 2} ${PROGRESS_SIZE / 2})`}
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.closeBtnAnimated, { opacity: closeOpacity }]} pointerEvents={showClose ? 'box-none' : 'none'}>
            <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <X size={24} color={PRO_DARK.text} weight="bold" />
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.scrollContent, { transform: [{ translateY: -10 }] }]}>
        <Text style={styles.headline}>{t('pro.unlockPremium')}</Text>
        <Text style={styles.description}>{t('pro.description')}</Text>

        {FEATURE_KEYS.map((key, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={24} color={PRO_DARK.text} />
            <Text style={styles.featureText}>{t(key)}</Text>
          </View>
        ))}

        <View style={styles.planRow}>
          <Pressable
            style={[styles.planCard, plan === 'weekly' && styles.planCardSelected]}
            onPress={() => setPlan('weekly')}
          >
            <View style={[styles.planCardBadge, plan === 'weekly' && styles.planCardBadgeSelected]}>
              {plan === 'weekly' ? (
                <Check size={14} color={PRO_DARK.bg} weight="bold" />
              ) : null}
            </View>
            <Text style={styles.planTitle}>{t('pro.weekly')}</Text>
            <Text style={styles.planSub}>{t('pro.weeklyPrice')}</Text>
          </Pressable>

          <Pressable
            style={[styles.planCard, plan === 'annual' && styles.planCardSelected]}
            onPress={() => setPlan('annual')}
          >
            <View style={[styles.planCardBadge, plan === 'annual' && styles.planCardBadgeSelected]}>
              {plan === 'annual' ? (
                <Check size={14} color={PRO_DARK.bg} weight="bold" />
              ) : null}
            </View>
            <Text style={styles.planTitle}>{t('pro.annual')}</Text>
            <Text style={styles.planSub}>{t('pro.annualPrice')}</Text>
          </Pressable>
        </View>

        <Text style={styles.pricingNote}>{plan === 'annual' ? t('pro.annualNote') : t('pro.trialNote')}</Text>

        <Pressable
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={async () => {
            if (purchasing) return;
            setPurchasing(true);
            try {
              const pkg = await getPackageToPurchase(plan);
              if (!pkg) {
                Alert.alert(t('common.error'), t('pro.noPackageAvailable'), [{ text: t('common.ok') }]);
                return;
              }
              await purchasePackage(pkg);
              navigation.goBack();
            } catch (e) {
              if (e?.userCancelled ?? e?.code === 'PURCHASE_CANCELLED') return;
              Alert.alert(t('common.error'), e?.message || t('pro.purchaseFailed'), [{ text: t('common.ok') }]);
            } finally {
              setPurchasing(false);
            }
          }}
          disabled={purchasing}
        ><Text style={styles.ctaBtnText}>{t('pro.continue')}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={openTermsOfUse}>
            <Text style={styles.footerLink}>{t('pro.termsOfUse')}</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              const info = await restorePurchases();
              if (info == null) {
                Alert.alert(t('common.error'), t('pro.restoreError'), [{ text: t('common.ok') }]);
                return;
              }
              const hasActive = info.entitlements?.active && Object.keys(info.entitlements.active).length > 0;
              if (!hasActive) {
                Alert.alert(t('pro.noPurchasesTitle'), t('pro.noPreviousMembership'), [{ text: t('common.ok') }]);
                return;
              }
              Alert.alert(t('pro.successTitle'), t('pro.membershipRestored'), [{ text: t('common.ok') }]);
              navigation.goBack();
            }}
          >
            <Text style={styles.footerLink}>{t('pro.restore')}</Text>
          </Pressable>
          <Pressable onPress={openPrivacyPolicy}>
            <Text style={styles.footerLink}>{t('pro.privacyPolicy')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRO_DARK.bg,
  },
  headerImageWrap: {
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gradientSvg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeBtnWrap: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
  },
  progressWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
  },
  progressSvg: {},
  closeBtnAnimated: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    margin: -6,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 38,
    color: PRO_DARK.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: PRO_DARK.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  featureText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: PRO_DARK.text,
    flex: 1,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 24,
  },
  planCard: {
    flex: 1,
    position: 'relative',
    backgroundColor: PRO_DARK.bgCard,
    borderWidth: 1,
    borderColor: PRO_DARK.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  planCardSelected: {
    borderColor: PRO_DARK.borderGold,
  },
  planCardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRO_DARK.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCardBadgeSelected: {
    borderColor: PRO_DARK.borderGold,
    backgroundColor: PRO_DARK.gold,
  },
  planTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 28,
    color: PRO_DARK.text,
    marginBottom: 4,
  },
  planSub: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: PRO_DARK.textMuted,
  },
  pricingNote: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: PRO_DARK.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaBtn: {
    backgroundColor: PRO_DARK.text,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: PRO_DARK.bg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLink: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: PRO_DARK.textMuted,
  },
});

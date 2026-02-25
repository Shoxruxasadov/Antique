import { useRef, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const QUICK_ACTIONS = [
  {
    id: 'scan',
    icon: 'camera',
    title: 'Scan Item',
    subtitle: 'Photo identification',
  },
  {
    id: 'condition',
    icon: 'search',
    title: 'Check Condition',
    subtitle: 'Detailed analysis',
  },
  {
    id: 'verify',
    icon: 'checkmark-done',
    title: 'Verify Authenticity',
    subtitle: 'Expert guidelines',
  },
  {
    id: 'collection',
    icon: 'book-outline',
    title: 'My Collection',
    subtitle: 'View saved items',
  },
];

const CARD_COUNT = 7;
const DELAY_STEP = 70;
const ANIM_DURATION = 550;

function createCardAnims() {
  return Array.from({ length: CARD_COUNT }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(36),
  }));
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardGap = 12;
  const cardWidth = (width - 32 - cardGap) / 2;
  const cardAnims = useRef(createCardAnims()).current;
  const easeOut = Easing.bezier(0.25, 0.1, 0.25, 1);

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
    }, [cardAnims, easeOut])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: USD + PRO — card 0 */}
        <Animated.View style={{ opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}>
          <View style={styles.header}>
            <View style={styles.currencyBlock}>
              <Text style={styles.currencyFlag}>🇺🇸</Text>
              <View>
                <Text style={styles.currencyCode}>USD</Text>
                <Text style={styles.currencyLabel}>Preferred Currency</Text>
              </View>
            </View>
            <Pressable
              style={styles.proBtn}
              onPress={() => navigation.getParent()?.navigate('Pro')}
            >
              <Ionicons name="diamond" size={18} color={colors.textWhite} />
              <Text style={styles.proBtnText}>PRO</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Main card — card 1 */}
        <Animated.View style={{ opacity: cardAnims[1].opacity, transform: [{ translateY: cardAnims[1].translateY }] }}>
          <View style={styles.mainCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.mainCardIcon}
              resizeMode="contain"
            />
            <Text style={styles.mainCardTitle}>AI Powered Antique item Identifier.</Text>
            <Pressable
              style={styles.identifyBtn}
              onPress={() => navigation.getParent()?.navigate('Identify')}
            >
              <Ionicons name="camera" size={22} color={colors.textWhite} />
              <Text style={styles.identifyBtnText}>Identify Now</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Quick Actions — card 2 (title) + cards 3–6 */}
        <Animated.View style={{ opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </Animated.View>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item, i) => (
            <Animated.View
              key={item.id}
              style={[
                { width: cardWidth },
                { opacity: cardAnims[3 + i].opacity, transform: [{ translateY: cardAnims[3 + i].translateY }] },
              ]}
            >
              <Pressable
                style={styles.quickCard}
                onPress={() => {
                  if (item.id === 'collection') navigation.navigate('Collection');
                  if (item.id === 'scan') navigation.getParent()?.navigate('Identify');
                }}
              >
                <Ionicons name={item.icon} size={28} color={colors.brand} />
                <Text style={styles.quickCardTitle}>{item.title}</Text>
                <Text style={styles.quickCardSubtitle}>{item.subtitle}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  currencyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyFlag: {
    fontSize: 28,
  },
  currencyCode: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textBase,
  },
  currencyLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
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
    fontWeight: '600',
    color: colors.textBase,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  identifyBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickCardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textBase,
    marginTop: 12,
  },
  quickCardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

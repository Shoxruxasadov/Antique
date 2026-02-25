import { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';

const { width } = Dimensions.get('window');

const IMAGE_SIZE = 276;

const SLIDES = [
  {
    id: '1',
    image: require('../../assets/onboarding/Frame-1.png'),
    title: 'Discover the Story Behind Every Antique',
    description:
      'Scan objects instantly and uncover their age, origin, and hidden history.',
  },
  {
    id: '2',
    image: require('../../assets/onboarding/Frame-2.png'),
    title: 'Identify & Value Your Treasures',
    description:
      'Get accurate item IDs and real-time market value estimates in seconds.',
  },
  {
    id: '3',
    image: require('../../assets/onboarding/Frame-3.png'),
    title: 'Expert-Level Insights, Powered by AI',
    description:
      'Analyze details like a professional appraiser — effortlessly and anywhere.',
  },
];

const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = DOT_SIZE * 3;
const DOT_GAP = 10;

function AnimatedDot({ active }) {
  const widthAnim = useRef(new Animated.Value(DOT_SIZE)).current;
  const opacityAnim = useRef(new Animated.Value(0.45)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: active ? DOT_ACTIVE_WIDTH : DOT_SIZE,
        useNativeDriver: false,
        friction: 7,
        tension: 120,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.45,
        duration: 220,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(scaleAnim, {
        toValue: active ? 1 : 0.9,
        useNativeDriver: false,
        friction: 6,
        tension: 100,
      }),
    ]).start();
  }, [active, widthAnim, opacityAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.dotBase,
        {
          width: widthAnim,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        active && styles.dotActiveColor,
      ]}
    />
  );
}

export default function OnboardingScreen({ navigation, onComplete, onSkip }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const finishOnboarding = () => {
    onComplete?.();
    navigation.navigate('GetStarted');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.imageWrapper}>
        <View style={styles.circle}>
          <Image
            source={item.image}
            style={styles.slideImage}
            resizeMode="contain"
          />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Pressable
        style={[styles.skipButton, { top: insets.top + 12 }]}
        onPress={finishOnboarding}
      >
        <Text style={styles.skipText}>Skip →</Text>
      </Pressable>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <AnimatedDot key={index} active={index === currentIndex} />
          ))}
        </View>
        <Pressable style={styles.continueButton} onPress={handleNext}>
          <Text style={styles.continueButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontSize: 16,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: '20%',
    justifyContent: 'center',
  },
  imageWrapper: {
    marginBottom: 32,
  },
  circle: {
    width: IMAGE_SIZE + 48,
    height: IMAGE_SIZE + 48,
    borderRadius: (IMAGE_SIZE + 48) / 2,
    backgroundColor: colors.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.textBase,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DOT_GAP,
  },
  dotBase: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.border3,
  },
  dotActiveColor: {
    backgroundColor: colors.textBase,
  },
  continueButton: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.textWhite,
    fontSize: 18,
  },
});

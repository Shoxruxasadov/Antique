import { useRef, useState, useEffect } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { darkTheme, fonts } from "../../theme";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

// iPhone 14: ~85% width, aspect 844/390
const PHONE_WIDTH = WINDOW_WIDTH;
const PHONE_ASPECT = 844 / 390;
const PHONE_HEIGHT = PHONE_WIDTH * PHONE_ASPECT;
// Screen insets inside frame (~7% sides, ~5% top/bottom)
const SCREEN_INSET_X = PHONE_WIDTH * 0.07;
const SCREEN_INSET_Y = PHONE_HEIGHT * 0.055;
const SCREEN_WIDTH = PHONE_WIDTH - SCREEN_INSET_X * 2;
const SCREEN_HEIGHT = PHONE_HEIGHT - SCREEN_INSET_Y * 2;

// Variant B: full onboarding images; crop to screen via position (center ~85% of image = phone screen)
const SLIDES = [
  {
    id: "1",
    screenImage: require("../../assets/onboarding/Onboarding-clear1.png"),
    title: "Discover the Story\nBehind Every Antique",
    description:
      "Scan objects instantly and uncover their age, origin, and hidden history.",
  },
  {
    id: "2",
    screenImage: require("../../assets/onboarding/Onboarding-clear2.png"),
    title: "Identify & Value Your Treasures",
    description:
      "Get accurate item IDs and real-time market value estimates in seconds.",
  },
  {
    id: "3",
    screenImage: require("../../assets/onboarding/Onboarding-clear3.png"),
    title: "Expert-Level Insights, Powered by AI",
    description:
      "Analyze details like a professional appraiser — effortlessly and anywhere.",
  },
];

const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;
const DOT_GAP = 8;

function PageIndicatorDot({ active }) {
  const widthAnim = useRef(new Animated.Value(DOT_SIZE)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;
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
        toValue: active ? 1 : 0.5,
        duration: 220,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: active ? 1 : 0.92,
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
          backgroundColor: active ? darkTheme.textBase : darkTheme.border3,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
}

function RadialGradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient
            id="radialBg"
            cx="0.5"
            cy="0.5"
            r="1"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0.5" stopColor="#000000" />
            <Stop offset="1" stopColor="#FAB979" />
          </RadialGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT}
          fill="url(#radialBg)"
        />
      </Svg>
    </View>
  );
}

function SlideContent({ item }) {
  return (
    <View style={[styles.slide, { width: WINDOW_WIDTH }]}>
      <Image
        source={item.screenImage}
        style={[styles.screenContentImage]}
        resizeMode="cover"
      />

      <View style={styles.slideContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    width: WINDOW_WIDTH,
    height: PHONE_HEIGHT,
  },
  overlay: {
    position: "absolute",
    width: WINDOW_WIDTH,
    height: PHONE_HEIGHT,
    left: 0,
    top: 0,
  },
  overlayGradient: {
    position: "absolute",
    width: WINDOW_WIDTH + 60,
    height: PHONE_HEIGHT + 100,
    left: -30,
    top: -100,
  },
  content: {
    flex: 1,
    position: "absolute",
    width: WINDOW_WIDTH,
    height: PHONE_HEIGHT,
  },
  slide: {
    width: WINDOW_WIDTH,
    height: PHONE_HEIGHT,
    flexDirection: "column",
    alignItems: "end",
    justifyContent: "end",
  },
  screenContentImage: {
    position: "absolute",
    width: WINDOW_WIDTH,
    height: PHONE_HEIGHT,
  },
  slideContent: {
    position: "absolute",
    bottom: 170,
    left: 0,
    right: 0,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 30,
    color: darkTheme.textBase,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 12,
  },
  description: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: darkTheme.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: DOT_GAP,
  },
  dotBase: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  continueButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignSelf: "stretch",
    alignItems: "center",
  },
  continueButtonText: {
    fontFamily: fonts.semiBold,
    color: "#161412",
    fontSize: 18,
  },
});

export default function OnboardingScreen({ navigation, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const finishOnboarding = () => {
    onComplete?.();
    navigation.navigate("GetStarted");
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

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / WINDOW_WIDTH);
    if (index >= 0 && index < SLIDES.length) setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <RadialGradientBackground />
      <Image
        source={require("../../assets/onboarding/overlay.png")}
        style={[styles.overlay]}
        resizeMode="cover"
      />
      <Image
        source={require("../../assets/onboarding/overlay-gradient.png")}
        style={[styles.overlayGradient]}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={({ item }) => <SlideContent item={item} />}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <PageIndicatorDot key={index} active={index === currentIndex} />
          ))}
        </View>
        <Pressable style={styles.continueButton} onPress={handleNext}>
          <Text style={styles.continueButtonText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

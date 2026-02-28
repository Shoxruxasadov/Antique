import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  useWindowDimensions,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FALLBACK_BODY = 'No content available.';

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgBase },
    imageArea: { width: '100%', backgroundColor: colors.bgBase },
    heroImage: { width: '100%', backgroundColor: colors.bgSurface },
    placeholderImage: {},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      position: 'absolute',
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentSheet: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    handleWrap: { alignSelf: 'center' },
    headerHandle: {
      width: 40,
      borderRadius: 3,
      overflow: 'hidden',
    },
    sheetHeaderRowWrap: { overflow: 'hidden' },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    contentScrollWrap: { flex: 1 },
    contentScroll: { flex: 1 },
    contentScrollContent: { paddingTop: 0 },
    contentArea: { paddingHorizontal: 16, paddingTop: 4 },
    cardTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.textBase,
      marginBottom: 8,
      lineHeight: 28,
    },
    cardMeta: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    cardBody: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.textBase,
      lineHeight: 24,
    },
  });
}

export default function PostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const IMAGE_SIZE = width;
  const COLLAPSED_Y = IMAGE_SIZE - 20;
  const EXPANDED_Y = 0;

  const post = route?.params?.post || {
    title: 'Post',
    readTime: '',
    content: FALLBACK_BODY,
  };
  const bodyText = post.content || post.excerpt || FALLBACK_BODY;

  const sheetY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const expandProgress = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);
  const scrollRef = useRef(null);
  const contentScrollYRef = useRef(0);

  const closeBtnImageOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const closeBtnStickyOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [1, 0],
    extrapolate: 'clamp',
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

  const doExpand = useCallback(() => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(sheetY, {
      toValue: EXPANDED_Y,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    Animated.timing(expandProgress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [sheetY, expandProgress]);

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

  const handleContentScroll = useCallback((e) => {
    contentScrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

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

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent?.(true);
      RNStatusBar.setBackgroundColor?.('transparent');
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <View style={[styles.imageArea, { height: IMAGE_SIZE }]}>
        {post.image_url ? (
          <Image
            source={{ uri: post.image_url }}
            style={[styles.heroImage, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
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

      <View style={[styles.header, { top: insets.top }]} pointerEvents="box-none">
        <Animated.View style={{ opacity: closeBtnImageOpacity }}>
          <TouchableOpacity onPress={handleClose} style={styles.headerCloseBtn}>
            <X size={20} color={colors.textBase} weight="bold" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.contentSheet,
          { transform: [{ translateY: sheetY }], backgroundColor: colors.bgBase },
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
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={handleContentScroll}
              onScrollEndDrag={handleContentScrollEndDrag}
              scrollEventThrottle={16}
              bounces
            >
              <View
                style={[
                  styles.contentArea,
                  { backgroundColor: colors.bgBase },
                ]}
              >
                <Text style={styles.cardTitle}>{post.title}</Text>
                <Text style={styles.cardMeta}>
                  {post.meta || post.readTime}
                </Text>
                <Text style={styles.cardBody}>{bodyText}</Text>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

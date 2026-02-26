import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_ROW_PADDING = 16;

const BLOG_TABS = ['Analyzing', 'News', 'Latest Posts'];

const MOCK_POSTS = [
  {
    id: '1',
    title: 'Understanding Antique Rarity: What Makes a Antique Valuable?',
    readTime: '3 min read',
    imageUrl: null,
  },
  {
    id: '2',
    title: 'Understanding Coin Rarity: What Makes a Coin Valuable?',
    readTime: '5 min read',
    imageUrl: null,
  },
  {
    id: '3',
    title: 'Caring for Vintage Porcelain and Ceramics',
    readTime: '4 min read',
    imageUrl: null,
  },
];

function BlogCard({ post, onPress }) {
  return (
    <Pressable style={styles.blogCard} onPress={() => onPress(post)}>
      <View style={styles.blogThumbWrap}>
        <View style={[styles.blogThumb, styles.blogThumbEmpty]} />
      </View>
      <View style={styles.blogCardBody}>
        <Text style={styles.blogCardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.blogCardMeta}>{post.readTime}</Text>
      </View>
    </Pressable>
  );
}

const INDICATOR_DURATION = 250;
const INDICATOR_EASING = Easing.bezier(0.33, 1, 0.68, 1);

export default function AllPostsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const tabLayouts = useRef(Array(BLOG_TABS.length).fill(null));
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const animateToTab = (index) => {
    const layout = tabLayouts.current[index];
    if (!layout) return;
    Animated.parallel([
      Animated.timing(indicatorLeft, {
        toValue: layout.x,
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorWidth, {
        toValue: layout.width,
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
        useNativeDriver: false,
      }),
    ]).start();
  };

  useEffect(() => {
    animateToTab(activeTab);
  }, [activeTab]);

  const handleTabLayout = (index, e) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    if (index === activeTab) {
      animateToTab(index);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textBase} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabRow}>
        {/* Rels: to‘liq ekran enidagi chiziq, indicator ustida harakatlanadi */}
        <View style={styles.tabRail} />
        <View style={styles.tabRowInner}>
          {BLOG_TABS.map((label, idx) => (
            <Pressable
              key={label}
              style={styles.tab}
              onLayout={(e) => handleTabLayout(idx, e)}
              onPress={() => setActiveTab(idx)}
            >
              <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
          <Animated.View
            style={[
              styles.tabIndicatorAbsolute,
              {
                left: indicatorLeft,
                width: indicatorWidth,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_POSTS.map((post) => (
          <BlogCard
            key={post.id}
            post={post}
            onPress={(p) => navigation.navigate('Post', { post: p })}
          />
        ))}
      </ScrollView>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textBase,
  },
  headerSpacer: { width: 44 },
  tabRow: {
    position: 'relative',
    paddingHorizontal: TAB_ROW_PADDING,
    paddingBottom: 8,
    overflow: 'visible',
  },
  tabRail: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: 2,
    backgroundColor: colors.border2,
    borderRadius: 1,
  },
  tabRowInner: {
    flexDirection: 'row',
    gap: 24,
    position: 'relative',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.brand,
    fontFamily: fonts.semiBold,
  },
  tabIndicatorAbsolute: {
    position: 'absolute',
    bottom: -8,
    height: 2,
    backgroundColor: colors.brand,
    borderRadius: 1,
    zIndex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },
  blogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  blogThumbWrap: { marginRight: 12 },
  blogThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.border3,
  },
  blogThumbEmpty: {},
  blogCardBody: { flex: 1, minWidth: 0 },
  blogCardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textBase,
    marginBottom: 4,
  },
  blogCardMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

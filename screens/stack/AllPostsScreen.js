import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';
import { fetchBlogCategories, fetchBlogs } from '../../lib/blogApi';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_ROW_PADDING = 16;

function BlogCard({ post, onPress, styles }) {
  const imageUrl = post.image_url;
  return (
    <Pressable style={styles.blogCard} onPress={() => onPress(post)}>
      <View style={styles.blogThumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.blogThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.blogThumb, styles.blogThumbEmpty]} />
        )}
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
  const colors = useColors();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const tabLayouts = useRef([]);
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const tabs = useMemo(() => {
    const list = [{ id: null, name: 'All' }];
    categories.forEach((c) => list.push({ id: c.id, name: c.name }));
    return list;
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchBlogCategories();
      if (!cancelled) setCategories(list);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    tabLayouts.current = Array(tabs.length).fill(null);
  }, [tabs.length]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const categoryId = activeTab === 0 ? null : categories[activeTab - 1]?.id ?? null;
    (async () => {
      const list = await fetchBlogs({ categoryId });
      if (!cancelled) {
        setPosts(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, categories]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgBase },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
        backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
        headerTitle: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.textBase },
        headerSpacer: { width: 44 },
        tabRow: { position: 'relative', paddingHorizontal: TAB_ROW_PADDING, paddingBottom: 8, overflow: 'visible' },
        tabRail: { position: 'absolute', left: 0, bottom: 0, width: SCREEN_WIDTH, height: 3, backgroundColor: colors.border2, borderRadius: 1 },
        tabRowInner: { flexDirection: 'row', gap: 24, position: 'relative' },
        tab: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
        tabText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textTertiary },
        tabTextActive: { color: colors.brand, fontFamily: fonts.semiBold },
        tabIndicatorAbsolute: { position: 'absolute', bottom: -8, height: 3, backgroundColor: colors.brand, borderRadius: 2, zIndex: 1 },
        scroll: { flex: 1 },
        scrollContent: { padding: 16, paddingTop: 20 },
        blogCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgWhite, borderRadius: 20, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
        blogThumbWrap: { marginRight: 12 },
        blogThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.border3 },
        blogThumbEmpty: {},
        blogCardBody: { flex: 1, minWidth: 0 },
        blogCardTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textBase, marginBottom: 4 },
        blogCardMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        emptyCard: { backgroundColor: colors.bgWhite, borderRadius: 20, padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
        emptyCardText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
      }),
    [colors]
  );

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
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <CaretLeft size={24} color={colors.textBase} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabRow}>
        <View style={styles.tabRail} />
        <View style={styles.tabRowInner}>
          {tabs.map((tab, idx) => (
            <Pressable
              key={tab.id ?? 'all'}
              style={styles.tab}
              onLayout={(e) => handleTabLayout(idx, e)}
              onPress={() => setActiveTab(idx)}
            >
              <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                {tab.name}
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
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No posts yet</Text>
          </View>
        ) : (
          posts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              onPress={(p) => navigation.navigate('Post', { post: p })}
              styles={styles}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

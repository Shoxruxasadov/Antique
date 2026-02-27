import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';

const MOCK_BODY = `Age, condition, historical significance, craftsmanship, and market demand all play a role in determining an item's value.

1. Age Alone Is Not Enough

While antiques are typically defined as objects at least 100 years old, age alone does not guarantee value. A well-preserved piece with documented provenance and aesthetic appeal will often outperform a similar but damaged or unremarkable item.`;

export default function PostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const post = route?.params?.post || {
    title: 'Understanding Antique Rarity: What Makes a Antique Valuable?',
    readTime: '3 min read',
    meta: 'France · 1800 - 1900 yrs',
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgBase },
        headerImage: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%' },
        headerImagePlaceholder: { flex: 1, backgroundColor: colors.bgSurface },
        closeBtn: { position: 'absolute', top: 50, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
        cardScroll: { flex: 1, marginTop: '35%' },
        cardContent: { backgroundColor: colors.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12 },
        cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border3, alignSelf: 'center', marginBottom: 20 },
        cardTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.textBase, marginBottom: 8, lineHeight: 28 },
        cardMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
        cardBody: { fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, lineHeight: 24 },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <View style={styles.headerImage}>
        <View style={styles.headerImagePlaceholder} />
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <X size={24} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.cardScroll, { paddingTop: insets.top }]}
        contentContainerStyle={[styles.cardContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardHandle} />
        <Text style={styles.cardTitle}>{post.title}</Text>
        <Text style={styles.cardMeta}>{post.meta || post.readTime}</Text>
        <Text style={styles.cardBody}>{MOCK_BODY}</Text>
      </ScrollView>
    </View>
  );
}

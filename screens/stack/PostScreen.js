import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useColors, fonts } from '../../theme';

const FALLBACK_BODY = 'No content available.';

export default function PostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const post = route?.params?.post || {
    title: 'Post',
    readTime: '',
    content: FALLBACK_BODY,
  };
  const bodyText = post.content || post.excerpt || FALLBACK_BODY;

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
        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.headerImagePlaceholder} />
        )}
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
        <Text style={styles.cardBody}>{bodyText}</Text>
      </ScrollView>
    </View>
  );
}

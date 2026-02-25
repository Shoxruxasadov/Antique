import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { analyzeAntiqueImage } from '../../lib/gemini';
import { fetchMarketPricesFromEbay } from '../../lib/ebay';
import * as FileSystem from 'expo-file-system';
import { uploadSnapImage } from '../../lib/snapStorage';

function isLocalFileUri(uri) {
  return typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('content://'));
}

function mimeFromUri(uri) {
  if (!uri) return 'image/jpeg';
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

async function ensurePublicImageUrl(imageUri, base64, userId) {
  if (!userId || !imageUri) return imageUri;
  if (!isLocalFileUri(imageUri)) return imageUri;
  const snapId = `snap_${Date.now()}`;
  let data = base64 || '';
  let contentType = mimeFromUri(imageUri);
  if (!data && imageUri) {
    try {
      data = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (e) {
      console.warn('Read local image failed:', e?.message);
      return imageUri;
    }
  }
  const uploaded = await uploadSnapImage(userId, snapId, data, contentType);
  return uploaded || imageUri;
}

function goBackToMain(navigation) {
  navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
}

function useAnalyzeAndSave(imageUri, base64, navigation) {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState('Surface & Shape Check');
  const [error, setError] = useState(null);
  const [notAntique, setNotAntique] = useState(false);
  const [notAntiqueReason, setNotAntiqueReason] = useState('');

  useEffect(() => {
    if (!imageUri) return;
    let cancelled = false;

    (async () => {
      try {
        setStep('Surface & Shape Check');
        const geminiResult = await analyzeAntiqueImage(base64 || '', 'image/jpeg');
        if (cancelled) return;
        if (geminiResult.is_antique === false) {
          setNotAntique(true);
          setNotAntiqueReason(geminiResult.not_antique_reason || 'This does not appear to be an antique.');
          return;
        }
        setStep('Market value');
        const { market_value_min, market_value_max, avg_growth_percentage, image_urls: ebayImageUrls } =
          await fetchMarketPricesFromEbay(geminiResult.search_keywords || []);
        if (cancelled) return;

        const now = new Date().toISOString();
        const userId = user?.id;
        let scanImageUrl = imageUri;
        if (isSupabaseConfigured() && supabase && userId && isLocalFileUri(imageUri)) {
          scanImageUrl = await ensurePublicImageUrl(imageUri, base64, userId);
        }

        const antiqueImageUrls = Array.isArray(ebayImageUrls) && ebayImageUrls.length > 0
          ? ebayImageUrls
          : [scanImageUrl];
        const snapDisplayImageUrl = antiqueImageUrls[0] || scanImageUrl;

        const antiqueRow = {
          user_id: userId,
          name: geminiResult.name || 'Unknown Antique',
          description: geminiResult.description || '',
          image_url: antiqueImageUrls,
          origin_country: geminiResult.origin_country || 'Unknown',
          period_start_year: Number(geminiResult.period_start_year) || 1800,
          period_end_year: Number(geminiResult.period_end_year) || 1900,
          estimated_age_years: Number(geminiResult.estimated_age_years) || 50,
          rarity_score: 7,
          rarity_max_score: 10,
          overall_condition_summary: geminiResult.overall_condition_summary || 'Good',
          condition_grade: geminiResult.condition_grade || 'B',
          condition_description: geminiResult.condition_description || '',
          market_value_min: market_value_min ?? 0,
          market_value_max: market_value_max ?? 0,
          avg_growth_percentage: avg_growth_percentage ?? 0,
          mechanical_function_status: geminiResult.mechanical_function_status || 'N/A',
          mechanical_function_notes: geminiResult.mechanical_function_notes || '',
          case_condition_status: geminiResult.case_condition_status || 'N/A',
          case_condition_notes: geminiResult.case_condition_notes || '',
          dial_hands_condition_status: geminiResult.dial_hands_condition_status || 'N/A',
          dial_hands_condition_notes: geminiResult.dial_hands_condition_notes || '',
          crystal_condition_status: geminiResult.crystal_condition_status || 'N/A',
          crystal_condition_notes: geminiResult.crystal_condition_notes || '',
          category: Array.isArray(geminiResult.category) ? geminiResult.category : ['Antique'],
          specification: geminiResult.specification ?? {},
          origin_provenance: geminiResult.origin_provenance ?? '',
          source: geminiResult.source ?? 'AI Analysis',
          purchase_price: geminiResult.purchase_price ?? null,
          created_at: now,
          updated_at: now,
        };

        if (!userId) {
          navigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'ItemDetails', params: { antique: { ...antiqueRow, id: null }, fromScan: true } },
            ],
          });
          return;
        }

        const { data: antique, error: antErr } = await supabase
          .from('antiques')
          .insert(antiqueRow)
          .select('id')
          .single();
        if (antErr) throw antErr;
        if (cancelled) return;

        const payload = {
          ...geminiResult,
          market_value_min,
          market_value_max,
          avg_growth_percentage,
        };
        const { error: snapErr } = await supabase.from('snap_history').insert({
          user_id: userId,
          image_url: snapDisplayImageUrl,
          antique_id: antique.id,
          payload,
        });
        if (snapErr) throw snapErr;
        if (cancelled) return;

        navigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'ItemDetails', params: { antiqueId: antique.id, fromScan: true } },
          ],
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Analysis failed');
      }
    })();

    return () => { cancelled = true; };
  }, [imageUri, base64, user?.id, navigation]);

  return { step, error, notAntique, notAntiqueReason };
}

export default function AnalyzingScreen({ route, navigation }) {
  const { imageUri, base64 } = route.params || {};
  const { step, error, notAntique, notAntiqueReason } = useAnalyzeAndSave(imageUri, base64, navigation);

  if (notAntique) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <View style={styles.notAntiqueCard}>
          <Ionicons name="warning-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.notAntiqueTitle}>Bu antikvar emas</Text>
          <Text style={styles.notAntiqueReason}>{notAntiqueReason}</Text>
          <Text style={styles.backHint} onPress={() => navigation.goBack()}>
            Orqaga
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.backHint} onPress={() => goBackToMain(navigation)}>Orqaga</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.bgImage}
        blurRadius={24}
      >
        <View style={styles.overlay} />
        <View style={styles.card}>
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          <Text style={styles.scanningText}>Scanning...</Text>
          <View style={styles.stepRow}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={18} color={colors.textWhite} />
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
          <ActivityIndicator color={colors.brand} style={styles.spinner} />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  bgImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '84%',
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.border1,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.textBase,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textBase,
  },
  spinner: { marginTop: 16 },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  backHint: { color: colors.brand, marginTop: 16, fontSize: 16 },
  notAntiqueCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 24,
    maxWidth: 320,
  },
  notAntiqueTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    color: colors.textBase,
    marginTop: 16,
  },
  notAntiqueReason: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

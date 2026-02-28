import * as FileSystem from 'expo-file-system';
import { supabase, isSupabaseConfigured } from './supabase';
import { useLocalCollectionStore } from '../stores/useLocalCollectionStore';
import { SAVED_COLLECTION_NAME } from '../stores/useLocalCollectionStore';
import { uploadSnapImage } from './snapStorage';

async function resolveImageUrlForUpload(userId, imageUrl) {
  if (!imageUrl || imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const snapId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return await uploadSnapImage(userId, snapId, base64, 'image/jpeg');
  }
  if (imageUrl.startsWith('file://')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUrl, { encoding: FileSystem.EncodingType.Base64 });
      const snapId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return await uploadSnapImage(userId, snapId, base64, 'image/jpeg');
    } catch (_) {}
  }
  return null;
}

/**
 * When user logs in: upload local snap history to Supabase, ensure Saved collection exists,
 * add items to it, then clear local store.
 * @returns {Promise<number>} number of items synced (0 if none or failed); local is only cleared when > 0
 */
export async function syncLocalCollectionToSupabase(userId) {
  if (!userId || !isSupabaseConfigured() || !supabase) return 0;
  const state = useLocalCollectionStore.getState();
  const history = state.getLocalSnapHistory?.() ?? state.localSnapHistory ?? [];
  if (history.length === 0) {
    state.clearLocalAfterSync?.();
    return 0;
  }

  const now = new Date().toISOString();
  const insertedAntiqueIds = [];

  for (const snap of history) {
    const ant = snap.antique || {};
    const imageUrl = snap.image_url || ant.image_url;
    const imageBase64 = snap.image_base64;
    let publicImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : null;
    if (!publicImageUrl) {
      if (imageBase64) {
        const snapId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        publicImageUrl = await uploadSnapImage(userId, snapId, imageBase64, 'image/jpeg');
      } else if (imageUrl) {
        publicImageUrl = await resolveImageUrlForUpload(userId, imageUrl);
      }
    }

    const antiqueRow = {
      user_id: userId,
      name: ant.name || 'Unknown Antique',
      description: ant.description || '',
      image_url: publicImageUrl || null,
      origin_country: ant.origin_country || 'Unknown',
      period_start_year: Number(ant.period_start_year) || 1800,
      period_end_year: Number(ant.period_end_year) || 1900,
      estimated_age_years: Number(ant.estimated_age_years) || 50,
      rarity_score: ant.rarity_score ?? 7,
      rarity_max_score: ant.rarity_max_score ?? 10,
      overall_condition_summary: ant.overall_condition_summary || 'Good',
      condition_grade: ant.condition_grade || 'B',
      condition_description: ant.condition_description || '',
      market_value_min: ant.market_value_min ?? 0,
      market_value_max: ant.market_value_max ?? 0,
      avg_growth_percentage: ant.avg_growth_percentage ?? 0,
      mechanical_function_status: ant.mechanical_function_status || 'N/A',
      mechanical_function_notes: ant.mechanical_function_notes || '',
      case_condition_status: ant.case_condition_status || 'N/A',
      case_condition_notes: ant.case_condition_notes || '',
      dial_hands_condition_status: ant.dial_hands_condition_status || 'N/A',
      dial_hands_condition_notes: ant.dial_hands_condition_notes || '',
      crystal_condition_status: ant.crystal_condition_status || 'N/A',
      crystal_condition_notes: ant.crystal_condition_notes || '',
      category: Array.isArray(ant.category) ? ant.category : ['Antique'],
      specification: ant.specification ?? {},
      origin_provenance: ant.origin_provenance ?? '',
      source: ant.source ?? 'AI Analysis',
      purchase_price: ant.purchase_price ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error: antErr } = await supabase
      .from('antiques')
      .insert(antiqueRow)
      .select('id')
      .single();
    if (antErr) continue;
    insertedAntiqueIds.push(inserted.id);

    await supabase.from('snap_history').insert({
      user_id: userId,
      image_url: publicImageUrl || null,
      antique_id: inserted.id,
      payload: snap.payload || {},
    });
  }

  if (insertedAntiqueIds.length === 0) {
    return 0;
  }

  const { data: existing } = await supabase
    .from('collections')
    .select('id, antiques_ids')
    .eq('user_id', userId)
    .eq('collection_name', SAVED_COLLECTION_NAME)
    .maybeSingle();

  if (existing) {
    const current = Array.isArray(existing.antiques_ids) ? existing.antiques_ids : [];
    const merged = [...new Set([...insertedAntiqueIds, ...current])];
    await supabase
      .from('collections')
      .update({ antiques_ids: merged, updated_at: now })
      .eq('id', existing.id);
  } else {
    await supabase.from('collections').insert({
      user_id: userId,
      collection_name: SAVED_COLLECTION_NAME,
      antiques_ids: insertedAntiqueIds,
      created_at: now,
      updated_at: now,
    });
  }

  useLocalCollectionStore.getState().clearLocalAfterSync?.();
  return insertedAntiqueIds.length;
}

import { supabase } from './supabase';

const BUCKET = 'avatar';

/**
 * Base64 dan ArrayBuffer olish.
 * Avval fetch(dataUri) sinab ko‘ramiz (brauzerda to‘g‘ri ishlaydi), bo‘lmasa atob fallback.
 */
async function base64ToArrayBuffer(base64Data, contentType) {
  const base64Clean = base64Data
    .replace(/^data:image\/\w+;base64,/, '')
    .replace(/\s/g, '');
  try {
    const dataUri = `data:${contentType};base64,${base64Clean}`;
    const response = await fetch(dataUri);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer && arrayBuffer.byteLength > 0) return arrayBuffer;
  } catch (_) {}
  const binary = atob(base64Clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Profil rasmini Supabase Storage’ga yuklash.
 * Path: avatar/{userId}/profile_image.jpg (har doim jpeg — tez yuklanadi va brauzerda yaxshi ishlaydi).
 * @param {string} userId
 * @param {string} base64Data - ImagePicker’dan kelgan base64
 * @param {'image/jpeg'|'image/png'} contentType
 * @returns {Promise<string|null>} public URL yoki null
 */
export async function uploadAvatar(userId, base64Data, contentType = 'image/jpeg') {
  if (!supabase || !userId || !base64Data) return null;
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/profile_image.${ext}`;

  try {
    const arrayBuffer = await base64ToArrayBuffer(base64Data, contentType);
    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.warn('Avatar upload failed:', e?.message || e);
    return null;
  }
}

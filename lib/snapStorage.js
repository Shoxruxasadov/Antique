import { supabase } from './supabase';

const BUCKET = 'snaps';

/**
 * Snap rasmini Supabase Storage’ga yuklash.
 * Path: snaps/{userId}/{snapId}.jpg
 * @param {string} userId
 * @param {string} snapId - snap_history.id (insert qilgandan keyin) yoki unique string
 * @param {string} base64Data
 * @param {string} [contentType] - 'image/jpeg' | 'image/png'
 * @returns {Promise<string|null>} public URL
 */
async function base64ToArrayBuffer(base64Data, contentType) {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
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

function extFromMime(mime) {
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/png') return '.png';
  return '.jpg';
}

export async function uploadSnapImage(userId, snapId, base64Data, contentType = 'image/jpeg') {
  if (!supabase || !userId || !snapId || !base64Data) return null;
  const ext = extFromMime(contentType);
  const path = `${userId}/${snapId}${ext}`;
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
    console.warn('Snap upload failed:', e?.message || e);
    return null;
  }
}

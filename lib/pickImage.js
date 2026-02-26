/**
 * Rasm tanlash — expo-document-picker + expo-file-system.
 * expo-image-picker o‘rniga (native modul kerak emas).
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Galereyadan bitta rasm tanlash. Base64 o‘qiladi.
 * @returns {Promise<{ uri: string, base64: string, mimeType: string } | null>}
 */
export async function pickImageFromGallery(options = {}) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.type === 'cancel' || !result.uri) return null;
    const uri = result.uri;
    const mimeType = result.mimeType || (uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg');
    let base64 = '';
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (_) {
      return null;
    }
    return { uri, base64, mimeType };
  } catch (_) {
    return null;
  }
}

/**
 * Avatar uchun: rasm tanlash va kvadrat (square) qilib qaytarish.
 * @param {number} size - kvadrat tomoni (px)
 * @returns {Promise<{ uri: string, base64: string, mimeType: string } | null>}
 */
export async function pickAndResizeAvatar(size = 300) {
  const picked = await pickImageFromGallery();
  if (!picked?.uri) return null;
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      picked.uri,
      [{ resize: { width: size, height: size } }],
      { base64: true, format: 'jpeg', compress: 0.8 }
    );
    return {
      uri: manipulated.uri,
      base64: manipulated.base64 ?? '',
      mimeType: 'image/jpeg',
    };
  } catch (_) {
    return picked;
  }
}

/**
 * Category ni ko'rsatish uchun normallashtirish.
 * Eski ma'lumotlarda "Other" qaytgan buyumlar uchun nom bo'yicha aniq turini qaytaradi (masalan Coffee Pot).
 * @param {string} [name] - buyum nomi
 * @param {string|string[]} [category] - kategoriya (string yoki array)
 * @returns {string} - ko'rsatish uchun kategoriya
 */
export function normalizeCategoryDisplay(name, category) {
  const raw = Array.isArray(category) ? category[0] : category;
  const str = (raw ?? '').trim();
  const nameLower = (name ?? '').toLowerCase();
  if (str === 'Other' || !str) {
    if (/coffee\s*pot|coffeepot/.test(nameLower)) return 'Coffee Pot';
    if (/teapot|tea\s*pot/.test(nameLower)) return 'Teapot';
    if (/vase/.test(nameLower)) return 'Vessel';
  }
  return str || 'Antique';
}

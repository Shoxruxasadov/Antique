import { Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://webnum.com/antiqpro-privacy-policy/';
export const TERMS_OF_USE_URL = 'https://webnum.com/antiqpro-terms-of-use/';

export async function openPrivacyPolicy() {
  try {
    const can = await Linking.canOpenURL(PRIVACY_POLICY_URL);
    if (can) await Linking.openURL(PRIVACY_POLICY_URL);
  } catch (e) {
    console.warn('Open privacy policy failed:', e?.message);
  }
}

export async function openTermsOfUse() {
  try {
    const can = await Linking.canOpenURL(TERMS_OF_USE_URL);
    if (can) await Linking.openURL(TERMS_OF_USE_URL);
  } catch (e) {
    console.warn('Open terms of use failed:', e?.message);
  }
}

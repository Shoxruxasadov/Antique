import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const keys = {
  ios: 'appl_rQzNWRjuRFhUMfQItJjlywAFiye',
  android: 'goog_xxxxxxxxxxxxxxxxxxxxxxxx',
}

const PACKAGE_WEEKLY = '$rc_weekly';
const PACKAGE_ANNUAL = '$rc_annual';

let configured = false;

function getApiKeyFromFile() {
    return Platform.OS === 'ios' ? keys.ios : keys.android;
}

/**
 * Configure RevenueCat. Call once at app start (e.g. App.js).
 * API keys: lib/revenueCatKeys.js (ios, android). Copy from revenueCatKeys.example.js.
 * Fallback: EXPO_PUBLIC_REVENUECAT_API_KEY_IOS / _ANDROID in .env, or pass apiKey.
 */
export function configureRevenueCat(apiKey) {
  if (configured) return;
  const key =
    apiKey ||
    getApiKeyFromFile() ||
    (Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID);
  if (!key) return;
  try {
    Purchases.configure({ apiKey: key });
    configured = true;
  } catch (e) {
    console.warn('RevenueCat configure failed:', e?.message);
  }
}

/**
 * Debug: log offerings so you can see why packages might be [].
 * RevenueCat needs: Dashboard → Products = antiqpro_subscription_weekly, antiqpro_subscription_annual;
 * Offering (e.g. default) with packages identifier $rc_weekly and $rc_annual.
 * Xcode: Scheme → Run → Options → StoreKit Configuration = Configuration.storekit
 */
export async function getOfferingsDebug() {
  if (!configured) {
    console.warn('[RevenueCat] Not configured (missing API key?)');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    const packages = current?.availablePackages ?? [];
    const ids = packages.map((p) => p?.identifier ?? p?.packageType);
    console.log('[RevenueCat] current offering:', current?.identifier ?? 'null');
    console.log('[RevenueCat] availablePackages count:', packages.length);
    console.log('[RevenueCat] package identifiers:', ids);
    if (packages.length === 0 && current) {
      console.warn('[RevenueCat] No packages in current offering. In RevenueCat Dashboard add Products with IDs: antiqpro_subscription_weekly, antiqpro_subscription_annual and add packages $rc_weekly, $rc_annual to the Offering.');
    }
    return { offerings, current, packages };
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e?.message);
    return null;
  }
}

/**
 * Get the package to purchase for the given plan.
 * @param {'weekly'|'annual'} plan
 * @returns {Promise<import('react-native-purchases').PurchasesPackage|null>}
 */
export async function getPackageToPurchase(plan) {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering?.availablePackages?.length) {
      if (__DEV__) getOfferingsDebug();
      return null;
    }
    const id = plan === 'weekly' ? PACKAGE_WEEKLY : PACKAGE_ANNUAL;
    const pkg = offering.availablePackages.find((p) => p.identifier === id);
    return pkg || null;
  } catch (e) {
    console.warn('RevenueCat getOfferings failed:', e?.message);
    return null;
  }
}

/**
 * Purchase a package.
 * @param {import('react-native-purchases').PurchasesPackage} pkg
 * @returns {Promise<{ customerInfo: object }>}
 */
export async function purchasePackage(pkg) {
  if (!pkg) throw new Error('No package');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return { customerInfo };
}

/**
 * Get current customer info (for Pro/entitlement check).
 * @returns {Promise<import('react-native-purchases').CustomerInfo|null>}
 */
export async function getCustomerInfo() {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat getCustomerInfo failed:', e?.message);
    return null;
  }
}

/**
 * Whether the user has an active Pro entitlement.
 * @returns {Promise<boolean>}
 */
export async function checkIsPro() {
  const info = await getCustomerInfo();
  if (!info?.entitlements?.active) return false;
  return Object.keys(info.entitlements.active).length > 0;
}

/**
 * Restore purchases.
 */
export async function restorePurchases() {
  if (!configured) return null;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (e) {
    console.warn('RevenueCat restore failed:', e?.message);
    return null;
  }
}

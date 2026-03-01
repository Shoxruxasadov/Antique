import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const PACKAGE_WEEKLY = '$rc_weekly';
const PACKAGE_ANNUAL = '$rc_annual';

let configured = false;

/**
 * Configure RevenueCat. Call once at app start (e.g. App.js).
 * Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS and EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID in .env
 * or pass apiKey directly.
 */
export function configureRevenueCat(apiKey) {
  if (configured) return;
  const key = apiKey || (Platform.OS === 'ios'
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
 * Get the package to purchase for the given plan.
 * @param {'weekly'|'annual'} plan
 * @returns {Promise<import('react-native-purchases').PurchasesPackage|null>}
 */
export async function getPackageToPurchase(plan) {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering?.availablePackages?.length) return null;
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

/**
 * Supabase OAuth (Apple, Google) — Expo WebBrowser orqali.
 * Supabase Dashboard → Auth → URL Configuration da Redirect URL qo‘shing:
 *   com.webnum.antique://**
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase, isSupabaseConfigured } from './supabase';

// Web’da redirect’ni to‘g‘ri yopish uchun (Expo doc)
if (typeof WebBrowser.maybeCompleteAuthSession === 'function') {
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * OAuth orqali kirish (Apple yoki Google).
 * @param {'apple' | 'google'} provider
 * @returns {Promise<{ user: import('@supabase/supabase-js').User } | { error: string }>}
 */
/** iOS da native Apple Sign In (Supabase signInWithIdToken). */
async function signInWithAppleNative() {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { error: 'Apple Sign In is not available on this device' };
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    return { error: 'No identity token from Apple' };
  }
  const { data, error: idTokenError } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (idTokenError) {
    return { error: idTokenError.message || 'Apple sign in failed' };
  }
  if (data?.user) {
    return { user: data.user };
  }
  return { error: 'No user in session' };
}

export async function signInWithOAuthProvider(provider) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: 'Supabase not configured' };
  }

  if (provider === 'apple' && Platform.OS === 'ios') {
    try {
      return await signInWithAppleNative();
    } catch (e) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return { error: 'Cancelled' };
      }
      return { error: e?.message || String(e) };
    }
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.webnum.antique',
      path: 'auth/callback',
    });

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) {
      return { error: oauthError.message || 'OAuth failed' };
    }
    if (!data?.url) {
      return { error: 'No auth URL returned' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel') return { error: 'Cancelled' };
      return { error: 'Sign in was not completed' };
    }

    const { params, errorCode } = getQueryParams(result.url);

    if (errorCode) {
      return { error: params?.error_description || params?.error || errorCode };
    }

    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (!access_token) {
      return { error: 'No access token in response' };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (sessionError) {
      return { error: sessionError.message || 'Failed to set session' };
    }

    if (sessionData?.user) {
      return { user: sessionData.user };
    }
    return { error: 'No user in session' };
  } catch (e) {
    const msg = e?.message || String(e);
    return { error: msg };
  }
}

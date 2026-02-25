/**
 * Supabase OAuth (Apple, Google) — Expo WebBrowser orqali.
 * Supabase Dashboard → Auth → URL Configuration da Redirect URL qo‘shing:
 *   com.webnum.antique://**
 */
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
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
export async function signInWithOAuthProvider(provider) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: 'Supabase not configured' };
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

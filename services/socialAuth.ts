import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// ── Apple Sign-In ─────────────────────────────────────────────────────────
export async function signInWithApple(): Promise<boolean> {
    try {
        // Generate nonce for security
        const rawNonce = Crypto.getRandomValues(new Uint8Array(32))
            .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

        const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce
        );

        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
        });

        if (!credential.identityToken) {
            throw new Error('No identity token from Apple');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: rawNonce,
        });

        if (error) throw error;
        return !!data.session;
    } catch (err: any) {
        if (err.code === 'ERR_REQUEST_CANCELED') {
            return false; // User cancelled
        }
        logger.authError('Apple Sign-In', err);
        throw err;
    }
}

// ── Check Apple Sign-In Availability ──────────────────────────────────────
export async function isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return await AppleAuthentication.isAvailableAsync();
}

// ── Google Sign-In ────────────────────────────────────────────────────────
// NOTE: Google OAuth requires additional Supabase configuration:
// 1. Go to Supabase Dashboard → Authentication → Providers → Google
// 2. Enable Google provider and add your Google OAuth Client ID & Secret

export async function signInWithGoogle(): Promise<boolean> {
    try {
        const redirectUri = AuthSession.makeRedirectUri({
            scheme: 'birakios',
            path: 'auth/callback',
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;
        if (!data.url) throw new Error('No auth URL returned');

        // Open browser for OAuth flow
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (result.type === 'success' && result.url) {
            // Extract tokens from the URL fragment
            const url = new URL(result.url);
            // Supabase returns tokens in the hash fragment
            const hashParams = new URLSearchParams(url.hash.slice(1));
            const accessToken = hashParams.get('access_token') || url.searchParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || url.searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (sessionError) throw sessionError;
                return true;
            }
        }

        return false;
    } catch (err: any) {
        logger.authError('Google Sign-In', err);
        throw err;
    }
}


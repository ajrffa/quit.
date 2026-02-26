import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// ── Auth Error Messages ────────────────────────────────────────────────
const AUTH_ERROR_MAP: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'You need to confirm your email before logging in',
    'User already registered': 'This email is already in use',
    'Password should be at least 6 characters': 'Password should be at least 6 characters',
    'Email rate limit exceeded': 'Too many attempts, please wait',
    'For security purposes, you can only request this after': 'For security purposes, please wait',
    'Signup requires a valid password': 'A valid password is required',
    'Unable to validate email address: invalid format': 'Invalid email format',
};

function translateAuthError(message: string): string {
    // Tam eşleşme
    if (AUTH_ERROR_MAP[message]) return AUTH_ERROR_MAP[message];
    // Kısmi eşleşme
    for (const [key, value] of Object.entries(AUTH_ERROR_MAP)) {
        if (message.includes(key)) return value;
    }
    // Unknown error — don't expose details
    return 'An error occurred. Please try again.';
}

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;

    // Email Verify
    pendingEmail: string | null;

    initialize: () => Promise<void>;
    setPendingEmail: (email: string) => void;
    clearPendingEmail: () => void;
    signUp: (email: string, password: string) => Promise<boolean>;
    verifyOtp: (email: string, token: string) => Promise<boolean>;
    signIn: (email: string, password: string) => Promise<boolean>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

// Auth listener abonelik referansı — temizlik için
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    session: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    pendingEmail: null,

    setPendingEmail: (email) => set({ pendingEmail: email }),
    clearPendingEmail: () => set({ pendingEmail: null }),

    initialize: async () => {
        try {
            // Önceki aboneliği temizle (çift çağrı koruması)
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }

            // Mevcut oturumu al
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            set({
                session,
                user: session?.user ?? null,
                isInitialized: true,
            });

            // Auth değişikliklerini dinle
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                });
            });
            authSubscription = subscription;
        } catch {
            set({ isInitialized: true });
        }
    },

    signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) throw error;

            // Supabase sends verification email automatically.
            // Session may be null until email is verified.
            set({
                user: data.user,
                session: data.session,
                isLoading: false,
            });

            return true;
        } catch (err) {
            const rawMsg = err instanceof AuthError ? err.message : 'Registration failed';
            const msg = translateAuthError(rawMsg);
            logger.authError('signUp', err);
            set({ error: msg, isLoading: false });
            return false;
        }
    },

    verifyOtp: async (email: string, token: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token,
                type: 'signup',
            });

            if (error) throw error;

            set({
                user: data.user,
                session: data.session,
                isLoading: false,
            });

            return true;
        } catch (err) {
            const rawMsg = err instanceof AuthError ? err.message : 'Verification failed';
            const msg = translateAuthError(rawMsg);
            logger.authError('verifyOtp', err);
            set({ error: msg, isLoading: false });
            return false;
        }
    },

    signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) throw error;

            set({
                user: data.user,
                session: data.session,
                isLoading: false,
            });
            return true;
        } catch (err) {
            const rawMsg = err instanceof AuthError ? err.message : 'Login failed';
            const msg = translateAuthError(rawMsg);
            logger.authError('signIn', err);
            set({ error: msg, isLoading: false });
            return false;
        }
    },

    signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();

        // Auth listener'ı temizle
        if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
        }

        set({
            user: null,
            session: null,
            isLoading: false,
        });

        // Habit store'u sıfırla — paylaşımlı cihaz koruması
        try {
            const { useHabitStore } = require('../stores/useHabitStore');
            useHabitStore.getState().resetApp();
        } catch {
            // Store yüklenemezse sessizce geç
        }
    },

    clearError: () => set({ error: null }),
}));

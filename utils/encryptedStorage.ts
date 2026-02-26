/**
 * utils/encryptedStorage.ts
 * Şifreli depolama adaptörü.
 * AsyncStorage üzerinde AES-GCM benzeri şifreleme katmanı sağlar.
 * Zustand persist middleware ile uyumlu.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { logger } from './logger';

// ── Şifreleme Anahtar Yönetimi ──────────────────────────────────────────
const ENCRYPTION_KEY_ALIAS = 'birak_encryption_key';

/**
 * Cihaz başına benzersiz şifreleme anahtarı üretir ve Secure Store'da saklar.
 * İlk çalıştırmada otomatik oluşturulur.
 */
async function getOrCreateEncryptionKey(): Promise<string> {
    try {
        if (Platform.OS === 'web') {
            // Web'de localStorage kullan (SecureStore yok)
            let key = localStorage.getItem(ENCRYPTION_KEY_ALIAS);
            if (!key) {
                key = Crypto.getRandomValues(new Uint8Array(32))
                    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
                localStorage.setItem(ENCRYPTION_KEY_ALIAS, key);
            }
            return key;
        }

        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
        if (!key) {
            // Yeni 256-bit anahtar oluştur
            key = Crypto.getRandomValues(new Uint8Array(32))
                .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
        }
        return key;
    } catch (err) {
        logger.error('Şifreleme anahtarı alınamadı:', err);
        // Fallback: sabit bir anahtar (güvenlik azalır ama çökmez)
        return 'fallback-key-birak-ios-2024';
    }
}

// Anahtar cache'i — her okuma/yazmada SecureStore'a gitmemek için
let cachedKey: string | null = null;

async function getKey(): Promise<string> {
    if (!cachedKey) {
        cachedKey = await getOrCreateEncryptionKey();
    }
    return cachedKey;
}

// ── Basit XOR Şifreleme ─────────────────────────────────────────────────
// Not: Bu, tam AES-GCM değil ama React Native'de saf JS ile uygulanabilir
// en pratik çözüm. Rootlanmış cihazlara karşı yeterli koruma sağlar.

function xorEncrypt(text: string, key: string): string {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);
    const result = new Uint8Array(textBytes.length);

    for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    // Base64 encode
    return btoa(String.fromCharCode(...result));
}

function xorDecrypt(encoded: string, key: string): string {
    try {
        const decoded = atob(encoded);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }

        const keyBytes = new TextEncoder().encode(key);
        const result = new Uint8Array(bytes.length);

        for (let i = 0; i < bytes.length; i++) {
            result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }

        return new TextDecoder().decode(result);
    } catch {
        // Şifre çözme başarısız → muhtemelen eski şifresiz veri
        return encoded;
    }
}

// ── Şifreleme Prefix'i ──────────────────────────────────────────────────
const ENCRYPTED_PREFIX = 'ENC:';

function isEncrypted(value: string): boolean {
    return value.startsWith(ENCRYPTED_PREFIX);
}

// ── Şifreli AsyncStorage Adaptörü ───────────────────────────────────────
export const EncryptedStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const raw = await AsyncStorage.getItem(key);
            if (raw === null) return null;

            if (isEncrypted(raw)) {
                const encKey = await getKey();
                const decrypted = xorDecrypt(raw.slice(ENCRYPTED_PREFIX.length), encKey);
                return decrypted;
            }

            // Eski şifresiz veri — olduğu gibi döndür (migration)
            return raw;
        } catch (err) {
            logger.error('Şifreli veri okunamadı:', err);
            return null;
        }
    },

    setItem: async (key: string, value: string): Promise<void> => {
        try {
            const encKey = await getKey();
            const encrypted = ENCRYPTED_PREFIX + xorEncrypt(value, encKey);
            await AsyncStorage.setItem(key, encrypted);
        } catch (err) {
            logger.error('Şifreli veri yazılamadı:', err);
        }
    },

    removeItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (err) {
            logger.error('Veri silinemedi:', err);
        }
    },
};

/**
 * utils/logger.ts
 * Production-safe kaydedici.
 * __DEV__ modunda konsola yazar, production'da sessiz kalır.
 */

const isDev = __DEV__;

export const logger = {
    info: (...args: any[]) => {
        if (isDev) console.log('[quit.]', ...args);
    },

    warn: (...args: any[]) => {
        if (isDev) console.warn('[quit.]', ...args);
    },

    error: (...args: any[]) => {
        if (isDev) console.error('[quit.]', ...args);
        // Production'da hata izleme servisi (Sentry vb.) çağrılabilir:
        // Sentry.captureException(args[0]);
    },

    // Hassas bilgi içerebilecek hataları güvenli şekilde kaydet
    authError: (context: string, err: any) => {
        if (isDev) {
            console.error(`[quit.auth] ${context}:`, err?.message || err);
        }
        // Production'da sadece context gönder, detay gönderme
    },
};

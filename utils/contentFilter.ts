/**
 * utils/contentFilter.ts
 * Küfür, hakaret ve taciz içeriği filtresi.
 * Türkçe + İngilizce kapsamlı kelime listesi.
 */

// ── Yasaklı Kelime Listesi (Türkçe + İngilizce) ─────────────────────────
// Kısaltılmış formlar ve leetspeak varyasyonları dahil
const BLOCKED_WORDS_TR = [
    'amk', 'aq', 'amina', 'amına', 'orospu', 'oç', 'oc', 'piç', 'pic',
    'siktir', 'sikeyim', 'sikerim', 'sik', 'yarrak', 'yarak', 'taşak',
    'göt', 'got', 'götün', 'meme', 'kaltak', 'fahişe', 'kahpe',
    'pezevenk', 'döl', 'ibne', 'puşt', 'gavat', 'dangalak', 'gerizekalı',
    'salak', 'aptal', 'mal', 'hıyar', 'şerefsiz', 'namussuz',
    'ananı', 'anani', 'bacını', 'bacini', 'anan', 'bacin',
];

const BLOCKED_WORDS_EN = [
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cock', 'pussy',
    'nigger', 'nigga', 'faggot', 'retard', 'whore', 'cunt',
    'bastard', 'slut', 'motherfucker', 'wtf', 'stfu',
    'kill yourself', 'kys',
];

// ── Leetspeak Dönüşümü ──────────────────────────────────────────────────
const LEET_MAP: Record<string, string> = {
    '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i',
    '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't',
};

function normalizeLeetspeak(text: string): string {
    let normalized = text.toLowerCase();
    for (const [leet, char] of Object.entries(LEET_MAP)) {
        normalized = normalized.split(leet).join(char);
    }
    // Tekrarlanan harfleri kaldır (ör: fuuuck → fuck)
    normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
    // Özel karakterleri kaldır
    normalized = normalized.replace(/[._\-*#~]/g, '');
    return normalized;
}

// ── Tehdit ve Taciz Desenleri ────────────────────────────────────────────
const THREAT_PATTERNS = [
    /öldür/i,
    /öldürürüm/i,
    /seni bulurum/i,
    /intih[a]r/i,
    /kendini öldür/i,
    /kill\s*(your)?self/i,
    /i('ll|\s*will)\s*kill/i,
    /i('ll|\s*will)\s*find\s*you/i,
];

// ── Ana Filtreleme Fonksiyonu ────────────────────────────────────────────
export interface FilterResult {
    isSafe: boolean;
    flaggedWords: string[];
    cleaned: string;
    hasThreat: boolean;
}

export function filterContent(text: string): FilterResult {
    const normalized = normalizeLeetspeak(text);
    const words = normalized.split(/\s+/);
    const flaggedWords: string[] = [];
    let hasThreat = false;

    // Kelime kontrolü
    const allBlocked = [...BLOCKED_WORDS_TR, ...BLOCKED_WORDS_EN];
    for (const word of words) {
        const cleanWord = word.replace(/[^a-zçğıöşüâîû0-9]/g, '');
        for (const blocked of allBlocked) {
            if (cleanWord.includes(blocked)) {
                flaggedWords.push(blocked);
            }
        }
    }

    // Tam metin içinde çok kelimeli kalıplar kontrol et
    for (const blocked of allBlocked) {
        if (blocked.includes(' ') && normalized.includes(blocked)) {
            flaggedWords.push(blocked);
        }
    }

    // Tehdit desenleri kontrolü
    for (const pattern of THREAT_PATTERNS) {
        if (pattern.test(text) || pattern.test(normalized)) {
            hasThreat = true;
            break;
        }
    }

    // Temizlenmiş metin oluştur
    let cleaned = text;
    for (const flagged of flaggedWords) {
        const regex = new RegExp(flagged.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        cleaned = cleaned.replace(regex, '***');
    }

    return {
        isSafe: flaggedWords.length === 0 && !hasThreat,
        flaggedWords: [...new Set(flaggedWords)],
        cleaned,
        hasThreat,
    };
}

// ── Hızlı Güvenlik Kontrolü ─────────────────────────────────────────────
export function isContentSafe(text: string): boolean {
    return filterContent(text).isSafe;
}

// ── Tehdit Mesajı ────────────────────────────────────────────────────────
export function getFilterWarning(result: FilterResult): string {
    if (result.hasThreat) {
        return '⚠️ Bu mesaj tehdit veya zarar içeriyor ve gönderilemez.';
    }
    if (result.flaggedWords.length > 0) {
        return '⚠️ Uygunsuz içerik tespit edildi. Lütfen daha nazik bir dil kullanın.';
    }
    return '';
}

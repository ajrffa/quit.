/**
 * utils/sanitize.ts
 * Input sanitization and validation helpers.
 * All user inputs should be passed through this module.
 */

// ── HTML/Script Etiketlerini Temizle ──────────────────────────────────────
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,   // onclick, onerror etc.
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
];

export function stripHtml(input: string): string {
    let cleaned = input;
    // Remove dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }
    // Strip remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    return cleaned.trim();
}

// ── Metin Doğrulama ──────────────────────────────────────────────────────
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitized: string;
}

export function validatePostContent(content: string): ValidationResult {
    const sanitized = stripHtml(content).trim();

    if (!sanitized) {
        return { isValid: false, error: 'Content cannot be empty', sanitized: '' };
    }
    if (sanitized.length < 3) {
        return { isValid: false, error: 'Content must be at least 3 characters', sanitized };
    }
    if (sanitized.length > 1000) {
        return { isValid: false, error: 'Content cannot exceed 1000 characters', sanitized: sanitized.slice(0, 1000) };
    }
    return { isValid: true, sanitized };
}

export function validateMessageContent(content: string): ValidationResult {
    const sanitized = stripHtml(content).trim();

    if (!sanitized) {
        return { isValid: false, error: 'Message cannot be empty', sanitized: '' };
    }
    if (sanitized.length > 1000) {
        return { isValid: false, error: 'Message cannot exceed 1000 characters', sanitized: sanitized.slice(0, 1000) };
    }
    return { isValid: true, sanitized };
}

export function validateReplyContent(content: string): ValidationResult {
    const sanitized = stripHtml(content).trim();

    if (!sanitized) {
        return { isValid: false, error: 'Reply cannot be empty', sanitized: '' };
    }
    if (sanitized.length > 500) {
        return { isValid: false, error: 'Reply cannot exceed 500 characters', sanitized: sanitized.slice(0, 500) };
    }
    return { isValid: true, sanitized };
}

export function validateUserName(name: string): ValidationResult {
    const sanitized = stripHtml(name).trim();

    if (!sanitized) {
        return { isValid: false, error: 'Name cannot be empty', sanitized: '' };
    }
    if (sanitized.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters', sanitized };
    }
    if (sanitized.length > 50) {
        return { isValid: false, error: 'Name cannot exceed 50 characters', sanitized: sanitized.slice(0, 50) };
    }
    // Only letters, numbers, spaces, dots, hyphens, and apostrophes allowed
    if (!/^[\p{L}\p{N}\s.\-']+$/u.test(sanitized)) {
        return { isValid: false, error: 'Name contains invalid characters', sanitized };
    }
    return { isValid: true, sanitized };
}

export function validateJournalEntry(text: string): ValidationResult {
    const sanitized = stripHtml(text).trim();

    if (!sanitized) {
        return { isValid: false, error: 'Journal entry cannot be empty', sanitized: '' };
    }
    if (sanitized.length > 5000) {
        return { isValid: false, error: 'Journal entry cannot exceed 5000 characters', sanitized: sanitized.slice(0, 5000) };
    }
    return { isValid: true, sanitized };
}

// ── E-posta Doğrulama ────────────────────────────────────────────────────
export function validateEmail(email: string): ValidationResult {
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitized) {
        return { isValid: false, error: 'Email address cannot be empty', sanitized: '' };
    }
    if (!emailRegex.test(sanitized)) {
        return { isValid: false, error: 'Please enter a valid email address', sanitized };
    }
    if (sanitized.length > 254) {
        return { isValid: false, error: 'Email address is too long', sanitized };
    }
    return { isValid: true, sanitized };
}

// ── Password Rules ──────────────────────────────────────────────────────
export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'fair' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('At least 1 number');

    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isLong = password.length >= 12;

    let strength: PasswordValidation['strength'] = 'weak';
    if (errors.length === 0) strength = 'fair';
    if (errors.length === 0 && (hasSpecial || isLong)) strength = 'strong';

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
}

// ── Rate Limiter ─────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return true; // Allowed
    }

    if (entry.count >= maxRequests) {
        return false; // Rate limit exceeded
    }

    entry.count++;
    return true;
}

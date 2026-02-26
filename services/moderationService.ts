/**
 * services/moderationService.ts
 * Engelleme ve şikayet sistemi.
 * Mock data + Supabase desteği.
 */

import { supabase } from './supabase';
import { logger } from '@/utils/logger';

// ── Yapılandırma ──────────────────────────────────────────────────────────
const USE_SUPABASE = true;

// ── Türler ────────────────────────────────────────────────────────────────
export type ReportReason = 'harassment' | 'hate_speech' | 'threat' | 'spam' | 'inappropriate' | 'other';

export interface ContentReport {
    id: string;
    reporterId: string;
    contentId: string;
    contentType: 'post' | 'reply' | 'message';
    reason: ReportReason;
    description?: string;
    createdAt: string;
}

// ── Mock Veri ─────────────────────────────────────────────────────────────
const blockedUsers = new Set<string>(); // format: "userId:blockedId"

// ── Kullanıcı Engelleme ───────────────────────────────────────────────────
export async function blockUser(userId: string, blockedId: string): Promise<boolean> {
    if (!USE_SUPABASE) {
        blockedUsers.add(`${userId}:${blockedId}`);
        return true;
    }

    const { error } = await supabase
        .from('blocked_users')
        .insert({ user_id: userId, blocked_user_id: blockedId });

    if (error) {
        logger.warn('[Moderasyon] Engelleme hatası:', error.message);
        return false;
    }
    return true;
}

// ── Engel Kaldırma ────────────────────────────────────────────────────────
export async function unblockUser(userId: string, blockedId: string): Promise<boolean> {
    if (!USE_SUPABASE) {
        blockedUsers.delete(`${userId}:${blockedId}`);
        return true;
    }

    const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', userId)
        .eq('blocked_user_id', blockedId);

    if (error) {
        logger.warn('[Moderasyon] Engel kaldırma hatası:', error.message);
        return false;
    }
    return true;
}

// ── Engel Kontrolü ────────────────────────────────────────────────────────
export async function isBlocked(userId: string, targetId: string): Promise<boolean> {
    if (!USE_SUPABASE) {
        return blockedUsers.has(`${userId}:${targetId}`) || blockedUsers.has(`${targetId}:${userId}`);
    }

    const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(user_id.eq.${userId},blocked_user_id.eq.${targetId}),and(user_id.eq.${targetId},blocked_user_id.eq.${userId})`)
        .limit(1);

    return (data?.length ?? 0) > 0;
}

// ── Engellenen Kullanıcı Listesi ──────────────────────────────────────────
export async function getBlockedUserIds(userId: string): Promise<string[]> {
    if (!USE_SUPABASE) {
        const ids: string[] = [];
        blockedUsers.forEach(pair => {
            const [a, b] = pair.split(':');
            if (a === userId) ids.push(b);
            if (b === userId) ids.push(a);
        });
        return ids;
    }

    const { data } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId);

    return (data || []).map(r => r.blocked_user_id);
}

// ── İçerik Şikayeti ──────────────────────────────────────────────────────
export async function reportContent(
    reporterId: string,
    contentId: string,
    contentType: ContentReport['contentType'],
    reason: ReportReason,
    description?: string
): Promise<boolean> {
    if (!USE_SUPABASE) {
        logger.info('[Moderasyon] Şikayet kaydedildi:', { contentId, contentType, reason });
        return true;
    }

    const { error } = await supabase
        .from('reported_content')
        .insert({
            reporter_id: reporterId,
            content_id: contentId,
            content_type: contentType,
            reason,
            description: description || null,
        });

    if (error) {
        logger.warn('[Moderasyon] Şikayet hatası:', error.message);
        return false;
    }
    return true;
}

// ── Şikayet Nedeni Etiketleri ─────────────────────────────────────────────
export const REPORT_REASONS: Record<ReportReason, string> = {
    harassment: 'Taciz / Zorbalık',
    hate_speech: 'Nefret Söylemi',
    threat: 'Tehdit',
    spam: 'Spam / Reklam',
    inappropriate: 'Uygunsuz İçerik',
    other: 'Diğer',
};

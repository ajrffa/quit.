import { HabitType } from '../stores/useHabitStore';

// ── Badge System ───────────────────────────────────────────────────────────
export type BadgeLevel = 'rookie' | 'resister' | 'warrior' | 'mentor' | 'master';

export const BADGE_CONFIG: Record<BadgeLevel, { label: string; emoji: string; minStreak: number; color: string }> = {
    rookie: { label: 'Yeni Savaşçı', emoji: '🔒', minStreak: 0, color: '#666666' },
    resister: { label: 'Direnen', emoji: '🛡️', minStreak: 7, color: '#8B9DAF' },
    warrior: { label: 'Savaşçı', emoji: '⚔️', minStreak: 30, color: '#C0C0C0' },
    mentor: { label: 'Akıl Hocası', emoji: '👑', minStreak: 60, color: '#d4af37' },
    master: { label: 'Üstat', emoji: '🏆', minStreak: 90, color: '#FFD700' },
};

export function getBadgeForStreak(streak: number): BadgeLevel {
    if (streak >= 90) return 'master';
    if (streak >= 60) return 'mentor';
    if (streak >= 30) return 'warrior';
    if (streak >= 7) return 'resister';
    return 'rookie';
}

export function canComment(streak: number): boolean {
    return streak >= 7;
}

export function canPost(streak: number): boolean {
    return streak >= 30;
}

export function canPostWisdom(streak: number): boolean {
    return streak >= 60;
}

// ── Post Types ─────────────────────────────────────────────────────────────
export type PostType = 'story' | 'tip' | 'wisdom' | 'milestone';

export interface CommunityPost {
    id: string;
    userId: string;
    userName: string;
    habitType: HabitType;
    streakAtPost: number;
    badgeLevel: BadgeLevel;
    type: PostType;
    content: string;
    likes: number;
    hasLiked?: boolean;
    repliesCount: number;
    createdAt: string;
}

export interface PostReply {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    streakAtReply: number;
    badgeLevel: BadgeLevel;
    content: string;
    createdAt: string;
}

// ── Channel Config ─────────────────────────────────────────────────────────
export const HABIT_CHANNELS: { type: HabitType; label: string; emoji: string }[] = [
    { type: 'smoking', label: 'Smoking Survivors', emoji: '🚬' },
    { type: 'alcohol', label: 'Sober Squad', emoji: '🍺' },
    { type: 'social_media', label: 'Digital Detox', emoji: '📱' },
    { type: 'sugar', label: 'Sugar Free', emoji: '🍬' },
    { type: 'pornography', label: 'Mind Reclaim', emoji: '🧠' },
    { type: 'gambling', label: 'Odds Breakers', emoji: '🎰' },
    { type: 'junk_food', label: 'Clean Eaters', emoji: '🍔' },
    { type: 'nail_biting', label: 'Steady Hands', emoji: '✋' },
    { type: 'other', label: 'General', emoji: '💪' },
];

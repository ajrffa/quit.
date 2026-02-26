import { supabase } from './supabase';
import { CommunityPost, PostReply, getBadgeForStreak, BadgeLevel } from '@/types/community';
import { HabitType } from '@/stores/useHabitStore';
import { validatePostContent, validateReplyContent, checkRateLimit } from '@/utils/sanitize';
import { filterContent, getFilterWarning } from '@/utils/contentFilter';
import { getBlockedUserIds } from './moderationService';
import { logger } from '@/utils/logger';

// ── Configuration ──────────────────────────────────────────────────────────
// Set to true once Supabase tables are created via migration.sql
const USE_SUPABASE = true;

// ── Mock Data (fallback until Supabase is configured) ─────────────────────
const MOCK_POSTS: CommunityPost[] = [
    {
        id: '1', userId: 'mock-1', userName: 'Mark S.', habitType: 'smoking',
        streakAtPost: 64, badgeLevel: 'mentor', type: 'wisdom',
        content: 'Hit day 60 today. The urges are still there but they are whispers now instead of screams. The secret? Replace the habit, don\'t just fight it. Every time I wanted a cigarette, I did 10 pushups. Sound stupid? I\'m now both smoke-free AND jacked. 💪',
        likes: 47, hasLiked: false, repliesCount: 12,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
        id: '2', userId: 'mock-2', userName: 'Ayşe K.', habitType: 'social_media',
        streakAtPost: 33, badgeLevel: 'warrior', type: 'story',
        content: 'Bir ay önce Instagram\'ı sildim. İlk hafta cehennemdi. Şimdi kitap okuyorum, yürüyüş yapıyorum, gerçek insanlarla konuşuyorum. Hayatım geri geldi.',
        likes: 31, hasLiked: false, repliesCount: 8,
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
        id: '3', userId: 'mock-3', userName: 'James R.', habitType: 'alcohol',
        streakAtPost: 91, badgeLevel: 'master', type: 'wisdom',
        content: '90 days sober. Three months ago I couldn\'t go a single evening without a drink. What changed? I stopped saying "I can\'t drink" and started saying "I don\'t drink." It\'s not a restriction. It\'s an identity.',
        likes: 89, hasLiked: false, repliesCount: 24,
        createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    },
    {
        id: '4', userId: 'mock-4', userName: 'Elif T.', habitType: 'sugar',
        streakAtPost: 14, badgeLevel: 'resister', type: 'tip',
        content: 'Şekerli yiyecek isteği geldiğinde bir bardak su + bir avuç badem yiyin. 5 dakika bekleyin. İstek geçiyor. 🌰',
        likes: 18, hasLiked: false, repliesCount: 3,
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
    {
        id: '5', userId: 'mock-5', userName: 'Deniz A.', habitType: 'smoking',
        streakAtPost: 8, badgeLevel: 'resister', type: 'story',
        content: 'Bir hafta oldu. Küçük bir adım ama benim için devasa. Herkese teşekkürler.',
        likes: 22, hasLiked: false, repliesCount: 6,
        createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    },
    {
        id: '6', userId: 'mock-6', userName: 'Sarah M.', habitType: 'gambling',
        streakAtPost: 45, badgeLevel: 'warrior', type: 'milestone',
        content: '45 days without placing a bet. I\'ve saved $3,200 in this time. That\'s not willpower money—that\'s freedom money.',
        likes: 56, hasLiked: false, repliesCount: 15,
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
        id: '7', userId: 'mock-7', userName: 'Can B.', habitType: 'pornography',
        streakAtPost: 72, badgeLevel: 'mentor', type: 'wisdom',
        content: 'NoFap 72. gün. En büyük keşfim: bu bir cinsellik meselesi değil, bir dopamin meselesi. Beyninizi kolay ödüllerden uzaklaştırdığınızda, zor ödüllerin peşinden koşmaya başlıyorsunuz.',
        likes: 63, hasLiked: false, repliesCount: 19,
        createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    },
];

// ── Fetch Posts ────────────────────────────────────────────────────────────
export async function fetchPosts(
    habitType: HabitType | 'all',
    page: number = 0
): Promise<CommunityPost[]> {
    if (!USE_SUPABASE) {
        await new Promise(r => setTimeout(r, 300));
        return habitType === 'all' ? MOCK_POSTS : MOCK_POSTS.filter(p => p.habitType === habitType);
    }

    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * 20, (page + 1) * 20 - 1);

    if (habitType !== 'all') {
        query = query.eq('habit_type', habitType);
    }

    const { data: posts, error } = await query;
    if (error || !posts) return [];

    // Check which posts the current user has liked
    let likedPostIds: Set<string> = new Set();
    if (user) {
        const { data: likes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id);
        likedPostIds = new Set((likes || []).map(l => l.post_id));
    }

    return posts.map(p => ({
        id: p.id,
        userId: p.user_id,
        userName: p.user_name,
        habitType: p.habit_type as HabitType,
        streakAtPost: p.streak_at_post,
        badgeLevel: p.badge_level as BadgeLevel,
        type: p.post_type as CommunityPost['type'],
        content: p.content,
        likes: p.likes_count,
        hasLiked: likedPostIds.has(p.id),
        repliesCount: p.replies_count,
        createdAt: p.created_at,
    }));
}

const _postLocks = new Set<string>();

// ── Create Post ───────────────────────────────────────────────────────────
export async function createPost(post: {
    userId: string;
    userName: string;
    habitType: HabitType;
    streak: number;
    type: CommunityPost['type'];
    content: string;
}): Promise<CommunityPost | null> {
    if (_postLocks.has(post.userId)) return null;
    _postLocks.add(post.userId);

    try {
        const badge = getBadgeForStreak(post.streak);

        // Girdi doğrulama
        const validation = validatePostContent(post.content);
        if (!validation.isValid) {
            logger.warn('[Community] Post doğrulama hatası:', validation.error);
            return null;
        }

        // Küfür/hakaret filtresi
        const filterResult = filterContent(validation.sanitized);
        if (!filterResult.isSafe) {
            logger.warn('[Community] İçerik filtresi:', filterResult.flaggedWords);
            return null;
        }

        // Rate limit kontrolü
        if (!checkRateLimit(`post:${post.userId}`, 5, 60000)) {
            logger.warn('[Community] Rate limit aşıldı:', post.userId);
            return null;
        }

        if (!USE_SUPABASE) {
            await new Promise(r => setTimeout(r, 500));
            const newPost: CommunityPost = {
                id: Date.now().toString(),
                userId: post.userId, userName: post.userName,
                habitType: post.habitType, streakAtPost: post.streak,
                badgeLevel: badge, type: post.type, content: validation.sanitized,
                likes: 0, hasLiked: false, repliesCount: 0,
                createdAt: new Date().toISOString(),
            };
            MOCK_POSTS.unshift(newPost);
            return newPost;
        }

        const { data, error } = await supabase
            .from('posts')
            .insert({
                user_id: post.userId,
                user_name: post.userName,
                habit_type: post.habitType,
                streak_at_post: post.streak,
                badge_level: badge,
                post_type: post.type,
                content: post.content,
            })
            .select()
            .single();

        if (error || !data) return null;

        return {
            id: data.id, userId: data.user_id, userName: data.user_name,
            habitType: data.habit_type as HabitType, streakAtPost: data.streak_at_post,
            badgeLevel: data.badge_level as BadgeLevel, type: data.post_type as CommunityPost['type'],
            content: data.content, likes: 0, hasLiked: false, repliesCount: 0,
            createdAt: data.created_at,
        };
    } finally {
        _postLocks.delete(post.userId);
    }
}

// ── Toggle Like ───────────────────────────────────────────────────────────
export async function toggleLike(postId: string, userId: string): Promise<boolean> {
    if (!USE_SUPABASE) {
        await new Promise(r => setTimeout(r, 200));
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (post) {
            post.hasLiked = !post.hasLiked;
            post.likes += post.hasLiked ? 1 : -1;
            return post.hasLiked;
        }
        return false;
    }

    // Check if already liked
    const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

    if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
        return false;
    } else {
        await supabase.from('likes').insert({ user_id: userId, post_id: postId });
        return true;
    }
}

// ── Fetch Replies ─────────────────────────────────────────────────────────
export async function fetchReplies(postId: string): Promise<PostReply[]> {
    if (!USE_SUPABASE) return [];

    const { data, error } = await supabase
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map(r => ({
        id: r.id,
        postId: r.post_id,
        userId: r.user_id,
        userName: r.user_name,
        streakAtReply: r.streak_at_reply,
        badgeLevel: r.badge_level as BadgeLevel,
        content: r.content,
        createdAt: r.created_at,
    }));
}

// ── Create Reply ──────────────────────────────────────────────────────────
export async function createReply(reply: {
    postId: string;
    userId: string;
    userName: string;
    streak: number;
    content: string;
}): Promise<PostReply | null> {
    if (!USE_SUPABASE) return null;

    // Girdi doğrulama
    const validation = validateReplyContent(reply.content);
    if (!validation.isValid) {
        logger.warn('[Community] Reply doğrulama hatası:', validation.error);
        return null;
    }

    // Rate limit kontrolü
    if (!checkRateLimit(`reply:${reply.userId}`, 15, 60000)) {
        logger.warn('[Community] Reply rate limit aşıldı:', reply.userId);
        return null;
    }

    const badge = getBadgeForStreak(reply.streak);

    const { data, error } = await supabase
        .from('replies')
        .insert({
            post_id: reply.postId,
            user_id: reply.userId,
            user_name: reply.userName,
            streak_at_reply: reply.streak,
            badge_level: badge,
            content: validation.sanitized,
        })
        .select()
        .single();

    if (error || !data) return null;

    return {
        id: data.id, postId: data.post_id, userId: data.user_id,
        userName: data.user_name, streakAtReply: data.streak_at_reply,
        badgeLevel: data.badge_level as BadgeLevel, content: data.content,
        createdAt: data.created_at,
    };
}

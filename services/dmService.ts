import { supabase } from './supabase';
import { validateMessageContent, checkRateLimit } from '../utils/sanitize';
import { filterContent, getFilterWarning } from '../utils/contentFilter';
import { isBlocked } from './moderationService';
import { logger } from '../utils/logger';

// ── Types ──────────────────────────────────────────────────────────────────
export interface Conversation {
    id: string;
    otherUserId: string;
    otherUserName: string;
    otherUserStreak: number;
    otherUserBadge: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    isMine: boolean;
}

// ── Configuration ──────────────────────────────────────────────────────────
const USE_SUPABASE = true;

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'conv-1',
        otherUserId: 'mock-3',
        otherUserName: 'James R.',
        otherUserStreak: 91,
        otherUserBadge: 'master',
        lastMessage: 'Stay strong. I\'ve been there. It gets better.',
        lastMessageAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        unreadCount: 1,
    },
    {
        id: 'conv-2',
        otherUserId: 'mock-7',
        otherUserName: 'Can B.',
        otherUserStreak: 72,
        otherUserBadge: 'mentor',
        lastMessage: 'Her gün biraz daha güçleniyorsun. Devam et.',
        lastMessageAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        unreadCount: 0,
    },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    'conv-1': [
        { id: 'm1', conversationId: 'conv-1', senderId: 'mock-3', content: 'Hey, I saw your post. How are you doing?', isRead: true, createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), isMine: false },
        { id: 'm2', conversationId: 'conv-1', senderId: 'me', content: 'Struggling but holding on. Day 5 now.', isRead: true, createdAt: new Date(Date.now() - 2.5 * 3600000).toISOString(), isMine: true },
        { id: 'm3', conversationId: 'conv-1', senderId: 'mock-3', content: 'Stay strong. I\'ve been there. Day 5 was hard for me too but day 10 feels like a different world.', isRead: false, createdAt: new Date(Date.now() - 1 * 3600000).toISOString(), isMine: false },
    ],
    'conv-2': [
        { id: 'm4', conversationId: 'conv-2', senderId: 'mock-7', content: 'Merhaba, community\'deki postunu gördüm. Nasıl gidiyor?', isRead: true, createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), isMine: false },
        { id: 'm5', conversationId: 'conv-2', senderId: 'me', content: 'Zor ama pes etmiyorum.', isRead: true, createdAt: new Date(Date.now() - 7 * 3600000).toISOString(), isMine: true },
        { id: 'm6', conversationId: 'conv-2', senderId: 'mock-7', content: 'Her gün biraz daha güçleniyorsun. Devam et.', isRead: true, createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), isMine: false },
    ],
};

// ── Fetch Conversations ───────────────────────────────────────────────────
export async function fetchConversations(userId: string): Promise<Conversation[]> {
    if (!USE_SUPABASE) {
        await new Promise(r => setTimeout(r, 300));
        return MOCK_CONVERSATIONS;
    }

    const { data, error } = await supabase
        .from('conversations')
        .select(`
            id,
            participant_1,
            participant_2,
            last_message_at,
            messages!inner (content, sender_id, is_read, created_at)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false });

    if (error || !data) return [];

    // Get other participant profiles
    const convs: Conversation[] = [];
    for (const conv of data) {
        const otherUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_name, current_streak')
            .eq('id', otherUserId)
            .single();

        const messages = (conv.messages as any[]) || [];
        const lastMsg = messages[messages.length - 1];
        const unread = messages.filter((m: any) => m.sender_id !== userId && !m.is_read).length;

        convs.push({
            id: conv.id,
            otherUserId,
            otherUserName: profile?.user_name || 'Unknown',
            otherUserStreak: profile?.current_streak || 0,
            otherUserBadge: 'resister',
            lastMessage: lastMsg?.content || '',
            lastMessageAt: conv.last_message_at,
            unreadCount: unread,
        });
    }

    return convs;
}

// ── Fetch Messages ────────────────────────────────────────────────────────
export async function fetchMessages(conversationId: string, userId: string): Promise<Message[]> {
    if (!USE_SUPABASE) {
        await new Promise(r => setTimeout(r, 200));
        return MOCK_MESSAGES[conversationId] || [];
    }

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at,
        isMine: m.sender_id === userId,
    }));
}

const _messageLocks = new Set<string>();

// ── Send Message ──────────────────────────────────────────────────────────
export async function sendMessage(
    conversationId: string,
    senderId: string,
    content: string
): Promise<Message | null> {
    const lockKey = `${conversationId}-${senderId}`;
    if (_messageLocks.has(lockKey)) return null;
    _messageLocks.add(lockKey);

    try {
        // Girdi doğrulama
        const validation = validateMessageContent(content);
        if (!validation.isValid) {
            logger.warn('[DM] Mesaj doğrulama hatası:', validation.error);
            return null;
        }

        // Küfür/hakaret filtresi
        const filterResult = filterContent(validation.sanitized);
        if (!filterResult.isSafe) {
            logger.warn('[DM] Mesaj filtresi:', filterResult.flaggedWords);
            return null;
        }

        // Rate limit kontrolü (dakikada 20 mesaj)
        if (!checkRateLimit(`dm:${senderId}`, 20, 60000)) {
            logger.warn('[DM] Rate limit aşıldı:', senderId);
            return null;
        }

        if (!USE_SUPABASE) {
            await new Promise(r => setTimeout(r, 300));
            const msg: Message = {
                id: Date.now().toString(),
                conversationId,
                senderId,
                content: validation.sanitized,
                isRead: false,
                createdAt: new Date().toISOString(),
                isMine: true,
            };
            const convMsgs = MOCK_MESSAGES[conversationId] || [];
            convMsgs.push(msg);
            MOCK_MESSAGES[conversationId] = convMsgs;
            return msg;
        }

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
            })
            .select()
            .single();

        if (error || !data) return null;

        // Update conversation last_message_at
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

        return {
            id: data.id,
            conversationId: data.conversation_id,
            senderId: data.sender_id,
            content: data.content,
            isRead: data.is_read,
            createdAt: data.created_at,
            isMine: true,
        };
    } finally {
        _messageLocks.delete(lockKey);
    }
}

// ── Start Conversation ────────────────────────────────────────────────────
export async function startConversation(
    userId: string,
    otherUserId: string
): Promise<string | null> {
    if (!USE_SUPABASE) {
        const newConvId = `conv-${Date.now()}`;
        MOCK_CONVERSATIONS.unshift({
            id: newConvId,
            otherUserId,
            otherUserName: 'New Contact',
            otherUserStreak: 0,
            otherUserBadge: 'rookie',
            lastMessage: '',
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
        });
        MOCK_MESSAGES[newConvId] = [];
        return newConvId;
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`)
        .single();

    if (existing) return existing.id;

    // Create new conversation
    const { data, error } = await supabase
        .from('conversations')
        .insert({
            participant_1: userId,
            participant_2: otherUserId,
        })
        .select('id')
        .single();

    if (error || !data) return null;
    return data.id;
}

// ── Mark Messages as Read ─────────────────────────────────────────────────
export async function markAsRead(conversationId: string, userId: string) {
    if (!USE_SUPABASE) {
        const msgs = MOCK_MESSAGES[conversationId] || [];
        msgs.forEach(m => { if (!m.isMine) m.isRead = true; });
        return;
    }

    await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
}

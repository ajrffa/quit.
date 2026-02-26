import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable, RefreshControl,
    TextInput, Modal, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import { useHabitStore, HabitType } from '@/stores/useHabitStore';
import { useAuthStore } from '@/stores/useAuthStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import {
    CommunityPost, BADGE_CONFIG, HABIT_CHANNELS, getBadgeForStreak,
    canComment, canPost, canPostWisdom, BadgeLevel,
} from '@/types/community';
import { fetchPosts, createPost, toggleLike } from '@/services/communityService';
import ReportModal from '@/components/ReportModal';


const FF = FontFamily.sans;

// ── Badge Pill Component ───────────────────────────────────────────────────
function BadgePill({ level, streak }: { level: BadgeLevel; streak: number }) {
    const config = BADGE_CONFIG[level];
    return (
        <View style={[s.badgePill, { borderColor: config.color + '60' }]}>
            <Text style={s.badgeEmoji}>{config.emoji}</Text>
            <Text style={[s.badgeText, { color: config.color }]}>{streak}d</Text>
        </View>
    );
}

// ── Post Card Component ────────────────────────────────────────────────────
function PostCard({ post, onLike, onReport }: { post: CommunityPost; onLike: (id: string) => void; onReport: (post: CommunityPost) => void }) {
    const config = BADGE_CONFIG[post.badgeLevel];
    const isWisdom = post.type === 'wisdom';
    const isMilestone = post.type === 'milestone';

    const timeAgo = getTimeAgo(post.createdAt);

    return (
        <Animated.View entering={FadeInDown.duration(600)} style={{ marginBottom: Spacing.md }}>
            <View style={[
                s.postCard,
                isWisdom && s.postCardWisdom,
                isMilestone && s.postCardMilestone,
            ]}>
                {/* Wisdom/Milestone Label */}
                {(isWisdom || isMilestone) && (
                    <View style={[s.postTypeLabel, isWisdom ? s.wisdomLabel : s.milestoneLabel]}>
                        <Text style={s.postTypeLabelText}>
                            {isWisdom ? '👑 WISDOM' : '🎯 MILESTONE'}
                        </Text>
                    </View>
                )}

                {/* Header */}
                <View style={s.postHeader}>
                    <View style={[s.avatar, { borderColor: config.color }]}>
                        <Text style={[s.avatarText, { color: config.color }]}>
                            {post.userName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={s.postHeaderInfo}>
                        <View style={s.nameRow}>
                            <Text style={s.postName}>{post.userName}</Text>
                            <BadgePill level={post.badgeLevel} streak={post.streakAtPost} />
                        </View>
                        <Text style={s.postTime}>{timeAgo}</Text>
                    </View>
                    <Pressable
                        onPress={() => onReport(post)}
                        style={({ pressed }) => [{ padding: 8, marginLeft: 'auto' }, pressed && { opacity: 0.5 }]}
                        hitSlop={10}
                    >
                        <FontAwesome name="ellipsis-h" size={16} color={Colors.textDim} />
                    </Pressable>
                </View>

                {/* Body */}
                <Text style={s.postBody}>{post.content}</Text>

                {/* Footer */}
                <View style={s.postFooter}>
                    <Pressable
                        style={s.footerBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onLike(post.id);
                        }}
                    >
                        <FontAwesome
                            name={post.hasLiked ? 'heart' : 'heart-o'}
                            size={16}
                            color={post.hasLiked ? Colors.error : Colors.textDim}
                        />
                        <Text style={[s.footerCount, post.hasLiked && { color: Colors.error }]}>
                            {post.likes}
                        </Text>
                    </Pressable>
                    <View style={s.footerBtn}>
                        <FontAwesome name="comment-o" size={16} color={Colors.textDim} />
                        <Text style={s.footerCount}>{post.repliesCount}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ── Main Community Screen ──────────────────────────────────────────────────
export default function CommunityScreen() {
    const router = useRouter();
    const { activeHabit, currentStreak, userName } = useHabitStore();
    const { user } = useAuthStore();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<HabitType | 'all'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [showComposer, setShowComposer] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // Açılır Menü (Şikayet/Engelle) Durumu
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState<CommunityPost | null>(null);

    const userBadge = getBadgeForStreak(currentStreak);
    const userCanComment = canComment(currentStreak);
    const userCanPost = canPost(currentStreak);
    const userCanPostWisdom = canPostWisdom(currentStreak);

    // All hooks MUST come before any early returns (React rules-of-hooks)
    // Set default channel to user's habit
    useEffect(() => {
        if (activeHabit) {
            setSelectedChannel(activeHabit.type);
        }
    }, [activeHabit?.type]);

    const loadPosts = useCallback(async () => {
        const data = await fetchPosts(selectedChannel);
        setPosts(data);
    }, [selectedChannel]);

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [loadPosts, user]);

    // MİSAFİR EKRANI (Giriş yapmamış kullanıcıysa)
    if (!user) {
        return (
            <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]} edges={['top']}>
                <FontAwesome name="lock" size={64} color={Colors.gold} style={{ marginBottom: 24 }} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.text, fontFamily: FF, marginBottom: 8, textAlign: 'center' }}>
                    Topluluğa Katılın
                </Text>
                <Text style={{ fontSize: 16, color: Colors.textMuted, fontFamily: FF, textAlign: 'center', lineHeight: 22 }}>
                    Diğer kullanıcıların hikayelerini okumak ve paylaşım yapmak için hesap oluşturmanız gerekmektedir.
                </Text>
                <Pressable
                    style={({ pressed }) => [{
                        backgroundColor: Colors.gold, marginTop: 40, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 100
                    }, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/auth/login')}
                >
                    <Text style={{ color: Colors.background, fontSize: 16, fontWeight: 'bold', fontFamily: FF }}>
                        Giriş Yap / Kayıt Ol
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPosts();
        setRefreshing(false);
    };

    const handleLike = async (postId: string) => {
        await toggleLike(postId, user?.id || '');
        setPosts(prev => prev.map(p =>
            p.id === postId
                ? { ...p, hasLiked: !p.hasLiked, likes: p.likes + (p.hasLiked ? -1 : 1) }
                : p
        ));
    };

    const handlePost = async () => {
        if (!composerText.trim() || !activeHabit) return;
        setIsPosting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const postType = userCanPostWisdom ? 'wisdom' : userCanPost ? 'story' : 'tip';

        const newPost = await createPost({
            userId: user?.id || 'local-user',
            userName: userName || 'Anonymous',
            habitType: activeHabit.type,
            streak: currentStreak,
            type: postType,
            content: composerText.trim(),
        });

        if (newPost) {
            setPosts(prev => [newPost, ...prev]);
        }

        setComposerText('');
        setShowComposer(false);
        setIsPosting(false);
    };

    // ── Streak gate message ────────────────────────────────────────────────
    const getStreakGateMessage = () => {
        if (currentStreak < 7) return `🔒 ${7 - currentStreak} gün daha streak yaparak yorum hakkı kazan`;
        if (currentStreak < 30) return `🛡️ ${30 - currentStreak} gün daha ile hikaye paylaşabilirsin`;
        if (currentStreak < 60) return `⚔️ ${60 - currentStreak} gün daha ile Wisdom Post paylaşabilirsin`;
        return `👑 Akıl Hocası olarak Wisdom Post paylaşabilirsin`;
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(400)} style={s.headerSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Community</Text>
                        <Text style={s.headerSubtitle}>You are not alone in this journey.</Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/dm' as any);
                        }}
                        style={({ pressed }) => [s.dmBtn, pressed && { opacity: 0.6 }]}
                    >
                        <FontAwesome name="envelope-o" size={20} color={Colors.gold} />
                    </Pressable>
                </View>
            </Animated.View>

            {/* Channel Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.channelScroll}
                style={s.channelBar}
            >
                <Pressable
                    style={[s.channelPill, selectedChannel === 'all' && s.channelPillActive]}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedChannel('all');
                    }}
                >
                    <Text style={[s.channelPillText, selectedChannel === 'all' && s.channelPillTextActive]}>
                        🌐 All
                    </Text>
                </Pressable>
                {HABIT_CHANNELS.map(ch => (
                    <Pressable
                        key={ch.type}
                        style={[
                            s.channelPill,
                            selectedChannel === ch.type && s.channelPillActive,
                            activeHabit?.type === ch.type && selectedChannel !== ch.type && s.channelPillMine,
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedChannel(ch.type);
                        }}
                    >
                        <Text style={[
                            s.channelPillText,
                            selectedChannel === ch.type && s.channelPillTextActive,
                        ]}>
                            {ch.emoji} {ch.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Streak Gate Info — only shown for streak < 90 */}
            {currentStreak < 90 && (
                <Animated.View entering={FadeInDown.delay(200).duration(600)} style={s.streakGate}>
                    <Text style={s.streakGateText}>{getStreakGateMessage()}</Text>
                    <View style={s.streakProgressBg}>
                        <View style={[s.streakProgressFill, { width: `${Math.min((currentStreak / 60) * 100, 100)}%` }]} />
                    </View>
                </Animated.View>
            )}

            {/* Feed */}
            <ScrollView
                contentContainerStyle={s.feedScroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.gold}
                        colors={[Colors.gold]}
                    />
                }
            >
                {posts.length === 0 ? (
                    <View style={s.emptyState}>
                        <FontAwesome name="comments-o" size={48} color={Colors.textDim} />
                        <Text style={s.emptyText}>No posts yet in this channel</Text>
                        <Text style={s.emptySubtext}>Be the first to share your journey</Text>
                    </View>
                ) : (
                    posts.map((post, index) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onLike={handleLike}
                            onReport={(p) => {
                                setReportTarget(p);
                                setReportModalVisible(true);
                            }}
                        />
                    ))
                )}
            </ScrollView>

            {/* Compose FAB */}
            {userCanComment && (
                <Animated.View entering={FadeInUp.delay(400).duration(600)} style={s.fabWrap}>
                    <Pressable
                        style={({ pressed }) => [s.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowComposer(true);
                        }}
                    >
                        <FontAwesome name="pencil" size={22} color={Colors.background} />
                    </Pressable>
                </Animated.View>
            )}

            {/* Composer Modal */}
            <Modal
                visible={showComposer}
                animationType="slide"
                transparent
                onRequestClose={() => setShowComposer(false)}
            >
                <KeyboardAvoidingView
                    style={s.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <Pressable style={s.modalBackdrop} onPress={() => setShowComposer(false)} />
                    <View style={s.composerSheet}>
                        <View style={s.composerHandle} />
                        <View style={s.composerHeader}>
                            <Pressable onPress={() => setShowComposer(false)}>
                                <Text style={s.composerCancel}>Cancel</Text>
                            </Pressable>
                            <Text style={s.composerTitle}>Share Your Journey</Text>
                            <Pressable
                                onPress={handlePost}
                                disabled={!composerText.trim() || isPosting}
                            >
                                <Text style={[s.composerPost, (!composerText.trim() || isPosting) && { opacity: 0.3 }]}>
                                    Post
                                </Text>
                            </Pressable>
                        </View>

                        {/* Badge Preview */}
                        <View style={s.composerBadgeRow}>
                            <BadgePill level={userBadge} streak={currentStreak} />
                            <Text style={s.composerBadgeLabel}>
                                {userCanPostWisdom ? 'Wisdom Post' : userCanPost ? 'Story' : 'Comment'}
                            </Text>
                        </View>

                        <TextInput
                            style={s.composerInput}
                            placeholder={
                                userCanPostWisdom
                                    ? 'Share your wisdom with the community...'
                                    : userCanPost
                                        ? 'Share your story...'
                                        : 'Write a comment...'
                            }
                            placeholderTextColor={Colors.textDim}
                            value={composerText}
                            onChangeText={setComposerText}
                            multiline
                            autoFocus
                            maxLength={1000}
                        />

                        <Text style={s.composerCharCount}>
                            {composerText.length}/1000
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Engelle / Şikayet Modal */}
            {reportTarget && (
                <ReportModal
                    visible={reportModalVisible}
                    onClose={() => setReportModalVisible(false)}
                    currentUserId={user?.id || 'local-user'}
                    targetUserId={reportTarget.userId}
                    targetUserName={reportTarget.userName}
                    contentId={reportTarget.id}
                    contentType="post"
                    onBlocked={() => {
                        // Engellenen kullanıcının postlarını listeden çıkar
                        setPosts(prev => prev.filter(p => p.userId !== reportTarget.userId));
                    }}
                />
            )}
        </SafeAreaView>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Header
    headerSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm },
    headerTitle: { fontSize: FontSize.hero, fontWeight: FontWeight.light, color: Colors.text, letterSpacing: -1, fontFamily: FF },
    headerSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, marginTop: 2 },
    dmBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.gold + '30' },

    // Channels
    channelBar: { maxHeight: 48, marginBottom: Spacing.sm },
    channelScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
    channelPill: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 100,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    },
    channelPillActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '15' },
    channelPillMine: { borderColor: Colors.gold + '40' },
    channelPillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: FF, fontWeight: '500' },
    channelPillTextActive: { color: Colors.gold },

    // Streak Gate
    streakGate: {
        marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md,
        backgroundColor: Colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
    },
    streakGateText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: FF, marginBottom: Spacing.sm, textAlign: 'center' },
    streakProgressBg: { height: 3, backgroundColor: Colors.background, borderRadius: 2, overflow: 'hidden' },
    streakProgressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },

    // Feed
    feedScroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120, flexGrow: 1 },

    // Post Card
    postCard: {
        backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.xl,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    postCardWisdom: { borderColor: Colors.gold + '50', backgroundColor: '#1a180f' },
    postCardMilestone: { borderColor: '#4dff4d30', backgroundColor: '#0f1a0f' },

    postTypeLabel: {
        alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3,
        borderRadius: BorderRadius.sm, marginBottom: Spacing.sm,
    },
    wisdomLabel: { backgroundColor: Colors.gold + '20' },
    milestoneLabel: { backgroundColor: Colors.success + '20' },
    postTypeLabelText: { fontSize: 10, color: Colors.gold, fontFamily: FF, fontWeight: 'bold', letterSpacing: 1.5 },

    // Post Header
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    avatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background,
        alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
        borderWidth: 2,
    },
    avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, fontFamily: FF },
    postHeaderInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    postName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, fontFamily: FF },
    postTime: { color: Colors.textDim, fontSize: FontSize.xs, fontFamily: FF, marginTop: 2 },

    // Badge Pill
    badgePill: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 100, borderWidth: 1, gap: 4,
    },
    badgeEmoji: { fontSize: 12 },
    badgeText: { fontSize: 10, fontWeight: FontWeight.bold, fontFamily: FF },

    // Post Body
    postBody: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24, marginBottom: Spacing.md, fontFamily: FF },

    // Post Footer
    postFooter: { flexDirection: 'row', gap: Spacing.xl },
    footerBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    footerCount: { color: Colors.textDim, fontSize: FontSize.sm, fontFamily: FF },

    // Empty State
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontFamily: FF, marginTop: Spacing.lg },
    emptySubtext: { color: Colors.textDim, fontSize: FontSize.sm, fontFamily: FF, marginTop: Spacing.xs },

    // FAB
    fabWrap: { position: 'absolute', bottom: 120, right: Spacing.lg },
    fab: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.gold,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },

    // Composer Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    composerSheet: {
        backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
        borderWidth: 1, borderColor: Colors.border, borderBottomWidth: 0,
        minHeight: 300,
    },
    composerHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.textDim,
        alignSelf: 'center', marginBottom: Spacing.lg,
    },
    composerHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    composerCancel: { color: Colors.textSecondary, fontSize: FontSize.md, fontFamily: FF },
    composerTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, fontFamily: FF },
    composerPost: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.bold, fontFamily: FF },

    composerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    composerBadgeLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 1 },

    composerInput: {
        minHeight: 120, color: Colors.text, fontSize: FontSize.md, fontFamily: FF,
        textAlignVertical: 'top', lineHeight: 24,
    },
    composerCharCount: { color: Colors.textDim, fontSize: FontSize.xs, fontFamily: FF, textAlign: 'right', marginTop: Spacing.sm },
});

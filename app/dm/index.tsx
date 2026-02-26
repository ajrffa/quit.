import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useAuthStore } from '../../stores/useAuthStore';
import { useHabitStore } from '../../stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { fetchConversations, Conversation } from '../../services/dmService';
import { BADGE_CONFIG, getBadgeForStreak, BadgeLevel } from '../../types/community';

const FF = FontFamily.sans;

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export default function DMListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { currentStreak } = useHabitStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const canReceiveDMs = currentStreak >= 90;

    const loadConversations = useCallback(async () => {
        const data = await fetchConversations(user?.id || 'local-user');
        setConversations(data);
    }, [user?.id]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadConversations();
        setRefreshing(false);
    };

    const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
        const badge = getBadgeForStreak(item.otherUserStreak);
        const config = BADGE_CONFIG[badge];

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
                <Pressable
                    style={({ pressed }) => [s.convRow, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                        router.push(`/dm/${item.id}` as any);
                    }}
                >
                    <View style={[s.avatar, { borderColor: config.color }]}>
                        <Text style={[s.avatarText, { color: config.color }]}>
                            {item.otherUserName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={s.convInfo}>
                        <View style={s.convNameRow}>
                            <Text style={s.convName}>{item.otherUserName}</Text>
                            <Text style={s.convBadge}>{config.emoji} {item.otherUserStreak}d</Text>
                        </View>
                        <Text style={s.convPreview} numberOfLines={1}>
                            {item.lastMessage}
                        </Text>
                    </View>
                    <View style={s.convRight}>
                        <Text style={s.convTime}>{getTimeAgo(item.lastMessageAt)}</Text>
                        {item.unreadCount > 0 && (
                            <View style={s.unreadBadge}>
                                <Text style={s.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.headerTitle}>Messages</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Mentor Info */}
            <Animated.View entering={FadeIn.duration(600)} style={s.infoCard}>
                <FontAwesome name="lock" size={14} color={Colors.gold} />
                <Text style={s.infoText}>
                    Only 🏆 Üstat (90+ day streak) mentors can initiate DMs. Build your streak to unlock mentoring.
                </Text>
            </Animated.View>

            {/* Conversation List */}
            <FlatList
                data={conversations}
                keyExtractor={item => item.id}
                renderItem={renderConversation}
                contentContainerStyle={s.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.gold}
                    />
                }
                ListEmptyComponent={
                    <View style={s.emptyState}>
                        <FontAwesome name="envelope-o" size={48} color={Colors.textDim} />
                        <Text style={s.emptyText}>No messages yet</Text>
                        <Text style={s.emptySubtext}>
                            Connect with mentors in the community
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.text, fontFamily: FF },

    // Info Card
    infoCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.lg, marginVertical: Spacing.md, padding: Spacing.md,
        backgroundColor: Colors.gold + '10', borderRadius: BorderRadius.lg, borderWidth: 1,
        borderColor: Colors.gold + '30',
    },
    infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: FF, lineHeight: 18 },

    // List
    listContent: { paddingBottom: 100, flexGrow: 1 },

    // Conversation Row
    convRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '50',
    },
    avatar: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.card,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginRight: Spacing.md,
    },
    avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, fontFamily: FF },
    convInfo: { flex: 1, marginRight: Spacing.sm },
    convNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
    convName: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.text, fontFamily: FF },
    convBadge: { fontSize: 11, color: Colors.textMuted, fontFamily: FF },
    convPreview: { fontSize: FontSize.sm, color: Colors.textDim, fontFamily: FF },

    convRight: { alignItems: 'flex-end', gap: 6 },
    convTime: { fontSize: FontSize.xs, color: Colors.textDim, fontFamily: FF },
    unreadBadge: {
        minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.gold,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    },
    unreadText: { fontSize: 11, color: Colors.background, fontWeight: 'bold', fontFamily: FF },

    // Empty
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontFamily: FF, marginTop: Spacing.lg },
    emptySubtext: { color: Colors.textDim, fontSize: FontSize.sm, fontFamily: FF, marginTop: Spacing.xs },
});

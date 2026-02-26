import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import { useHabitStore, getXPForLevel } from '@/stores/useHabitStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { BADGE_CONFIG, getBadgeForStreak } from '@/types/community';

const FF = FontFamily.sans;
const IS_DEV = __DEV__; // In production builds this is automatically false

export default function ProfileScreen() {
    const { userName, currentStreak, level, xp, activeHabit, relapseCount, resetApp, isPremium, setPremium, isAppLockEnabled, setAppLockEnabled, streakFreezeCount, addStreakFreeze, milestone365Shown } = useHabitStore();
    const { user, signOut } = useAuthStore();
    const router = useRouter();

    const badge = getBadgeForStreak(currentStreak);
    const badgeConfig = BADGE_CONFIG[badge];
    const xpForNext = getXPForLevel(level);
    const xpProgress = xpForNext > 0 ? xp / xpForNext : 0;

    const handleLogout = async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await signOut();
        router.replace('/');
    };

    const handleReset = () => {
        Alert.alert(
            'Are you sure?',
            'All data will be deleted. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        resetApp();
                        router.replace('/onboarding/welcome');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Avatar & Name */}
                <Animated.View entering={FadeInDown.duration(800)} style={s.profileHeader}>
                    {IS_DEV && (
                        <Pressable style={s.devBadge} onPress={() => setPremium(!isPremium)}>
                            <Text style={s.devBadgeText}>{isPremium ? "★ Revoke Premium" : "★ Grant Premium"}</Text>
                        </Pressable>
                    )}
                    <View style={[s.avatarWrap, { borderColor: badgeConfig.color }]}>
                        <Text style={[s.avatarText, { color: badgeConfig.color }]}>
                            {userName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={s.name}>{userName}</Text>
                    <View style={[s.badgePill, { borderColor: badgeConfig.color + '60' }]}>
                        <Text style={s.badgeEmoji}>{badgeConfig.emoji}</Text>
                        <Text style={[s.badgeLabel, { color: badgeConfig.color }]}>{badgeConfig.label}</Text>
                    </View>
                </Animated.View>

                {/* Stats Grid */}
                {user ? (
                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.statsGrid}>
                        <View style={s.statBox}>
                            <Text style={s.statValue}>{currentStreak}</Text>
                            <Text style={s.statLabel}>STREAK</Text>
                        </View>
                        <View style={s.statBox}>
                            <Text style={s.statValue}>{level}</Text>
                            <Text style={s.statLabel}>LEVEL</Text>
                        </View>
                        <View style={s.statBox}>
                            <Text style={s.statValue}>{relapseCount || 0}</Text>
                            <Text style={s.statLabel}>RELAPSES</Text>
                        </View>
                    </Animated.View>
                ) : (
                    /* Blurred locked stats for guests */
                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.lockedStatsWrap}>
                        <View style={s.statsGrid} pointerEvents="none">
                            <View style={s.statBox}>
                                <Text style={[s.statValue, s.blurredText]}>42</Text>
                                <Text style={s.statLabel}>STREAK</Text>
                            </View>
                            <View style={s.statBox}>
                                <Text style={[s.statValue, s.blurredText]}>7</Text>
                                <Text style={s.statLabel}>LEVEL</Text>
                            </View>
                            <View style={s.statBox}>
                                <Text style={[s.statValue, s.blurredText]}>2</Text>
                                <Text style={s.statLabel}>RELAPSES</Text>
                            </View>
                        </View>
                        <View style={s.lockedOverlay}>
                            <FontAwesome name="lock" size={20} color={Colors.gold} style={{ marginBottom: 8 }} />
                            <Text style={s.lockedText}>Sign in to see your stats</Text>
                            <Pressable
                                style={s.lockedBtn}
                                onPress={() => router.push('/auth/login' as any)}
                            >
                                <Text style={s.lockedBtnText}>Sign In</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                )}

                {/* 365 Forest Founder Badge */}
                {currentStreak >= 365 && (
                    <Animated.View entering={FadeInDown.delay(320).duration(800)} style={s.forestBadge}>
                        <Text style={s.forestBadgeEmoji}>🌱</Text>
                        <View>
                            <Text style={s.forestBadgeTitle}>Forest Founder</Text>
                            <Text style={s.forestBadgeDesc}>365 days done — 10 trees planted</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Streak Freeze */}
                <Animated.View entering={FadeInDown.delay(340).duration(800)} style={s.freezeSection}>
                    <View style={s.freezeHeader}>
                        <Text style={s.freezeEmoji}>🧊</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={s.freezeTitle}>Streak Freeze</Text>
                            <Text style={s.freezeDesc}>
                                {(streakFreezeCount || 0) > 0
                                    ? `${streakFreezeCount} freeze remaining — Protects your streak on missed days`
                                    : 'No freeze left — miss a day and you lose your streak'}
                            </Text>
                        </View>
                        <Text style={s.freezeCount}>{streakFreezeCount || 0}</Text>
                    </View>
                    <Pressable
                        style={s.freezeBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (isPremium) {
                                addStreakFreeze();
                            } else {
                                router.push('/paywall');
                            }
                        }}
                    >
                        <Text style={s.freezeBtnText}>
                            {isPremium ? '+ Add Freeze ($2.99)' : '🔒 Buy Freeze — Premium'}
                        </Text>
                    </Pressable>
                </Animated.View>
                {user && (
                    <Animated.View entering={FadeInDown.delay(300).duration(800)} style={s.xpCard}>
                        <View style={s.xpRow}>
                            <Text style={s.xpLabel}>Level {level} Progress</Text>
                            <Text style={s.xpValue}>{xp} / {xpForNext} XP</Text>
                        </View>
                        <View style={s.xpBar}>
                            <View style={[s.xpFill, { width: `${xpProgress * 100}%` }]} />
                        </View>
                    </Animated.View>
                )}

                {/* Account Info */}
                <Animated.View entering={FadeInDown.delay(400).duration(800)} style={s.section}>
                    <Text style={s.sectionTitle}>ACCOUNT</Text>
                    <View style={s.settingsCard}>
                        <View style={s.settingsRow}>
                            <FontAwesome name="envelope-o" size={16} color={Colors.textMuted} />
                            <Text style={s.settingsLabel}>Email</Text>
                            <Text style={s.settingsValue}>{user?.email || 'Not signed in'}</Text>
                        </View>
                        <View style={s.settingsDivider} />
                        <View style={s.settingsRow}>
                            <FontAwesome name="shield" size={16} color={Colors.textMuted} />
                            <Text style={s.settingsLabel}>Habit</Text>
                            <Text style={s.settingsValue}>
                                {activeHabit?.type === 'other' && activeHabit?.customHabitName
                                    ? activeHabit.customHabitName
                                    : activeHabit?.type || 'None'}
                            </Text>
                        </View>
                        <View style={s.settingsDivider} />
                        <View style={s.settingsRow}>
                            <FontAwesome name="lock" size={16} color={isPremium ? Colors.gold : Colors.textMuted} style={{ width: 16, textAlign: 'center' }} />
                            <Text style={s.settingsLabel}>Biometric Lock {!isPremium && <Text style={{ fontSize: 10, color: Colors.gold }}>PREMIUM</Text>}</Text>
                            <Switch
                                value={isAppLockEnabled}
                                onValueChange={(val) => {
                                    if (!isPremium && val) {
                                        router.push('/paywall');
                                    } else {
                                        setAppLockEnabled(val);
                                    }
                                }}
                                trackColor={{ false: Colors.border, true: Colors.gold }}
                                thumbColor={Colors.text}
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Actions */}
                <Animated.View entering={FadeInDown.delay(500).duration(800)} style={s.actionsSection}>
                    {user ? (
                        <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
                            <FontAwesome name="sign-out" size={18} color={Colors.textSecondary} />
                            <Text style={s.logoutText}>Sign Out</Text>
                        </Pressable>
                    ) : (
                        <Pressable style={({ pressed }) => [s.logoutBtn, { borderColor: Colors.gold, backgroundColor: Colors.gold + '15' }, pressed && { opacity: 0.7 }]} onPress={() => router.push('/auth/login')}>
                            <FontAwesome name="user-circle" size={18} color={Colors.gold} />
                            <Text style={[s.logoutText, { color: Colors.gold }]}>Sign In / Register</Text>
                        </Pressable>
                    )}

                    <Pressable style={({ pressed }) => [s.dangerBtn, pressed && { opacity: 0.7 }]} onPress={handleReset}>
                        <Text style={s.dangerText}>Reset All Data (!)</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: Spacing.lg, paddingBottom: 150 },

    // Profile Header
    profileHeader: { alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.xl },
    avatarWrap: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.card,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
        borderWidth: 2,
    },
    devBadge: {
        position: 'absolute',
        top: -10,
        right: 0,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10
    },
    devBadgeText: {
        fontSize: 10,
        fontFamily: FF,
        color: Colors.background,
        fontWeight: 'bold'
    },
    avatarText: { fontSize: 48, fontWeight: FontWeight.light, fontFamily: FF },
    name: { fontSize: FontSize.xxl, color: Colors.text, fontWeight: FontWeight.medium, marginBottom: Spacing.sm, fontFamily: FF },
    badgePill: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 100, borderWidth: 1, gap: 6,
    },
    badgeEmoji: { fontSize: 16 },
    badgeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, fontFamily: FF },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl,
    },
    statBox: {
        flex: 1, backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.light, color: Colors.text, fontFamily: FF, marginBottom: 4 },
    statLabel: { fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, fontFamily: FF },

    // XP Card
    xpCard: {
        backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl,
    },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    xpLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF },
    xpValue: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: FontWeight.medium, fontFamily: FF },
    xpBar: { height: 4, backgroundColor: Colors.background, borderRadius: 2, overflow: 'hidden' },
    xpFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },

    // Section
    section: { marginBottom: Spacing.xl },
    sectionTitle: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.md, fontFamily: FF },

    // Settings Card
    settingsCard: {
        backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm,
    },
    settingsLabel: { fontSize: FontSize.md, color: Colors.text, fontFamily: FF, flex: 1 },
    settingsValue: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: FF },
    settingsDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },

    // Actions
    actionsSection: { gap: Spacing.md, marginTop: Spacing.md },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, borderRadius: BorderRadius.lg,
        backgroundColor: Colors.card,
    },
    logoutText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium, fontFamily: FF },
    dangerBtn: {
        borderWidth: 1, borderColor: Colors.error, padding: Spacing.lg,
        borderRadius: BorderRadius.lg, alignItems: 'center',
    },
    dangerText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.medium, fontFamily: FF },

    // Locked Stats (guests)
    lockedStatsWrap: { position: 'relative', marginBottom: Spacing.xl },
    blurredText: { opacity: 0.15 },
    lockedOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(10,10,10,0.7)',
        borderRadius: BorderRadius.lg,
    },
    lockedText: {
        fontSize: FontSize.sm, color: Colors.text, fontFamily: FF,
        textAlign: 'center', marginBottom: Spacing.md,
    },
    lockedBtn: {
        backgroundColor: Colors.gold, borderRadius: 100,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    },
    lockedBtnText: { color: Colors.background, fontFamily: FF, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

    // 365 Forest Badge
    forestBadge: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
        marginBottom: Spacing.md,
    },
    forestBadgeEmoji: { fontSize: 28 },
    forestBadgeTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#22c55e', fontFamily: FF },
    forestBadgeDesc: { fontSize: FontSize.xs, color: 'rgba(34,197,94,0.7)', fontFamily: FF, marginTop: 2 },

    // Streak Freeze
    freezeSection: {
        backgroundColor: 'rgba(136,204,238,0.06)', borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(136,204,238,0.2)',
        marginBottom: Spacing.xl, gap: Spacing.md,
    },
    freezeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    freezeEmoji: { fontSize: 24 },
    freezeTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#88CCEE', fontFamily: FF },
    freezeDesc: { fontSize: FontSize.xs, color: 'rgba(136,204,238,0.6)', fontFamily: FF, marginTop: 2 },
    freezeCount: {
        fontSize: 28, fontWeight: FontWeight.bold, color: '#88CCEE',
        fontFamily: FF, marginLeft: 'auto',
    },
    freezeBtn: {
        borderWidth: 1, borderColor: 'rgba(136,204,238,0.3)',
        borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center',
        backgroundColor: 'rgba(136,204,238,0.08)',
    },
    freezeBtnText: { fontSize: FontSize.sm, color: '#88CCEE', fontFamily: FF, fontWeight: FontWeight.medium },
});


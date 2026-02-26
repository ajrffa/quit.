import React, { useEffect } from 'react';
import {
    StyleSheet, Text, View, Pressable, Dimensions, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, FontFamily } from '../constants/Theme';
import { useHabitStore } from '../stores/useHabitStore';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn, FadeInDown, FadeInUp, ZoomIn,
    useSharedValue, withRepeat, withTiming, Easing,
    useAnimatedStyle, cancelAnimation,
} from 'react-native-reanimated';
import { Canvas, Circle, Paint, Group, vec } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');
const FF = FontFamily.sans;

// ── Gold Particle System via Skia ─────────────────────────────────────────
const PARTICLE_COUNT = 50;
type Particle = {
    x: number;
    y: number;
    r: number;
    speed: number;
    opacity: number;
    phase: number; // random phase for varying start positions
};

const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: Math.random() * width,
    y: height + Math.random() * height, // start below screen
    r: 2 + Math.random() * 3,
    speed: 0.3 + Math.random() * 0.5,
    opacity: 0.4 + Math.random() * 0.6,
    phase: Math.random(),
}));

function GoldParticles() {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 8000, easing: Easing.linear }),
            -1,
            false,
        );
        return () => cancelAnimation(progress);
    }, []);

    // We draw directly on canvas — no animated style needed, canvas redraws via RN layout
    return (
        <Canvas style={StyleSheet.absoluteFill}>
            {particles.map((p, i) => {
                // Each particle loops: starts below (phase=0) goes up and exits top
                // We can't use animated style on canvas primitives directly in batch,
                // so we use a static render and rely on parent Animated for motion cues.
                // For premium effect, render at different y offsets per particle
                return (
                    <Circle
                        key={i}
                        cx={p.x + Math.sin((i * 0.7)) * 30}
                        cy={height * 0.85 - p.phase * height * 1.5}
                        r={p.r}
                    >
                        <Paint color={`rgba(212, 175, 55, ${p.opacity})`} />
                    </Circle>
                );
            })}
        </Canvas>
    );
}

// ── Animated Floating Canvas ─────────────────────────────────────────────
function FloatingParticles() {
    const y1 = useSharedValue(0);
    const y2 = useSharedValue(0);
    const y3 = useSharedValue(0);

    useEffect(() => {
        y1.value = withRepeat(withTiming(-height * 1.2, { duration: 9000, easing: Easing.linear }), -1, false);
        y2.value = withRepeat(withTiming(-height * 1.2, { duration: 12000, easing: Easing.linear }), -1, false);
        y3.value = withRepeat(withTiming(-height * 1.2, { duration: 7000, easing: Easing.linear }), -1, false);
        return () => { cancelAnimation(y1); cancelAnimation(y2); cancelAnimation(y3); };
    }, []);

    const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: y1.value }] }));
    const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: y2.value }] }));
    const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: y3.value }] }));

    return (
        <>
            {/* Layer 1: small gold dots */}
            <Animated.View style={[StyleSheet.absoluteFill, style1]} pointerEvents="none">
                {Array.from({ length: 18 }, (_, i) => (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: (i * 53) % width,
                            top: height + (i * 71) % height,
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: Colors.gold,
                            opacity: 0.3 + (i % 5) * 0.1,
                        }}
                    />
                ))}
            </Animated.View>

            {/* Layer 2: medium dots, slower */}
            <Animated.View style={[StyleSheet.absoluteFill, style2]} pointerEvents="none">
                {Array.from({ length: 12 }, (_, i) => (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: (i * 83 + 20) % width,
                            top: height + (i * 97 + 50) % height,
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: Colors.gold,
                            opacity: 0.2 + (i % 4) * 0.12,
                        }}
                    />
                ))}
            </Animated.View>

            {/* Layer 3: tiny bright dots, fastest */}
            <Animated.View style={[StyleSheet.absoluteFill, style3]} pointerEvents="none">
                {Array.from({ length: 22 }, (_, i) => (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: (i * 37 + 10) % width,
                            top: height + (i * 59 + 30) % height,
                            width: 2,
                            height: 2,
                            borderRadius: 1,
                            backgroundColor: '#fff',
                            opacity: 0.15 + (i % 6) * 0.08,
                        }}
                    />
                ))}
            </Animated.View>
        </>
    );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function Milestone365Screen() {
    const router = useRouter();
    const { activeHabit, userName } = useHabitStore();

    useEffect(() => {
        // Triple celebration haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1200);
    }, []);

    const habitLabel = (() => {
        if (!activeHabit) return 'my habit';
        if (activeHabit.type === 'other' && activeHabit.customHabitName) return activeHabit.customHabitName;
        const labels: Record<string, string> = {
            smoking: 'smoking', alcohol: 'alcohol', social_media: 'social media',
            sugar: 'sugar', pornography: 'pornography', gambling: 'gambling',
            junk_food: 'junk food', nail_biting: 'nail biting', other: 'my habit',
        };
        return labels[activeHabit.type] || 'my habit';
    })();

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await Share.share({
                message: `365 days free from ${habitLabel}. @quitapp planted 10 trees in my name. 🌱 #QuitApp #365Days`,
                title: '365 Days — I freed myself with quit.',
            });
        } catch (_) { }
    };

    return (
        <View style={s.container}>
            {/* Floating Gold Particles */}
            <FloatingParticles />

            <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
                {/* Top small brand */}
                <Animated.Text entering={FadeIn.delay(200).duration(800)} style={s.brand}>
                    quit.
                </Animated.Text>

                {/* Center content */}
                <View style={s.center}>
                    {/* Gold glow orb */}
                    <Animated.View entering={ZoomIn.delay(400).springify().damping(12)} style={s.orb}>
                        <View style={s.orbInner}>
                            <Text style={s.orbEmoji}>🌟</Text>
                        </View>
                    </Animated.View>

                    {/* 365 DAYS */}
                    <Animated.Text entering={FadeInDown.delay(600).duration(700)} style={s.heroLabel}>
                        365 DAYS
                    </Animated.Text>

                    {/* Subtitle */}
                    <Animated.Text entering={FadeInDown.delay(800).duration(700)} style={s.subtitle}>
                        You completed a full year.
                    </Animated.Text>

                    {/* Thin gold divider */}
                    <Animated.View entering={FadeIn.delay(1000).duration(500)} style={s.divider} />

                    {/* Forest donation box */}
                    <Animated.View entering={FadeInDown.delay(1100).duration(700)} style={s.forestBox}>
                        <Text style={s.forestEmoji}>🌱</Text>
                        <Text style={s.forestTitle}>10 trees will be planted in your name.</Text>
                        <Text style={s.forestDesc}>
                            quit. donates 10 real trees to a forest for every user who completes
                            a full year. You are now part of this forest.
                        </Text>
                    </Animated.View>
                </View>

                {/* Bottom buttons */}
                <Animated.View entering={FadeInUp.delay(1400).duration(600)} style={s.footer}>
                    <Pressable
                        style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                        onPress={handleShare}
                    >
                        <Text style={s.shareBtnText}>🌱 Share My Certificate</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => router.back()}
                    >
                        <Text style={s.closeBtnText}>Continue</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    safe: { flex: 1, paddingHorizontal: Spacing.xl },

    brand: {
        color: Colors.gold,
        fontSize: FontSize.sm,
        fontFamily: FF,
        fontWeight: FontWeight.light,
        letterSpacing: 4,
        textAlign: 'center',
        marginTop: Spacing.md,
        textTransform: 'uppercase',
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    orb: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(212,175,55,0.08)',
        borderWidth: 1,
        borderColor: Colors.gold + '40',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 20,
    },
    orbInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(212,175,55,0.12)',
        borderWidth: 1,
        borderColor: Colors.gold + '60',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbEmoji: { fontSize: 40 },

    heroLabel: {
        fontSize: 56,
        fontWeight: FontWeight.thin,
        color: Colors.gold,
        fontFamily: FF,
        letterSpacing: 8,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    subtitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.light,
        color: '#ffffff',
        fontFamily: FF,
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: Spacing.xl,
    },

    divider: {
        width: 60,
        height: 1,
        backgroundColor: Colors.gold + '40',
        marginBottom: Spacing.xl,
    },

    forestBox: {
        backgroundColor: 'rgba(34, 197, 94, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.25)',
        borderRadius: 20,
        padding: Spacing.xl,
        alignItems: 'center',
        width: '100%',
    },
    forestEmoji: { fontSize: 40, marginBottom: Spacing.md },
    forestTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.medium,
        color: '#22c55e',
        fontFamily: FF,
        textAlign: 'center',
        marginBottom: Spacing.md,
        letterSpacing: 0.5,
    },
    forestDesc: {
        fontSize: FontSize.sm,
        color: 'rgba(34, 197, 94, 0.7)',
        fontFamily: FF,
        textAlign: 'center',
        lineHeight: 22,
    },

    footer: {
        paddingBottom: Spacing.xl,
        gap: Spacing.md,
    },
    shareBtn: {
        backgroundColor: '#22c55e',
        borderRadius: 100,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    shareBtnText: {
        color: '#000000',
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        fontFamily: FF,
        letterSpacing: 0.5,
    },
    closeBtn: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    closeBtnText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: FontSize.sm,
        fontFamily: FF,
        letterSpacing: 1,
    },
});

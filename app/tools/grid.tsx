import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily, BorderRadius } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;
const GRID_SIZE = 4;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

export default function GridGameScreen() {
    const router = useRouter();
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    const getSpawnInterval = useCallback(() => Math.max(250, 900 - (combo * 45)), [combo]);

    useEffect(() => {
        let timerId: ReturnType<typeof setInterval>;
        if (isPlaying && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsPlaying(false);
            setActiveCell(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return () => clearInterval(timerId);
    }, [isPlaying, timeLeft]);

    useEffect(() => {
        let spawnId: ReturnType<typeof setTimeout>;
        if (isPlaying && timeLeft > 0) {
            const spawnNext = () => {
                let nextCell;
                do {
                    nextCell = Math.floor(Math.random() * TOTAL_CELLS);
                } while (nextCell === activeCell);

                setActiveCell(nextCell);
                spawnId = setTimeout(() => {
                    setCombo(0);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    spawnNext();
                }, getSpawnInterval() * 1.5);
            };
            spawnId = setTimeout(spawnNext, getSpawnInterval());
        }
        return () => clearTimeout(spawnId);
    }, [isPlaying, getSpawnInterval, timeLeft, activeCell]);

    const handlePress = (index: number) => {
        if (!isPlaying) return;

        if (index === activeCell) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const newCombo = combo + 1;
            setCombo(newCombo);
            setMaxCombo(prev => Math.max(prev, newCombo));
            setScore(prev => prev + (1 * Math.min(newCombo, 5)));
            setActiveCell(null);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            setCombo(0);
            setScore(prev => Math.max(0, prev - 1));
        }
    };

    const startGame = () => {
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTimeLeft(60);
        setIsPlaying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const cells = Array.from({ length: TOTAL_CELLS });

    return (
        <SafeAreaView style={s.container}>
            <Animated.View entering={FadeIn.duration(400)} style={s.headerRow}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                    <FontAwesome name="close" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.brand}>NEURAL OVERRIDE</Text>
                <View style={{ width: 44 }} />
            </Animated.View>

            <View style={s.statsRow}>
                <View style={s.statBox}>
                    <Text style={s.statLabel}>SCORE</Text>
                    <Text style={s.statValue}>{score}</Text>
                </View>
                {combo > 2 && (
                    <Animated.View entering={ZoomIn} exiting={ZoomOut} style={s.comboBadge}>
                        <Text style={s.comboText}>{combo}x STREAK</Text>
                    </Animated.View>
                )}
                <View style={[s.statBox, { alignItems: 'flex-end' }]}>
                    <Text style={s.statLabel}>TIME</Text>
                    <Text style={s.statValue}>{timeLeft}s</Text>
                </View>
            </View>

            <View style={s.content}>
                {!isPlaying && timeLeft === 60 && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={s.introBox}>
                        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]} />
                        <FontAwesome name="bolt" size={48} color={Colors.gold} style={{ marginBottom: Spacing.xl, shadowColor: Colors.gold, shadowOpacity: 0.8, shadowRadius: 20 }} />
                        <Text style={s.introTitle}>Tetris Effect</Text>
                        <Text style={s.introText}>
                            Cravings rely on visual working memory. By flooding your visual field with a fast-paced matching task, you actively block the brain&apos;s ability to picture the craving. Tap the glowing nodes as fast as you can.
                        </Text>
                        <Pressable style={({ pressed }) => [s.startBtn, pressed && { transform: [{ scale: 0.98 }] }]} onPress={startGame}>
                            <LinearGradient colors={['#2A2A35', '#1A1A24']} style={[StyleSheet.absoluteFill, { borderRadius: 4 }]} />
                            <Text style={s.startBtnText}>INITIATE</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {!isPlaying && timeLeft === 0 && (
                    <Animated.View entering={FadeIn} style={s.introBox}>
                        <FontAwesome name="check-circle" size={48} color={Colors.gold} style={{ marginBottom: Spacing.xl }} />
                        <Text style={s.introTitle}>Override Complete</Text>
                        <Text style={s.introText}>
                            You scored {score} points with a max streak of {maxCombo}x.{'\n\n'}Assess your craving level now. It should be noticeably lower.
                        </Text>
                        <Pressable style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.8 }]} onPress={() => router.back()}>
                            <Text style={s.startBtnText}>EXIT PROTOCOL</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {(isPlaying || (timeLeft < 60 && timeLeft > 0)) && (
                    <View style={s.grid}>
                        {cells.map((_, i) => (
                            <Pressable
                                key={i}
                                style={[s.cell, activeCell === i && s.activeCell]}
                                onPress={() => handlePress(i)}
                            >
                                {activeCell === i && (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0FF', opacity: 0.1 }]} />
                                )}
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const CELL_SIZE = (width - (Spacing.xl * 2) - (Spacing.sm * 3)) / GRID_SIZE;

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05050A' },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.md,
        marginBottom: Spacing.md
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    brand: { fontSize: 11, color: Colors.gold, letterSpacing: 4, fontFamily: FF, fontWeight: 'bold' },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        marginBottom: Spacing.xl,
        height: 60,
    },
    statBox: {
        alignItems: 'flex-start',
        width: 80,
    },
    statLabel: {
        fontSize: 10,
        color: Colors.textMuted,
        fontFamily: FF,
        letterSpacing: 2,
        marginBottom: 4,
        fontWeight: 'bold'
    },
    statValue: {
        fontSize: 32,
        color: '#FFF',
        fontFamily: FF,
        fontWeight: '900',
        textShadowColor: 'rgba(255,255,255,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10
    },
    comboBadge: {
        backgroundColor: 'rgba(212,175,55,0.1)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: Colors.gold,
        shadowColor: Colors.gold,
        shadowOpacity: 0.5,
        shadowRadius: 10
    },
    comboText: {
        color: Colors.gold,
        fontFamily: FF,
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 2,
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },

    introBox: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090912',
        padding: Spacing.xxl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 30,
    },
    introTitle: {
        fontSize: 32,
        color: Colors.text,
        fontFamily: FF,
        fontWeight: '900',
        marginBottom: Spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    introText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        fontFamily: FF,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: Spacing.xl * 1.5,
    },
    startBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gold
    },
    startBtnText: {
        color: Colors.gold,
        fontSize: FontSize.sm,
        fontFamily: FF,
        fontWeight: '900',
        letterSpacing: 4
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        justifyContent: 'center',
        width: '100%'
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: '#0A0A10',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    activeCell: {
        backgroundColor: '#0FF', // Neon Cyan
        borderColor: '#FFF',
        borderWidth: 2,
        shadowColor: '#0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 10,
    }
});

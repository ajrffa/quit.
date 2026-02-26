import React, { useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily, BorderRadius } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, Easing, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

const GRID_COLS = 12;
const GRID_ROWS = 16;
const TOTAL_PIXELS = GRID_COLS * GRID_ROWS;
const PIXEL_SIZE = Math.floor((width - (Spacing.xl * 2)) / GRID_COLS);

// Ultra-premium neon color palette
const HIDDEN_COLORS = [
    '#FF3366', '#0FF', '#FFD700', '#B026FF',
    '#00FF66', '#FF3399', '#33CCFF', '#FF9933'
];

interface Pixel {
    id: number;
    revealed: boolean;
    color: string;
}

export default function PixelArtScreen() {
    const router = useRouter();
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const revealedThisPan = useRef<Set<number>>(new Set());

    const initGrid = useCallback(() => {
        const newPixels: Pixel[] = [];
        for (let i = 0; i < TOTAL_PIXELS; i++) {
            const randomColor = HIDDEN_COLORS[Math.floor(Math.random() * HIDDEN_COLORS.length)];
            newPixels.push({ id: i, revealed: false, color: randomColor });
        }
        setPixels(newPixels);
        setRevealedCount(0);
        setIsComplete(false);
    }, []);

    useMemo(() => { initGrid(); }, [initGrid]);

    const handleReveal = (index: number) => {
        setPixels(prev => {
            const copy = [...prev];
            if (!copy[index].revealed) {
                copy[index].revealed = true;

                // Extremely satisfying light haptics
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                setRevealedCount(count => {
                    const newCount = count + 1;
                    if (newCount === TOTAL_PIXELS) {
                        setIsComplete(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    return newCount;
                });
            }
            return copy;
        });
    };

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            revealedThisPan.current.clear();
            const { locationX, locationY } = evt.nativeEvent;
            processTouch(locationX, locationY);
        },
        onPanResponderMove: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            processTouch(locationX, locationY);
        }
    }), []);

    const processTouch = (x: number, y: number) => {
        if (x < 0 || y < 0) return;
        const col = Math.floor(x / PIXEL_SIZE);
        const row = Math.floor(y / PIXEL_SIZE);
        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            const index = row * GRID_COLS + col;
            if (!pixels[index]?.revealed && !revealedThisPan.current.has(index)) {
                revealedThisPan.current.add(index);
                handleReveal(index);
            }
        }
    };

    const progress = (revealedCount / TOTAL_PIXELS) * 100;

    return (
        <SafeAreaView style={s.container}>
            <Animated.View entering={FadeIn.duration(400)} style={s.headerRow}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                    <FontAwesome name="close" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.brand}>LUMINESCENCE</Text>
                <Pressable onPress={() => { Haptics.selectionAsync(); initGrid(); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }, { alignItems: 'flex-end' }]}>
                    <FontAwesome name="refresh" size={16} color={Colors.textMuted} />
                </Pressable>
            </Animated.View>

            <View style={s.progressContainer}>
                <View style={s.progressTrack}>
                    <Animated.View style={[s.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={s.progressText}>{Math.floor(progress)}%</Text>
            </View>

            <View style={s.content}>
                {!isComplete ? (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={s.gameArea}>
                        <Text style={s.hint}>WASH AWAY THE DARKNESS</Text>

                        <View style={s.gridContainer} {...panResponder.panHandlers}>
                            <LinearGradient
                                colors={['#1A1A24', '#090912']}
                                style={StyleSheet.absoluteFill}
                            />
                            {pixels.map((p, i) => (
                                <View
                                    key={p.id}
                                    style={[
                                        s.pixel,
                                        p.revealed ? { backgroundColor: p.color, shadowColor: p.color, shadowOpacity: 0.8, shadowRadius: 5, zIndex: 10 } : { backgroundColor: 'transparent' }
                                    ]}
                                />
                            ))}
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeIn.duration(800)} style={s.doneContainer}>
                        <LinearGradient colors={['rgba(212,175,55,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                        <FontAwesome name="sun-o" size={64} color={Colors.gold} style={{ marginBottom: Spacing.xl, shadowColor: Colors.gold, shadowOpacity: 0.8, shadowRadius: 20 }} />
                        <Text style={s.title}>CLARITY RESTORED.</Text>
                        <Text style={s.subtitle}>
                            You brought vibrant energy back to the void. Notice how your mind feels quieter now.
                        </Text>
                        <Pressable style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.8 }]} onPress={() => router.back()}>
                            <Text style={s.actionBtnText}>EXIT PROTOCOL</Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        </SafeAreaView>
    );
}

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

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl
    },
    progressTrack: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        overflow: 'hidden',
        marginRight: Spacing.md
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.gold,
        shadowColor: Colors.gold,
        shadowOpacity: 1,
        shadowRadius: 5
    },
    progressText: {
        color: Colors.gold,
        fontFamily: FF,
        fontSize: 10,
        fontWeight: 'bold',
        width: 35,
        textAlign: 'right'
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },

    gameArea: {
        alignItems: 'center',
        width: '100%',
    },
    hint: {
        color: Colors.textSecondary,
        fontFamily: FF,
        fontSize: 10,
        marginBottom: Spacing.xl,
        letterSpacing: 4,
        fontWeight: 'bold'
    },
    gridContainer: {
        width: PIXEL_SIZE * GRID_COLS,
        height: PIXEL_SIZE * GRID_ROWS,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#090912',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pixel: {
        width: PIXEL_SIZE,
        height: PIXEL_SIZE,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.05)'
    },

    doneContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 32,
        color: Colors.gold,
        fontFamily: FF,
        fontWeight: '900',
        marginBottom: Spacing.md,
        textAlign: 'center',
        letterSpacing: 3
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        fontFamily: FF,
        textAlign: 'center',
        marginBottom: Spacing.xxl * 1.5,
        lineHeight: 24,
    },
    actionBtn: {
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: Colors.gold,
        width: '100%',
        alignItems: 'center',
    },
    actionBtnText: {
        color: Colors.gold,
        fontSize: FontSize.sm,
        fontFamily: FF,
        fontWeight: '900',
        letterSpacing: 4
    }
});

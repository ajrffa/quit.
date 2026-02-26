import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../constants/Theme';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
    runOnJS, withSequence, withDelay
} from 'react-native-reanimated';
import { Canvas, Circle, Rect, RoundedRect } from '@shopify/react-native-skia';
import { interpolate } from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const FF = FontFamily.sans;

// ── Game constants ────────────────────────────────────────────────────────────
const BIN_X = W * 0.5;
const BIN_Y = H * 0.35;
const BIN_W = 90;
const BIN_H = 70;
const BALL_RADIUS = 18;
const PAPER_START_X = W * 0.5;
const PAPER_START_Y = H * 0.72;

// Confetti particle type
interface ConfettiParticle {
    x: number;
    y: number;
    color: string;
    size: number;
}

const CONFETTI_COLORS = ['#D4AF37', '#fff', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

function makeConfetti(): ConfettiParticle[] {
    return Array.from({ length: 28 }, (_, i) => ({
        x: BIN_X + (Math.sin(i) * BIN_W * 0.6),
        y: BIN_Y + (Math.cos(i) * 20),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 8 + 4,
    }));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShredderScreen() {
    const router = useRouter();
    const [thought, setThought] = useState('');
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState<'idle' | 'throwing' | 'success'>('idle');
    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const animFrameRef = useRef<number | null>(null);

    // Ball animation values
    const ballX = useSharedValue(PAPER_START_X);
    const ballY = useSharedValue(PAPER_START_Y);
    const ballScale = useSharedValue(1);
    const ballOpacity = useSharedValue(1);

    // Status text animation
    const statusOpacity = useSharedValue(0);
    const statusScale = useSharedValue(0.8);

    const resetBall = useCallback(() => {
        ballX.value = PAPER_START_X;
        ballY.value = PAPER_START_Y;
        ballScale.value = 1;
        ballOpacity.value = 1;
    }, []);

    const showStatusAnim = useCallback(() => {
        statusOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(800, withTiming(0, { duration: 300 }))
        );
        statusScale.value = withSequence(
            withSpring(1.1),
            withDelay(800, withTiming(0.8, { duration: 300 }))
        );
    }, []);

    const handleSuccess = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScore(s => s + 1);
        setShowConfetti(true);
        setConfetti(makeConfetti());
        setStatus('success');
        showStatusAnim();
        setTimeout(() => {
            setShowConfetti(false);
            setStatus('idle');
            resetBall();
        }, 1500);
    }, [resetBall, showStatusAnim]);

    const handleThrow = useCallback(() => {
        if (!thought.trim() || status === 'throwing') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStatus('throwing');
        setThought('');

        const startX = PAPER_START_X;
        const startY = PAPER_START_Y;
        const targetX = BIN_X;
        const targetY = BIN_Y;
        const totalFrames = 50;
        const peakOffset = -H * 0.28;

        ballX.value = startX;
        ballY.value = startY;
        ballScale.value = 1;
        ballOpacity.value = 1;

        let frame = 0;

        const animate = () => {
            if (frame > totalFrames) return;
            const t = frame / totalFrames;

            // Quadratic Bezier parabola — always aimed at the bin center
            const midX = startX + (targetX - startX) * 0.5;
            const midY = startY + peakOffset;
            const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * targetX;
            const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * targetY;

            ballX.value = bx;
            ballY.value = by;
            // Perspective: ball gets smaller as it flies toward the bin
            ballScale.value = interpolate(t, [0, 1], [1, 0.55]);

            frame++;

            if (frame > totalFrames) {
                // Every throw always hits — no miss mechanic
                ballOpacity.value = withTiming(0, { duration: 200 });
                runOnJS(handleSuccess)();
                return;
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);
    }, [thought, status, handleSuccess]);

    // Animated styles
    const ballStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: ballX.value - BALL_RADIUS },
            { translateY: ballY.value - BALL_RADIUS },
            { scale: ballScale.value },
        ],
        opacity: ballOpacity.value,
        position: 'absolute',
    }));

    const statusStyle = useAnimatedStyle(() => ({
        opacity: statusOpacity.value,
        transform: [{ scale: statusScale.value }],
    }));

    const canThrow = thought.trim().length > 0 && status !== 'throwing';

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
                    <FontAwesome name="angle-left" size={28} color={Colors.text} />
                </Pressable>
                <Text style={s.title}>SHREDDER</Text>
                <View style={s.scoreBox}>
                    <Text style={s.scoreTxt}>{score}</Text>
                </View>
            </View>

            {/* Game Area */}
            <View style={s.gameArea}>

                {/* Bin */}
                <View style={s.binWrap}>
                    <Canvas style={{ width: BIN_W + 20, height: BIN_H + 20 }}>
                        <RoundedRect x={10} y={10} width={BIN_W} height={BIN_H} r={8} color={Colors.card} />
                        <RoundedRect x={10} y={10} width={BIN_W} height={BIN_H} r={8} color={Colors.border}
                            style="stroke" strokeWidth={1.5} />
                        <Rect x={28} y={22} width={2} height={BIN_H - 20} color={Colors.border} />
                        <Rect x={50} y={22} width={2} height={BIN_H - 20} color={Colors.border} />
                        <Rect x={72} y={22} width={2} height={BIN_H - 20} color={Colors.border} />
                        <Rect x={5} y={10} width={BIN_W + 10} height={8} color={Colors.border} />
                    </Canvas>
                    <Text style={s.binEmoji}>🗑️</Text>
                </View>

                {/* Status text */}
                <Animated.View style={[s.statusWrap, statusStyle]}>
                    <Text style={[s.statusTxt, { color: '#22c55e' }]}>
                        SHREDDED! 💥
                    </Text>
                </Animated.View>

                {/* Paper ball */}
                <Animated.View style={ballStyle}>
                    <Canvas style={{ width: BALL_RADIUS * 2, height: BALL_RADIUS * 2 }}>
                        <Circle cx={BALL_RADIUS} cy={BALL_RADIUS} r={BALL_RADIUS} color={Colors.card} />
                        <Circle cx={BALL_RADIUS} cy={BALL_RADIUS} r={BALL_RADIUS} color={Colors.gold}
                            style="stroke" strokeWidth={1.5} />
                        <Circle cx={BALL_RADIUS - 4} cy={BALL_RADIUS - 3} r={4} color={Colors.border} style="stroke" strokeWidth={1} />
                        <Circle cx={BALL_RADIUS + 3} cy={BALL_RADIUS + 4} r={3} color={Colors.border} style="stroke" strokeWidth={1} />
                    </Canvas>
                </Animated.View>

                {/* Confetti */}
                {showConfetti && (
                    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                        {confetti.map((c, i) => (
                            <Rect key={i} x={c.x} y={c.y} width={c.size} height={c.size / 2} color={c.color} />
                        ))}
                    </Canvas>
                )}
            </View>

            {/* Input Area */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inputArea}>
                <Text style={s.inputLabel}>Write down the urge or feeling and throw it away:</Text>
                <TextInput
                    style={s.input}
                    value={thought}
                    onChangeText={setThought}
                    placeholder="e.g. I really want to smoke right now..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    maxLength={200}
                    returnKeyType="done"
                    blurOnSubmit
                />
                <Pressable
                    style={({ pressed }) => [s.throwBtn, !canThrow && s.throwBtnDisabled, pressed && canThrow && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                    onPress={handleThrow}
                    disabled={!canThrow}
                >
                    {status === 'throwing'
                        ? <Text style={s.throwBtnTxt}>THROWING...</Text>
                        : <>
                            <FontAwesome name="trash-o" size={18} color={Colors.background} style={{ marginRight: 8 }} />
                            <Text style={s.throwBtnTxt}>SHRED & THROW</Text>
                        </>
                    }
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center' },
    title: { fontSize: FontSize.md, color: Colors.gold, fontFamily: FF, fontWeight: '700', letterSpacing: 2 },
    scoreBox: {
        backgroundColor: Colors.card, paddingHorizontal: Spacing.md, paddingVertical: 6,
        borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    },
    scoreTxt: { fontSize: FontSize.sm, color: Colors.text, fontFamily: FF, letterSpacing: 1 },

    gameArea: { flex: 1, alignItems: 'center', paddingTop: H * 0.04 },

    binWrap: { alignItems: 'center' },
    binEmoji: { fontSize: 32, marginTop: -12 },

    statusWrap: { position: 'absolute', top: H * 0.14, alignSelf: 'center' },
    statusTxt: { fontSize: 28, fontFamily: FF, fontWeight: '700', letterSpacing: 2 },

    inputArea: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.md,
    },
    inputLabel: {
        fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF,
        letterSpacing: 1, textTransform: 'uppercase',
    },
    input: {
        backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border, color: Colors.text,
        fontFamily: FF, fontSize: FontSize.md, padding: Spacing.lg,
        minHeight: 80, textAlignVertical: 'top',
    },
    throwBtn: {
        backgroundColor: Colors.gold, borderRadius: BorderRadius.xl,
        padding: Spacing.lg, alignItems: 'center', flexDirection: 'row',
        justifyContent: 'center', shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35,
        shadowRadius: 10, elevation: 6,
    },
    throwBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    throwBtnTxt: {
        fontSize: FontSize.md, fontWeight: '700', color: Colors.background,
        fontFamily: FF, letterSpacing: 2,
    },
});

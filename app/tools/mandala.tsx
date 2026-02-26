import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Polyline, G, Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

const CANVAS_SIZE = width;
const CENTER = CANVAS_SIZE / 2;
const SYMMETRY_LINES = 12; // Increased to 12 for richer geometry

interface Point {
    x: number;
    y: number;
}

export default function MandalaToolScreen() {
    const router = useRouter();
    const [paths, setPaths] = useState<Point[][]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);

    const pan = Gesture.Pan()
        .runOnJS(true)
        .maxPointers(1)
        .onBegin((e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentPath([{ x: e.x - CENTER, y: e.y - CENTER }]);
        })
        .onUpdate((e) => {
            setCurrentPath((prev) => {
                const last = prev[prev.length - 1];
                const nx = e.x - CENTER;
                const ny = e.y - CENTER;
                if (last && Math.hypot(nx - last.x, ny - last.y) < 2) {
                    return prev;
                }
                // Haptic tick if drawing fast
                if (Math.random() > 0.8) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return [...prev, { x: nx, y: ny }];
            });
        })
        .onEnd(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setPaths((prev) => [...prev, currentPath]);
            setCurrentPath([]);
        });

    const clearCanvas = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPaths([]);
        setCurrentPath([]);
    };

    const renderSymmetricPaths = (pts: Point[], keyPrefix: string, isCurrent: boolean = false) => {
        if (pts.length < 2) return null;

        const stringPath = pts.map(p => `${p.x},${p.y}`).join(' ');
        const copies = [];

        const angleStep = 360 / SYMMETRY_LINES;

        for (let i = 0; i < SYMMETRY_LINES; i++) {
            copies.push(
                <G key={`${keyPrefix}-r${i}`} rotation={i * angleStep} origin="0, 0">
                    <Polyline
                        points={stringPath}
                        fill="none"
                        stroke={isCurrent ? '#FFF' : '#0FF'} // Neon cyan
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isCurrent ? 1 : 0.8}
                    />
                    {/* Mirror Image */}
                    <G scaleX={-1} origin="0, 0">
                        <Polyline
                            points={stringPath}
                            fill="none"
                            stroke={isCurrent ? '#FFF' : '#0FF'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={isCurrent ? 1 : 0.8}
                        />
                    </G>
                </G>
            );
        }
        return copies;
    };

    // Blueprint Background Generation
    const gridLines = [];
    const gridSize = 20;
    for (let i = 0; i < CANVAS_SIZE; i += gridSize) {
        gridLines.push(<Line key={`h${i}`} x1="0" y1={i} x2={CANVAS_SIZE} y2={i} stroke="rgba(0, 255, 255, 0.05)" strokeWidth="1" />);
        gridLines.push(<Line key={`v${i}`} x1={i} y1="0" x2={i} y2={CANVAS_SIZE} stroke="rgba(0, 255, 255, 0.05)" strokeWidth="1" />);
    }

    return (
        <GestureHandlerRootView style={s.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={s.headerRow}>
                    <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]} hitSlop={20}>
                        <FontAwesome name="chevron-left" size={16} color={Colors.textMuted} />
                    </Pressable>
                    <Text style={s.brand}>GEOMETRIC FOCUS</Text>
                    <Pressable onPress={clearCanvas} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }, { alignItems: 'flex-end' }]} hitSlop={20}>
                        <FontAwesome name="eraser" size={16} color={Colors.textMuted} />
                    </Pressable>
                </View>

                <Animated.View entering={FadeInDown.delay(100)} style={s.introBox}>
                    <FontAwesome name="circle-o-notch" size={32} color={Colors.gold} style={{ marginBottom: Spacing.md }} />
                    <Text style={s.subtitle}>Draw slowly. Trace the geometry. Let it completely override your visual working memory.</Text>
                </Animated.View>

                <View style={s.canvasContainer}>
                    <GestureDetector gesture={pan}>
                        <Animated.View entering={FadeInDown.delay(300).springify()} style={s.canvasWrapper}>
                            <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ flex: 1, pointerEvents: 'none' }}>
                                {/* Blueprint Grid */}
                                {gridLines}

                                {/* Blueprint Guides */}
                                <G x={CENTER} y={CENTER}>
                                    <Circle cx="0" cy="0" r={CENTER - 20} stroke="rgba(0, 255, 255, 0.15)" strokeWidth="1" fill="none" strokeDasharray="4, 8" />
                                    <Circle cx="0" cy="0" r={(CENTER - 20) / 2} stroke="rgba(0, 255, 255, 0.15)" strokeWidth="1" fill="none" strokeDasharray="4, 8" />
                                    <Circle cx="0" cy="0" r={(CENTER - 20) / 4} stroke="rgba(0, 255, 255, 0.15)" strokeWidth="1" fill="none" strokeDasharray="4, 8" />
                                    <Line x1={-CENTER} y1="0" x2={CENTER} y2="0" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                                    <Line x1="0" y1={-CENTER} x2="0" y2={CENTER} stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                                    <Line x1={-CENTER} y1={-CENTER} x2={CENTER} y2={CENTER} stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                                    <Line x1={-CENTER} y1={CENTER} x2={CENTER} y2={-CENTER} stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />

                                    {/* All completed paths */}
                                    {paths.map((pts, i) => renderSymmetricPaths(pts, `p${i}`))}

                                    {/* Drawing path */}
                                    {renderSymmetricPaths(currentPath, 'current', true)}
                                </G>
                            </Svg>

                            {/* Outer Glow via CSS */}
                            <View style={[StyleSheet.absoluteFill, { shadowColor: '#0FF', shadowOpacity: 0.1, shadowRadius: 30, pointerEvents: 'none' }]} />
                        </Animated.View>
                    </GestureDetector>
                </View>

            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020205' }, // Very dark midnight blue
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.md,
        zIndex: 10
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center' },
    brand: { fontSize: 11, color: Colors.gold, letterSpacing: 4, fontFamily: FF, fontWeight: 'bold' },

    introBox: {
        paddingHorizontal: Spacing.xxl,
        marginTop: Spacing.xxl,
        marginBottom: Spacing.md,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontFamily: FF,
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.5
    },

    canvasContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasWrapper: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: '#050510',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(0,255,255,0.2)',
    }
});

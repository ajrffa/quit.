import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontFamily, BorderRadius } from '../../constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, withSequence, interpolate, Extrapolation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

// Generate randomized bubble properties for organic layout
const generateBubbles = (total: number) => {
    return Array.from({ length: total }).map((_, i) => ({
        id: i,
        size: Math.random() * 24 + 44, // 44 to 68
        marginOffset: (Math.random() - 0.5) * 15,
        hueOffset: Math.random() * 40 - 20 // Slight color variation
    }));
};

const TOTAL_BUBBLES = 80;

function Bubble({ size, marginOffset, hueOffset, onPop }: { size: number, marginOffset: number, hueOffset: number, onPop: () => void }) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const popRadius = useSharedValue(0); // For outer ring pop effect
    const [popped, setPopped] = useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: popRadius.value }],
        opacity: interpolate(popRadius.value, [1, 1.5], [0.8, 0], Extrapolation.CLAMP)
    }));

    const handlePress = () => {
        if (popped) return;

        // Intense tactile feedback dependent on size
        if (size > 60) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (size > 50) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Pop Animation Core
        scale.value = withSequence(
            withSpring(1.2, { damping: 20, stiffness: 400 }),
            withTiming(0, { duration: 100, easing: Easing.out(Easing.exp) })
        );
        opacity.value = withTiming(0, { duration: 150 });

        // Outer ring explosion
        popRadius.value = withTiming(1.5, { duration: 250, easing: Easing.out(Easing.quad) });

        setPopped(true);
        onPop();
    };

    return (
        <View style={[{ width: size, height: size, margin: 6, transform: [{ translateY: marginOffset }] }]}>
            {/* Pop Ring Effect */}
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, borderWidth: 2, borderColor: Colors.gold }, ringStyle]} pointerEvents="none" />

            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <Pressable style={s.bubblePressable} onPress={handlePress}>
                    <LinearGradient
                        colors={[`hsl(${45 + hueOffset}, 100%, 70%)`, `hsl(${45 + hueOffset}, 100%, 30%)`, 'transparent']}
                        start={{ x: 0.2, y: 0.2 }}
                        end={{ x: 1, y: 1 }}
                        style={[{ width: '100%', height: '100%', borderRadius: size, opacity: 0.6 }]}
                    />
                    {/* Glossy Highlight inside bubble */}
                    <View style={[{ position: 'absolute', top: '15%', left: '20%', width: size * 0.3, height: size * 0.15, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: size, transform: [{ rotate: '-30deg' }] }]} pointerEvents="none" />
                </Pressable>
            </Animated.View>

            {popped && (
                <View style={[StyleSheet.absoluteFill, s.bubblePoppedBackdrop, { borderRadius: size }]} pointerEvents="none" />
            )}
        </View>
    );
}

export default function BubbleWrapScreen() {
    const router = useRouter();
    const [poppedCount, setPoppedCount] = useState(0);
    const [key, setKey] = useState(0);

    const bubbles = useMemo(() => generateBubbles(TOTAL_BUBBLES), [key]);

    const resetBubbles = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPoppedCount(0);
        setKey(prev => prev + 1);
    };

    const handlePop = () => {
        setPoppedCount(prev => prev + 1);
    };

    const progress = poppedCount / TOTAL_BUBBLES;

    return (
        <View style={s.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={s.header}>
                    <Pressable
                        style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            router.back();
                        }}
                    >
                        <FontAwesome name="chevron-left" size={16} color={Colors.textMuted} />
                    </Pressable>
                    <View style={s.headerCenter}>
                        <Text style={s.headerTitle}>SENSORY POP</Text>
                        <View style={s.progressTrack}>
                            <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                    <Pressable
                        style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }, { alignItems: 'flex-end' }]}
                        onPress={resetBubbles}
                    >
                        <FontAwesome name="refresh" size={16} color={Colors.textMuted} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    <View key={key} style={s.grid}>
                        {bubbles.map((b) => (
                            <Bubble key={b.id} size={b.size} marginOffset={b.marginOffset} hueOffset={b.hueOffset} onPop={handlePop} />
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090912' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, zIndex: 10 },
    backBtn: { width: 44, height: 44, justifyContent: 'center' },
    headerCenter: { alignItems: 'center', flex: 1, marginHorizontal: Spacing.md },
    headerTitle: { fontSize: 11, fontFamily: FF, fontWeight: '900', color: Colors.gold, marginBottom: 8, letterSpacing: 3 },
    progressTrack: { width: '60%', height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.gold },

    scroll: { padding: Spacing.xl, alignItems: 'center', paddingBottom: 100 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', gap: 4 },

    bubblePressable: {
        flex: 1,
        borderRadius: 999,
        backgroundColor: 'rgba(20,20,30,0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    bubblePoppedBackdrop: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
    }
});

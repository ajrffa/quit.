import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily } from '../../constants/Theme';
import Animated, { FadeIn, useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Canvas, Circle, SweepGradient, vec, Blur, Paint, Group, Rect, LinearGradient } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');
const FF = FontFamily.sans;

// Local asset – opsiyonel: assets/audio/meditation.mp3 klasörüne koyunca aktif olur.
// Dosya yoksa uygulama çökmez, sessiz çalışır.
let AUDIO_SOURCE: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AUDIO_SOURCE = require('../../assets/audio/meditation.mp3');
} catch (_) {
    // Seş dosyası henüz eklenmemiş, sessiz modda çalışır
}
const CENTER = { x: width / 2, y: height * 0.4 };
const RADIUS = width * 0.35;

// Generate some random stars for the background
const NUM_STARS = 40;
const stars = Array.from({ length: NUM_STARS }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.05 + 0.01
}));

export default function MeditateScreen() {
    const router = useRouter();
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Animations
    const rotation = useSharedValue(0);
    const pulse = useSharedValue(0);
    const starTime = useSharedValue(0);

    useEffect(() => {
        // Continuous slow rotation
        rotation.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 8000, easing: Easing.linear }),
            -1
        );

        // Star twinkling time
        starTime.value = withRepeat(
            withTiming(100, { duration: 50000, easing: Easing.linear }),
            -1
        );

        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
        });

        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    useEffect(() => {
        if (isPlaying) {
            pulse.value = withRepeat(
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulse.value = withTiming(0, { duration: 1000 });
        }
    }, [isPlaying]);

    const togglePlay = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (!sound) {
                if (!AUDIO_SOURCE) {
                    // Ses dosyası yok, sadece animasyonu göster
                    setIsPlaying(true);
                    setIsLoaded(true);
                    return;
                }
                const { sound: newSound } = await Audio.Sound.createAsync(
                    AUDIO_SOURCE,
                    { shouldPlay: true, isLooping: true }
                );
                setSound(newSound);
                setIsPlaying(true);
                setIsLoaded(true);
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error("Failed to load or play audio", error);
        }
    };

    // Derived values for Skia
    const transform = useDerivedValue(() => [{ rotate: rotation.value }]);
    const ringBlur = useDerivedValue(() => 10 + pulse.value * 15);
    const ringWidth = useDerivedValue(() => 4 + pulse.value * 6);

    // For stars we just pass the shared value directly and do the math in the render or pass derived
    const backgroundColors = useDerivedValue(() => {
        return ['#0a0a0a', isPlaying ? '#1a1a2e' : '#0a0a0a'];
    });

    return (
        <View style={s.container}>
            {/* Skia Background Layer */}
            <View style={StyleSheet.absoluteFill}>
                <Canvas style={{ flex: 1 }}>
                    <Rect x={0} y={0} width={width} height={height}>
                        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#05050A', '#1A1A24']} />
                    </Rect>

                    {/* Static Stars that twinkle slightly with global opacity */}
                    {stars.map((star, i) => (
                        <Circle key={i} cx={star.x} cy={star.y} r={star.r} color="rgba(255,255,255,0.4)">
                            <Paint>
                                <Blur blur={1} />
                            </Paint>
                        </Circle>
                    ))}

                    <Group origin={CENTER} transform={transform}>
                        {/* Glowing Ring */}
                        <Circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} style="stroke" strokeWidth={ringWidth}>
                            <Paint>
                                <Blur blur={ringBlur} />
                                <SweepGradient
                                    c={vec(CENTER.x, CENTER.y)}
                                    colors={['rgba(212,175,55,0)', Colors.gold, 'rgba(255,255,255,0.8)', 'rgba(212,175,55,0)']}
                                />
                            </Paint>
                        </Circle>
                        {/* Sharp Inner Ring */}
                        <Circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} style="stroke" strokeWidth={2}>
                            <Paint>
                                <SweepGradient
                                    c={vec(CENTER.x, CENTER.y)}
                                    colors={['rgba(212,175,55,0.1)', Colors.gold, 'rgba(212,175,55,0.1)']}
                                />
                            </Paint>
                        </Circle>
                    </Group>
                </Canvas>
            </View>

            <SafeAreaView style={s.safeArea}>
                <Animated.View entering={FadeIn.duration(400)} style={s.headerRow}>
                    <Pressable onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (sound) sound.unloadAsync();
                        router.back();
                    }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]} hitSlop={20}>
                        <FontAwesome name="angle-down" size={32} color={Colors.textMuted} />
                    </Pressable>
                    <Text style={s.brand}>soundscape.</Text>
                    <View style={{ width: 44 }} />
                </Animated.View>

                <View style={s.content}>
                    {/* The play button sits perfectly inside the Skia ring */}
                    <View style={s.centerControls}>
                        <Pressable
                            style={({ pressed }) => [s.playBtn, pressed && { transform: [{ scale: 0.95 }] }]}
                            onPress={togglePlay}
                        >
                            <FontAwesome
                                name={isPlaying ? "pause" : "play"}
                                size={32}
                                color={Colors.background}
                                style={{ marginLeft: isPlaying ? 0 : 6 }}
                            />
                        </Pressable>
                    </View>

                    <View style={s.textContainer}>
                        <Animated.Text entering={FadeIn.delay(200)} style={s.title}>Deep Resonance</Animated.Text>
                        <Animated.Text entering={FadeIn.delay(400)} style={s.subtitle}>
                            Close your eyes. Focus entirely on the frequency of the sound. Let it anchor you to the present moment.
                        </Animated.Text>
                        <Animated.Text entering={FadeIn.delay(600)} style={s.statusText}>
                            {isPlaying ? "Playing (Background Audio ON)" : (isLoaded ? "Paused" : "Tap to Begin")}
                        </Animated.Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05050A' },
    safeArea: { flex: 1 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.md,
        zIndex: 10
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    brand: { fontSize: FontSize.md, color: Colors.gold, letterSpacing: 1, fontFamily: FF },

    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        position: 'relative'
    },
    centerControls: {
        position: 'absolute',
        top: height * 0.4 - 40 - 100, // Roughly matching CENTER.y from skia minus half button height minus safe area approx
        width: width,
        alignItems: 'center',
    },
    playBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    },
    textContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 32,
        color: '#FFF',
        fontFamily: FF,
        fontWeight: '300',
        marginBottom: Spacing.md,
        letterSpacing: 4,
        textTransform: 'uppercase'
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        fontFamily: FF,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: Spacing.xl
    },
    statusText: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        fontFamily: FF,
        letterSpacing: 1,
        textTransform: 'uppercase'
    }
});

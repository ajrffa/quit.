import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily } from '../../constants/Theme';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    FadeIn,
    FadeOut,
    useDerivedValue,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Canvas, Circle, SweepGradient, vec, Blur, Paint, Group } from '@shopify/react-native-skia';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

const PHASES = ['INHALE', 'HOLD', 'EXHALE', 'HOLD'];
const PHASE_DURATION_MS = 4000;
const MAX_RADIUS = width * 0.35;
const MIN_RADIUS = width * 0.15;
const CENTER = { x: width / 2, y: width / 2 + 50 }; // Offset a bit

export default function BreatheScreen() {
    const router = useRouter();
    const [phaseIndex, setPhaseIndex] = useState(0);
    const radius = useSharedValue(MIN_RADIUS);
    const blurAmount = useSharedValue(15);
    const rotation = useSharedValue(0);

    const [sounds, setSounds] = useState<{ inhale?: Audio.Sound, hold?: Audio.Sound, exhale?: Audio.Sound }>({});

    useEffect(() => {
        // Load Audio Files
        async function loadSounds() {
            try {
                const { sound: inhale } = await Audio.Sound.createAsync(require('../../assets/audio/inhale.mp3'));
                const { sound: hold } = await Audio.Sound.createAsync(require('../../assets/audio/hold.mp3'));
                const { sound: exhale } = await Audio.Sound.createAsync(require('../../assets/audio/exhale.mp3'));

                // Configure Audio session
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                setSounds({ inhale, hold, exhale });
            } catch (err) {
                console.log("Audio load error (Breathe): ", err);
            }
        }
        loadSounds();

        return () => {
            // Cleanup audio
            if (sounds.inhale) sounds.inhale.unloadAsync();
            if (sounds.hold) sounds.hold.unloadAsync();
            if (sounds.exhale) sounds.exhale.unloadAsync();
        };
    }, []);

    useEffect(() => {
        // Continuous slow rotation for the organic feel, but more animated (faster)
        rotation.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 6000, easing: Easing.linear }),
            -1
        );

        // Breathing Sequence
        radius.value = withRepeat(
            withSequence(
                // Inhale
                withTiming(MAX_RADIUS, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
                // Hold
                withTiming(MAX_RADIUS, { duration: PHASE_DURATION_MS }),
                // Exhale
                withTiming(MIN_RADIUS, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
                // Hold
                withTiming(MIN_RADIUS, { duration: PHASE_DURATION_MS })
            ),
            -1
        );

        // Blur pulses differently to create a "glowing" effect
        blurAmount.value = withRepeat(
            withSequence(
                withTiming(30, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
                withTiming(40, { duration: PHASE_DURATION_MS }),
                withTiming(15, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
                withTiming(10, { duration: PHASE_DURATION_MS })
            ),
            -1
        );

        // State Tracking for text & haptics & audio
        const intervalId = setInterval(() => {
            setPhaseIndex((prev) => {
                const next = (prev + 1) % 4;

                // Haptics & Audio based on phase
                if (next === 0) { // Inhale
                    sounds.inhale?.replayAsync();
                } else if (next === 1 || next === 3) { // Hold
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    sounds.hold?.replayAsync();
                } else if (next === 2) { // Exhale
                    sounds.exhale?.replayAsync();
                }

                return next;
            });
        }, PHASE_DURATION_MS);

        // Play initial audio on start
        sounds.inhale?.replayAsync();

        return () => clearInterval(intervalId);
    }, [sounds]);

    // Independent effect for continuous haptics during inhale
    useEffect(() => {
        let vibeInterval: ReturnType<typeof setInterval>;
        if (phaseIndex === 0) {
            // Heartbeat/shaking rhythm during inhale
            vibeInterval = setInterval(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            }, 400);
        } else if (phaseIndex === 2) {
            // Soft release at the start of exhale
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        return () => {
            if (vibeInterval) clearInterval(vibeInterval);
        };
    }, [phaseIndex]);

    // Derived values for Skia transforms
    const transform = useDerivedValue(() => {
        return [{ rotate: rotation.value }];
    });
    const cRadius = useDerivedValue(() => radius.value);
    const cBlur = useDerivedValue(() => blurAmount.value);
    const cRadiusInner = useDerivedValue(() => radius.value * 0.8);

    return (
        <SafeAreaView style={s.container}>
            {/* Background Canvas for Skia Graphics */}
            <View style={StyleSheet.absoluteFill}>
                <Canvas style={{ flex: 1 }}>
                    <Group origin={CENTER} transform={transform}>
                        {/* Outer Glow */}
                        <Circle cx={CENTER.x} cy={CENTER.y} r={cRadius}>
                            <Paint>
                                <Blur blur={cBlur} />
                                <SweepGradient
                                    c={vec(CENTER.x, CENTER.y)}
                                    colors={['rgba(0,255,200,0.4)', 'rgba(100,50,255,0.4)', 'rgba(255,50,100,0.4)', 'rgba(0,255,200,0.4)']}
                                />
                            </Paint>
                        </Circle>
                        {/* Inner Core */}
                        <Circle cx={CENTER.x} cy={CENTER.y} r={cRadiusInner}>
                            <Paint>
                                <Blur blur={10} />
                                <SweepGradient
                                    c={vec(CENTER.x, CENTER.y)}
                                    colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)']}
                                />
                            </Paint>
                        </Circle>
                    </Group>
                </Canvas>
            </View>

            {/* UI Overlay — flex column, no absolute positioning */}
            <Animated.View entering={FadeIn.duration(600)} style={s.headerRow}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]} hitSlop={20}>
                    <FontAwesome name="chevron-left" size={16} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.brand}>quell your urge.</Text>
                <View style={{ width: 44 }} />
            </Animated.View>

            {/* Instruction text top */}
            <View style={s.topInstructions}>
                <Text style={s.instructionText}>
                    Listen to the guide and follow the orb.{'\n'}Inhale, hold, exhale, hold.
                </Text>
            </View>

            {/* Orb area — flex: 1 to fill remaining space, phase text centered below */}
            <View style={s.orbArea}>
                <Animated.Text
                    key={PHASES[phaseIndex]}
                    entering={FadeIn.duration(800)}
                    exiting={FadeOut.duration(800)}
                    style={s.phaseText}
                >
                    {PHASES[phaseIndex]}
                </Animated.Text>
            </View>

            <View style={s.footer}>
                <Text style={s.footerText}>CLINICAL BOX BREATHING (4-4-4-4)</Text>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090912' },
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

    topInstructions: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        zIndex: 10,
    },
    instructionText: {
        fontSize: FontSize.md,
        color: Colors.textMuted,
        textAlign: 'center',
        fontFamily: FF,
        lineHeight: 24,
        letterSpacing: 0.5,
    },

    // flex:1 container that holds phase text anchored to center/bottom of the orb
    orbArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 60,
        zIndex: 10,
        pointerEvents: 'none',
    },
    phaseText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 10,
        fontFamily: FF,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    footer: {
        paddingBottom: Spacing.xxl + 20,
        alignItems: 'center',
        zIndex: 10
    },
    footerText: {
        fontSize: 10,
        color: Colors.textDim,
        fontFamily: FF,
        letterSpacing: 3,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    }
});

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontFamily, BorderRadius } from '../../constants/Theme';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    useDerivedValue,
    withSpring,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Canvas, Rect, RoundedRect, Circle, SweepGradient, vec, Blur, Paint, Group, LinearGradient } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');
const FF = FontFamily.sans;

// Premium Game Constants
const SHIP_SIZE = 40;
const ENEMY_SIZE = 45;
const LASER_WIDTH = 6;
const LASER_HEIGHT = 24;

const MAX_ENEMIES = 12;
const SPAWN_RATE_MS = 600; // Faster spawns
const FIRE_RATE_MS = 100; // Machine-gun lasers

type GameObject = {
    id: number;
    x: number;
    y: number;
    active: boolean;
    speed: number;
    health?: number;
    type?: 'basic' | 'heavy' | 'fast';
};

export default function SpaceShooterScreen() {
    const router = useRouter();

    // High Level State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER'>('START');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [sounds, setSounds] = useState<{ laser?: Audio.Sound, explosion?: Audio.Sound }>({});

    // Load Audio
    useEffect(() => {
        async function loadSounds() {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });
                const { sound: laser } = await Audio.Sound.createAsync(require('../../assets/audio/laser.ogg'));
                const { sound: explosion } = await Audio.Sound.createAsync(require('../../assets/audio/explosion.ogg'));
                setSounds({ laser, explosion });
            } catch (e) {
                console.log("Audio load error (optional feature):", e);
            }
        }
        loadSounds();
        return () => {
            sounds.laser?.unloadAsync();
            sounds.explosion?.unloadAsync();
        };
    }, []);

    // Ship position (Driven by PanGesture & Reanimated)
    const shipX = useSharedValue(width / 2 - SHIP_SIZE / 2);
    const shipY = useSharedValue(height - 150);
    const shipTilt = useSharedValue(0); // Tilts when moving left/right

    const shipStartX = useSharedValue(0);
    const shipStartY = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            shipStartX.value = shipX.value;
            shipStartY.value = shipY.value;
        })
        .onUpdate((e) => {
            if (gameState !== 'PLAYING') return;
            // Bound inside screen
            shipX.value = Math.max(10, Math.min(width - SHIP_SIZE - 10, shipStartX.value + e.translationX));
            shipY.value = Math.max(100, Math.min(height - SHIP_SIZE - 10, shipStartY.value + e.translationY));

            // Tilt physics based on horizontal movement velocity
            shipTilt.value = withSpring(Math.max(-0.5, Math.min(0.5, e.velocityX * 0.001)), { damping: 15 });
        })
        .onEnd(() => {
            shipTilt.value = withSpring(0);
        });

    // --- GAME ENGINE LOOP (JS Thread feeding Skia) ---
    const [enemies, setEnemies] = useState<GameObject[]>([]);
    const [lasers, setLasers] = useState<GameObject[]>([]);
    const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string, vx: number, vy: number, life: number }[]>([]);

    const isPlayingRef = React.useRef(false);
    const scoreRef = React.useRef(0);
    const engineRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    // Particle/Physics updates
    useEffect(() => {
        if (particles.length > 0 && gameState === 'PLAYING') {
            const timeout = setTimeout(() => {
                setParticles(prev =>
                    prev.map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        life: p.life - 0.1
                    })).filter(p => p.life > 0)
                );
            }, 30);
            return () => clearTimeout(timeout);
        }
    }, [particles, gameState]);

    // Main Physics Loop
    const gameLoop = useCallback(() => {
        if (!isPlayingRef.current) return;

        setEnemies(prevEnemies => {
            let nextEnemies = prevEnemies.map(e => ({ ...e, y: e.y + e.speed }));
            nextEnemies = nextEnemies.filter(e => e.y < height + 50);

            // Spawn Logic
            const spawnChance = 0.04 + (scoreRef.current * 0.0005);
            if (nextEnemies.length < MAX_ENEMIES && Math.random() < spawnChance) {
                const typeRand = Math.random();
                let type: 'basic' | 'heavy' | 'fast' = 'basic';
                let speed = 4 + Math.random() * 3 + (scoreRef.current * 0.01);
                let health = 1;

                if (scoreRef.current > 500 && typeRand > 0.8) {
                    type = 'heavy'; speed *= 0.6; health = 3;
                } else if (scoreRef.current > 200 && typeRand > 0.6) {
                    type = 'fast'; speed *= 1.5;
                }

                nextEnemies.push({
                    id: Date.now() + Math.random(),
                    x: Math.random() * (width - ENEMY_SIZE),
                    y: -ENEMY_SIZE,
                    active: true,
                    speed,
                    health,
                    type
                });
            }
            return nextEnemies;
        });

        setLasers(prevLasers => {
            return prevLasers
                .map(l => ({ ...l, y: l.y - l.speed }))
                .filter(l => l.y > -50);
        });

        // Collision Checks
        setEnemies(currentEnemies => {
            let freshEnemies = [...currentEnemies];

            setLasers(currentLasers => {
                let freshLasers = [...currentLasers];
                let pointsEarned = 0;
                let newParticles: any[] = [];

                for (let i = freshLasers.length - 1; i >= 0; i--) {
                    let laser = freshLasers[i];
                    for (let j = freshEnemies.length - 1; j >= 0; j--) {
                        let enemy = freshEnemies[j];

                        // AABB 
                        if (
                            laser.x < enemy.x + ENEMY_SIZE &&
                            laser.x + LASER_WIDTH > enemy.x &&
                            laser.y < enemy.y + ENEMY_SIZE &&
                            laser.y + LASER_HEIGHT > enemy.y
                        ) {
                            freshLasers.splice(i, 1);
                            enemy.health! -= 1;

                            if (enemy.health! <= 0) {
                                freshEnemies.splice(j, 1);
                                pointsEarned += enemy.type === 'heavy' ? 30 : enemy.type === 'fast' ? 20 : 10;

                                // Spawn rich particles
                                const color = enemy.type === 'heavy' ? '#FF2222' : enemy.type === 'fast' ? '#FFCC00' : '#FF3366';
                                for (let k = 0; k < 25; k++) { // Huge explosion
                                    newParticles.push({
                                        id: Date.now() + Math.random(),
                                        x: enemy.x + ENEMY_SIZE / 2,
                                        y: enemy.y + ENEMY_SIZE / 2,
                                        vx: (Math.random() - 0.5) * 35, // Faster spread
                                        vy: (Math.random() - 0.5) * 35,
                                        color,
                                        life: 1
                                    });
                                }
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                                // Play explosion sound
                                sounds.explosion?.replayAsync();
                            } else {
                                // Hit but not destroyed
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            }
                            break;
                        }
                    }
                }

                if (newParticles.length > 0) {
                    setParticles(p => [...p, ...newParticles].slice(-150)); // Allow more particles to exist
                }

                if (pointsEarned > 0) {
                    scoreRef.current += pointsEarned;
                    setScore(scoreRef.current);
                }
                return freshLasers;
            });

            // Player Collision Check
            const sx = shipX.value;
            const sy = shipY.value;
            const HITBOX_REDUCTION = 8;

            for (let e of freshEnemies) {
                if (
                    e.x + HITBOX_REDUCTION < sx + SHIP_SIZE &&
                    e.x + ENEMY_SIZE - HITBOX_REDUCTION > sx &&
                    e.y + HITBOX_REDUCTION < sy + SHIP_SIZE &&
                    e.y + ENEMY_SIZE - HITBOX_REDUCTION > sy
                ) {
                    handleGameOver();
                    break;
                }
            }

            return freshEnemies;
        });

    }, []);

    // Firing Loop
    useEffect(() => {
        let fireInterval: ReturnType<typeof setInterval>;
        if (gameState === 'PLAYING') {
            fireInterval = setInterval(() => {
                setLasers(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        x: shipX.value + SHIP_SIZE / 2 - LASER_WIDTH / 2,
                        y: shipY.value,
                        active: true,
                        speed: 25 // Fast lasers
                    }
                ]);
                // Play subtle laser sound
                sounds.laser?.replayAsync().catch(() => { });
            }, FIRE_RATE_MS);
        }
        return () => clearInterval(fireInterval);
    }, [gameState]);

    // Engine Heartbeat (60hz)
    useEffect(() => {
        if (gameState === 'PLAYING') {
            engineRef.current = setInterval(gameLoop, 16);
        } else if (engineRef.current) {
            clearInterval(engineRef.current);
        }
        return () => {
            if (engineRef.current) clearInterval(engineRef.current);
        };
    }, [gameState, gameLoop]);

    const handleGameOver = () => {
        if (!isPlayingRef.current) return;
        isPlayingRef.current = false;
        setGameState('GAME_OVER');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
        }
    };

    const startGame = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setEnemies([]);
        setLasers([]);
        setParticles([]);
        scoreRef.current = 0;
        setScore(0);

        shipX.value = width / 2 - SHIP_SIZE / 2;
        shipY.value = height - 150;
        shipTilt.value = 0;

        isPlayingRef.current = true;
        setGameState('PLAYING');
    };

    // --- Skia Animated Values derived from Reanimated ---
    const sShipX = useDerivedValue(() => shipX.value);
    const sShipY = useDerivedValue(() => shipY.value);

    // Engine Exhaust Animation
    const exhaustPhase = useSharedValue(0);
    useEffect(() => {
        exhaustPhase.value = withRepeat(withTiming(1, { duration: 100, easing: Easing.linear }), -1, true);
    }, []);
    const sExhaustOpacity = useDerivedValue(() => 0.5 + Math.random() * 0.5); // Flickering
    const sExhaustHeight = useDerivedValue(() => 20 + exhaustPhase.value * 15);

    // Parallax Star Background
    const bgY1 = useSharedValue(0);
    const bgY2 = useSharedValue(-height);

    useEffect(() => {
        // Warp speed: drop duration from 2000 to 400
        bgY1.value = withRepeat(withTiming(height, { duration: 400, easing: Easing.linear }), -1, false);
        bgY2.value = withRepeat(withTiming(0, { duration: 400, easing: Easing.linear }), -1, false);
    }, []);

    const starsStyle1 = useAnimatedStyle(() => ({ transform: [{ translateY: bgY1.value }] }));
    const starsStyle2 = useAnimatedStyle(() => ({ transform: [{ translateY: bgY2.value }] }));

    return (
        <GestureHandlerRootView style={s.container}>
            <View style={s.topBar}>
                <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={20}>
                    <FontAwesome name="chevron-left" size={16} color="rgba(255,255,255,0.7)" />
                </Pressable>

                <View style={s.scoreContainer}>
                    <View style={s.scoreBox}>
                        <Text style={s.scoreLabel}>SCORE</Text>
                        <Text style={s.scoreText}>{score}</Text>
                    </View>
                    <View style={s.scoreBox}>
                        <Text style={s.scoreLabel}>BEST</Text>
                        <Text style={[s.scoreText, { color: Colors.gold }]}>{highScore}</Text>
                    </View>
                </View>
            </View>

            {/* Background Parallax */}
            <Animated.View style={[s.starsLayer, starsStyle1]}>
                <View style={[s.star, { left: 40, top: 100 }]} />
                <View style={[s.star, { left: 200, top: 400, width: 3, height: 3 }]} />
                <View style={[s.star, { left: width - 50, top: 200 }]} />
                <View style={[s.star, { left: 100, top: 600, width: 4, height: 4, backgroundColor: '#0FF' }]} />
                <View style={[s.star, { left: 300, top: 800, width: 2, height: 2, backgroundColor: '#FF3366' }]} />
            </Animated.View>
            <Animated.View style={[s.starsLayer, starsStyle2]}>
                <View style={[s.star, { left: 80, top: 150 }]} />
                <View style={[s.star, { left: width - 80, top: 500, width: 3, height: 3 }]} />
                <View style={[s.star, { left: 150, top: 300, backgroundColor: '#FFCC00' }]} />
            </Animated.View>


            <GestureDetector gesture={panGesture}>
                <View style={s.gameArea}>
                    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">

                        {/* Render Lasers with Neon Glow */}
                        {lasers.map(l => (
                            <Group key={'laser' + l.id}>
                                <RoundedRect x={l.x} y={l.y} width={LASER_WIDTH} height={LASER_HEIGHT} color="#0FF" r={4}>
                                    <Paint>
                                        <Blur blur={5} />
                                    </Paint>
                                </RoundedRect>
                                <RoundedRect x={l.x + 1} y={l.y + 2} width={LASER_WIDTH - 2} height={LASER_HEIGHT - 4} color="#FFF" r={2} />
                            </Group>
                        ))}

                        {/* Render Enemies */}
                        {enemies.map(e => {
                            const isHeavy = e.type === 'heavy';
                            const isFast = e.type === 'fast';
                            const color = isHeavy ? '#FF2222' : isFast ? '#FFCC00' : '#FF3366';
                            const glow = isHeavy ? 15 : 8;

                            return (
                                <Group key={'enemy' + e.id} origin={{ x: e.x + ENEMY_SIZE / 2, y: e.y + ENEMY_SIZE / 2 }} transform={[{ rotate: isFast ? Math.PI : Math.PI / 4 }]}>
                                    <RoundedRect x={e.x} y={e.y} width={ENEMY_SIZE} height={ENEMY_SIZE} color="rgba(20, 20, 30, 0.9)" r={8}>
                                        <Paint style="stroke" strokeWidth={isHeavy ? 4 : 2} color={color}>
                                            <Blur blur={glow} />
                                        </Paint>
                                    </RoundedRect>
                                    <RoundedRect x={e.x + 5} y={e.y + 5} width={ENEMY_SIZE - 10} height={ENEMY_SIZE - 10} color={color} r={5} opacity={isHeavy ? 0.4 : 0.8} />
                                </Group>
                            );
                        })}

                        {/* Render Particles */}
                        {particles.map(p => (
                            <Circle key={'particle' + p.id} cx={p.x} cy={p.y} r={p.life * 6} color={p.color}>
                                <Paint>
                                    <Blur blur={4} />
                                </Paint>
                            </Circle>
                        ))}

                    </Canvas>

                    {/* Render Player Ship (DOM overlay for easy gesture sync and complex view styling) */}
                    {/* Note: In a pure Skia implementation this would also be on the Canvas, but keeping it as a View simplifies PanGesture tracking */}
                    <Animated.View style={[s.ship, useAnimatedStyle(() => ({
                        transform: [
                            { translateX: shipX.value },
                            { translateY: shipY.value },
                            { rotateZ: `${shipTilt.value}rad` }
                        ]
                    }))]}>
                        {/* Premium Glassmorphic Ship Body */}
                        <View style={s.shipCore} />
                        <View style={s.shipWingLeft} />
                        <View style={s.shipWingRight} />

                        {/* Skia Driven Exhaust underneath ship view */}
                        {gameState === 'PLAYING' && (
                            <Canvas style={{ position: 'absolute', bottom: -40, width: 40, height: 50, zIndex: -1 }}>
                                <RoundedRect
                                    x={12}
                                    y={0}
                                    width={16}
                                    height={20 /* placeholder height */}
                                    color="#0FF"
                                    r={8}
                                >
                                    {/* Workaround for dynamic height in older Skia */}
                                    <Paint>
                                        <Blur blur={5} />
                                    </Paint>
                                </RoundedRect>
                            </Canvas>
                        )}

                        {/* Inner glowing core */}
                        <View style={s.shipCockpit} />
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Overlays */}
            {gameState === 'START' && (
                <View style={s.overlay}>
                    {/* Glassmorphic Panel */}
                    <View style={s.glassPanel}>
                        <FontAwesome name="rocket" size={48} color="#0FF" style={{ marginBottom: Spacing.xl }} />
                        <Text style={s.title}>NEON SURF</Text>
                        <Text style={s.subtitle}>Deep space intercept.</Text>
                        <Text style={s.subtitle2}>Drag to maneuver. Auto-fire engaged.</Text>

                        <Pressable style={s.launchBtn} onPress={startGame}>
                            <Text style={s.launchBtnText}>ENGAGE</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {gameState === 'GAME_OVER' && (
                <View style={s.overlay}>
                    <View style={[s.glassPanel, { borderColor: 'rgba(255, 51, 102, 0.3)' }]}>
                        <FontAwesome name="warning" size={48} color="#FF3366" style={{ marginBottom: Spacing.lg }} />
                        <Text style={s.titleGameOver}>SYSTEM FAILURE</Text>
                        <Text style={s.scoreFinal}>SCORE: {score}</Text>
                        {score >= highScore && score > 0 && <Text style={s.newHighScore}>NEW HIGH SCORE</Text>}
                        <Pressable style={[s.launchBtn, { borderColor: '#FF3366' }]} onPress={startGame}>
                            <Text style={[s.launchBtnText, { color: '#FF3366' }]}>REBOOT</Text>
                        </Pressable>
                    </View>
                </View>
            )}

        </GestureHandlerRootView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05050A', paddingTop: 50 }, // Deep void black/blue

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, zIndex: 100 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    scoreContainer: { flexDirection: 'row', gap: Spacing.md },
    scoreBox: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.sm, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minWidth: 80 },
    scoreLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: FontFamily.sans, fontWeight: 'bold', letterSpacing: 2 },
    scoreText: { color: '#FFF', fontSize: 18, fontFamily: FontFamily.sans, fontWeight: 'bold', letterSpacing: 1 },

    gameArea: { flex: 1, position: 'relative' },

    // Game Objects (Ship rendered via React Native for easy gesture link + glassmorphism)
    ship: { position: 'absolute', width: SHIP_SIZE, height: SHIP_SIZE, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    shipCore: { width: 12, height: 38, backgroundColor: '#FFF', borderRadius: 10, shadowColor: '#0FF', shadowOpacity: 1, shadowRadius: 20, elevation: 10, zIndex: 2 },
    shipWingLeft: { position: 'absolute', left: 4, bottom: -2, width: 20, height: 28, backgroundColor: 'rgba(0, 255, 200, 0.4)', borderBottomLeftRadius: 10, borderTopLeftRadius: 30, transform: [{ rotate: '-25deg' }], borderWidth: 1, borderColor: '#0FF', zIndex: 1 },
    shipWingRight: { position: 'absolute', right: 4, bottom: -2, width: 20, height: 28, backgroundColor: 'rgba(0, 255, 200, 0.4)', borderBottomRightRadius: 10, borderTopRightRadius: 30, transform: [{ rotate: '25deg' }], borderWidth: 1, borderColor: '#0FF', zIndex: 1 },
    shipCockpit: { position: 'absolute', top: 8, width: 6, height: 12, backgroundColor: '#0FF', borderRadius: 3, zIndex: 3 },

    // Environment
    starsLayer: { position: 'absolute', width: width, height: height, top: 0, left: 0, zIndex: -1 },
    star: { position: 'absolute', width: 2, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },

    // Overlays
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 5, 10, 0.85)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, zIndex: 999 },
    glassPanel: {
        width: '100%',
        padding: Spacing.xxl,
        backgroundColor: 'rgba(20, 20, 30, 0.60)',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.2)',
        alignItems: 'center',
        shadowColor: '#0FF',
        shadowOpacity: 0.1,
        shadowRadius: 30
    },
    title: { fontSize: 36, fontFamily: FontFamily.sans, fontWeight: '900', color: '#FFF', marginBottom: Spacing.sm, letterSpacing: 6, textTransform: 'uppercase', textAlign: 'center' },
    subtitle: { fontSize: FontSize.md, fontFamily: FontFamily.sans, color: '#0FF', marginBottom: Spacing.md, textAlign: 'center', letterSpacing: 2 },
    subtitle2: { fontSize: FontSize.sm, fontFamily: FontFamily.sans, color: Colors.textMuted, marginBottom: Spacing.xxl, textAlign: 'center', lineHeight: 22 },

    titleGameOver: { fontSize: 32, fontFamily: FontFamily.sans, fontWeight: '900', color: '#FFF', marginBottom: Spacing.lg, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center' },
    scoreFinal: { fontSize: FontSize.xl, fontFamily: FontFamily.sans, color: '#FFF', fontWeight: 'bold', marginBottom: Spacing.xs, letterSpacing: 2 },
    newHighScore: { fontSize: FontSize.xs, fontFamily: FontFamily.sans, color: '#FF3366', fontWeight: 'bold', marginBottom: Spacing.lg, letterSpacing: 2, textTransform: 'uppercase' },

    launchBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#0FF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 50, width: '100%', alignItems: 'center' },
    launchBtnText: { color: '#0FF', fontSize: FontSize.md, fontFamily: FontFamily.sans, fontWeight: 'bold', letterSpacing: 4 },
});

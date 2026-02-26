import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useHabitStore, CopingStrategy } from '../../stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
// We will create StrategyModal in a moment
import { StrategyModal } from '../../components/ui/StrategyModal';
import { AddStrategyModal } from '../../components/ui/AddStrategyModal';

const FF = FontFamily.sans;
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_MARGIN = Spacing.sm;
const CARD_WIDTH = (width - (Spacing.lg * 2) - (CARD_MARGIN * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

export default function ActivitiesScreen() {
    const { activeHabit, copingStrategies, restoreDefaultStrategies } = useHabitStore();
    const router = useRouter();
    const [selectedStrategy, setSelectedStrategy] = useState<CopingStrategy | null>(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    // Auto-migrate users to the new interactive lists
    useEffect(() => {
        const hasShredder = copingStrategies.find(s => s.route === '/tools/shredder');
        const hasPixelArt = copingStrategies.find(s => s.route === '/tools/pixel');
        const hasSurf = copingStrategies.find(s => s.route === '/tools/surf');

        if (!hasShredder || !hasPixelArt || !hasSurf) {
            restoreDefaultStrategies();
        }
    }, [copingStrategies, restoreDefaultStrategies]);

    if (!activeHabit) return null;

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                    <View style={s.header}>
                        <Text style={s.headerTitle}>Today</Text>
                        <Text style={s.headerSubtitle}>Productivity and Coping Modules</Text>
                    </View>

                    {/* TOP ACTION: AI Emergency Protocol */}
                    <Animated.View entering={FadeInUp.delay(100).duration(800)}>
                        <Pressable
                            style={({ pressed }) => [s.emergencyCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                router.push('/chat');
                            }}
                        >
                            <View style={s.emergencyContent}>
                                <View style={s.emergencyHeader}>
                                    <View style={s.emergencyIconBox}>
                                        <FontAwesome name="bolt" size={24} color={Colors.background} />
                                    </View>
                                    <View style={s.emergencyTexts}>
                                        <Text style={s.emergencyTitle}>Emergency Override</Text>
                                        <Text style={s.emergencyDesc}>Talk it out with your AI Companion</Text>
                                    </View>
                                </View>
                                <FontAwesome name="angle-right" size={28} color={Colors.background} style={{ opacity: 0.5 }} />
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* COPING TOOLKIT */}
                    <Animated.View entering={FadeInUp.delay(200).duration(800)} style={s.toolkitSection}>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Tactical Interventions</Text>
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsAddModalVisible(true);
                                }}
                                style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                            >
                                <FontAwesome name="plus" size={16} color={Colors.gold} />
                            </Pressable>
                        </View>

                        <View style={s.grid}>
                            {copingStrategies.map((strategy, index) => (
                                <Pressable
                                    key={strategy.id}
                                    style={({ pressed }) => [s.strategyCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedStrategy(strategy);
                                    }}
                                >
                                    <View style={s.strategyIconBox}>
                                        <FontAwesome name={strategy.icon} size={24} color={Colors.gold} />
                                    </View>
                                    <Text style={s.strategyTitle} numberOfLines={2}>
                                        {strategy.title}
                                    </Text>
                                    {strategy.durationMinutes && (
                                        <View style={s.durationBadge}>
                                            <FontAwesome name="clock-o" size={10} color={Colors.gold} style={{ marginRight: 4 }} />
                                            <Text style={s.durationText}>{strategy.durationMinutes} min</Text>
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>

                </ScrollView>
            </SafeAreaView>

            {/* Strategy Detail Modal */}
            <StrategyModal
                visible={!!selectedStrategy}
                strategy={selectedStrategy}
                onClose={() => setSelectedStrategy(null)}
            />

            {/* Add Custom Strategy Modal */}
            <AddStrategyModal
                visible={isAddModalVisible}
                onClose={() => setIsAddModalVisible(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    safeArea: { flex: 1 },
    scroll: { padding: Spacing.lg, paddingBottom: 100 },

    header: { marginBottom: Spacing.xl },
    headerTitle: { fontSize: FontSize.hero, fontWeight: FontWeight.light, color: Colors.text, letterSpacing: -1, fontFamily: FF },
    headerSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, letterSpacing: 1, marginTop: 4, fontFamily: FF },

    // Emergency Box (AI Companion)
    emergencyCard: {
        backgroundColor: Colors.gold,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xxl,
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8
    },
    emergencyContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    emergencyIconBox: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(20,20,20,0.2)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: Spacing.md
    },
    emergencyTexts: { flex: 1 },
    emergencyTitle: { color: Colors.background, fontSize: FontSize.lg, fontFamily: FF, fontWeight: 'bold', marginBottom: 2 },
    emergencyDesc: { color: 'rgba(20,20,20,0.7)', fontSize: FontSize.sm, fontFamily: FF, fontWeight: '500' },

    // Toolkit Section
    toolkitSection: { flex: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.sm, color: Colors.textDim, fontFamily: FF, letterSpacing: 1, textTransform: 'uppercase' },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: CARD_MARGIN
    },
    strategyCard: {
        width: CARD_WIDTH,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center'
    },
    strategyIconBox: {
        width: 56, height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gold + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md
    },
    strategyTitle: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontFamily: FF,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: Spacing.xs,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gold + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        marginTop: 4,
    },
    durationText: {
        fontSize: 10,
        color: Colors.gold,
        fontFamily: FF,
        fontWeight: 'bold',
    }
});

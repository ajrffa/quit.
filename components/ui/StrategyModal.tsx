import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily, FontWeight } from '../../constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, SlideOutDown, FadeOut } from 'react-native-reanimated';
import { CopingStrategy, useHabitStore } from '../../stores/useHabitStore';
import { useRouter } from 'expo-router';

interface StrategyModalProps {
    visible: boolean;
    strategy: CopingStrategy | null;
    onClose: () => void;
}

const FF = FontFamily.sans;

export function StrategyModal({ visible, strategy, onClose }: StrategyModalProps) {
    const { addJournalEntry, isPremium } = useHabitStore();
    const router = useRouter();

    if (!visible || !strategy) return null;

    const handleComplete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Add an automatic journal entry to praise the user and keep the bot in the loop
        addJournalEntry(`[System] User successfully completed protocol: ${strategy.title}`);
        onClose();
    };

    const handleLaunchRoute = () => {
        if (!strategy.route) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();

        const isPremiumTool = strategy.route === '/tools/surf' || strategy.route === '/tools/pixel';
        const targetRoute = (!isPremium && isPremiumTool) ? '/paywall' : strategy.route;

        // Give the modal time to close before navigating to avoid jank
        setTimeout(() => {
            router.push(targetRoute as any);
        }, 150);
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Animated.View style={s.overlay} entering={FadeIn} exiting={FadeOut}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
                    <Pressable style={s.backdrop} onPress={onClose} />
                </BlurView>

                <Animated.View style={s.modal} entering={FadeInDown.springify().damping(18)} exiting={SlideOutDown}>

                    <View style={s.iconWrapper}>
                        <FontAwesome name={strategy.icon} size={32} color={Colors.gold} />
                    </View>

                    <Text style={s.title}>{strategy.title}</Text>
                    <Text style={s.description}>{strategy.description}</Text>

                    <View style={s.actions}>
                        {strategy.route ? (
                            <Pressable
                                style={({ pressed }) => [s.btn, s.btnPrimary, pressed && { opacity: 0.8 }]}
                                onPress={handleLaunchRoute}
                            >
                                {(!isPremium && (strategy.route === '/tools/surf' || strategy.route === '/tools/pixel')) ? (
                                    <>
                                        <FontAwesome name="lock" size={16} color={Colors.background} style={{ marginRight: 8 }} />
                                        <Text style={s.btnPrimaryText}>Unlock with Plus</Text>
                                    </>
                                ) : (
                                    <>
                                        <FontAwesome name="play-circle" size={16} color={Colors.background} style={{ marginRight: 8 }} />
                                        <Text style={s.btnPrimaryText}>Start Guided Activity</Text>
                                    </>
                                )}
                            </Pressable>
                        ) : (
                            <Pressable
                                style={({ pressed }) => [s.btn, s.btnPrimary, pressed && { opacity: 0.8 }]}
                                onPress={handleComplete}
                            >
                                <FontAwesome name="check" size={16} color={Colors.background} style={{ marginRight: 8 }} />
                                <Text style={s.btnPrimaryText}>Execute & Log</Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={({ pressed }) => [s.btn, s.btnSecondary, pressed && { opacity: 0.8 }]}
                            onPress={onClose}
                        >
                            <Text style={s.btnSecondaryText}>Close</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { flex: 1 },
    modal: {
        backgroundColor: Colors.card,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
        borderBottomWidth: 0,
        alignItems: 'center',
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.gold + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.xl,
        color: Colors.text,
        fontFamily: FF,
        fontWeight: 'bold',
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    description: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        fontFamily: FF,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    actions: {
        width: '100%',
        gap: Spacing.md,
    },
    btn: {
        width: '100%',
        height: 56,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimary: {
        backgroundColor: Colors.gold,
    },
    btnPrimaryText: {
        color: Colors.background,
        fontSize: FontSize.md,
        fontFamily: FF,
        fontWeight: 'bold',
    },
    btnSecondary: {
        backgroundColor: Colors.border,
    },
    btnSecondaryText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontFamily: FF,
        fontWeight: 'bold',
    },
});

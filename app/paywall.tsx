import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInUp, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useHabitStore } from '@/stores/useHabitStore';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

let Purchases: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Purchases = require('react-native-purchases').default;
} catch (e) {
    console.warn('[Paywall] react-native-purchases bulunamadı, simulated mode devrede.');
}

export default function PaywallScreen() {
    const router = useRouter();
    const { setPremium } = useHabitStore();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

    const handleSubscribe = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLoading(true);
        try {
            if (Purchases) {
                const offerings = await Purchases.getOfferings();
                const offering = offerings.current;
                if (!offering) throw new Error('Subscription package not found.');

                const pkg = selectedPlan === 'yearly' ? offering.annual : offering.monthly;
                if (!pkg) throw new Error(`Package details missing: ${selectedPlan}`);

                const { customerInfo } = await Purchases.purchasePackage(pkg);
                if (customerInfo.entitlements.active['premium_access']) {
                    setPremium(true);
                    router.back();
                }
            } else {
                setPremium(true);
                router.back();
            }
        } catch (error: any) {
            if (!error?.userCancelled) {
                Alert.alert('Purchase Failed', error?.message || 'Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLoading(true);
        try {
            if (Purchases) {
                const customerInfo = await Purchases.restorePurchases();
                if (customerInfo.entitlements.active['premium_access']) {
                    setPremium(true);
                    Alert.alert('Success', 'Premium subscription restored.');
                    router.back();
                } else {
                    Alert.alert('Not Found', 'No active premium subscription found on this account.');
                }
            } else {
                router.back();
            }
        } catch (error: any) {
            Alert.alert('Restore Failed', error?.message || 'Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    <Pressable style={s.closeBtn} onPress={() => router.back()}>
                        <FontAwesome name="times" size={24} color={Colors.textMuted} />
                    </Pressable>

                    <Animated.View entering={FadeInUp.duration(600).delay(100)} style={s.header}>
                        <FontAwesome name="diamond" size={48} color={Colors.gold} style={{ marginBottom: Spacing.md }} />
                        <Text style={s.title}>quit. <Text style={{ color: Colors.gold }}>premium</Text></Text>
                        <Text style={s.subtitle}>
                            Unlock your full potential and arm yourself with the ultimate tools to beat any craving.
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeIn.duration(800).delay(300)} style={s.featuresList}>
                        <FeatureItem icon="lock" title="Biometric App Lock" desc="Keep your journey completely private with FaceID/TouchID protection." />
                        <FeatureItem icon="line-chart" title="Advanced AI Journaling" desc="Get deep trigger analysis and tailored therapy-like reflections." />
                        <FeatureItem icon="bullseye" title="Multi-Habit Tracking" desc="Quit smoking, alcohol, sugar, and more all at the exact same time." />
                        <FeatureItem icon="gamepad" title="Premium Minigames" desc="Unlimited access to Urge Surfing, Pixel Art Revealer, and more distractor tools." />
                    </Animated.View>
                </ScrollView>

                <Animated.View entering={FadeInDown.duration(600).delay(500)} style={s.footer}>
                    <Pressable style={({ pressed }) => [s.buyBtn, pressed && { opacity: 0.8 }]} onPress={handleSubscribe} disabled={isLoading}>
                        <Text style={s.buyBtnText}>{isLoading ? 'Please Wait...' : 'Start 7-Day Free Trial'}</Text>
                        <Text style={s.buyBtnSub}>Then $39.99/year ($3.33/mo)</Text>
                    </Pressable>
                    <Pressable style={{ marginTop: 12, padding: 8, alignSelf: 'center' }} onPress={handleRestore} disabled={isLoading}>
                        <Text style={s.restoreText}>{isLoading ? 'Loading...' : 'Restore Purchase'}</Text>
                    </Pressable>
                    <Text style={s.disclaimer}>Subscription charged to iTunes account. Auto-renews.</Text>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <View style={s.featureItem}>
            <View style={s.iconWrap}>
                <FontAwesome name={icon} size={20} color={Colors.gold} />
            </View>
            <View style={s.featureText}>
                <Text style={s.featureTitle}>{title}</Text>
                <Text style={s.featureDesc}>{desc}</Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111111' },
    scroll: { padding: Spacing.xl, paddingBottom: 100 },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        marginBottom: Spacing.lg
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl
    },
    title: {
        fontSize: 36,
        fontFamily: FF,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.sm
    },
    subtitle: {
        fontSize: FontSize.md,
        fontFamily: FF,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.md
    },
    featuresList: {
        gap: Spacing.lg
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.card,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    featureText: {
        flex: 1
    },
    featureTitle: {
        fontSize: FontSize.md,
        fontFamily: FF,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: 4
    },
    featureDesc: {
        fontSize: FontSize.sm,
        fontFamily: FF,
        color: Colors.textMuted,
        lineHeight: 20
    },
    footer: {
        padding: Spacing.xl,
        borderTopWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        alignItems: 'center'
    },
    buyBtn: {
        width: '100%',
        backgroundColor: Colors.gold,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: Spacing.sm
    },
    buyBtnText: {
        fontSize: FontSize.lg,
        fontFamily: FF,
        fontWeight: FontWeight.bold,
        color: Colors.background,
        marginBottom: 2
    },
    buyBtnSub: {
        fontSize: FontSize.xs,
        fontFamily: FF,
        color: Colors.background,
        opacity: 0.8
    },
    restoreText: {
        fontSize: FontSize.sm,
        fontFamily: FF,
        color: Colors.textSecondary,
        textDecorationLine: 'underline'
    },
    disclaimer: {
        fontSize: FontSize.xs,
        fontFamily: FF,
        color: Colors.textMuted
    }
});

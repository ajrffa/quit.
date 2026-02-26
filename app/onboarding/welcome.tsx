import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily, FontWeight } from '../../constants/Theme';
import { useHabitStore, HabitType } from '../../stores/useHabitStore';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, FadeIn, Layout, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

const HABITS: { type: HabitType; label: string; icon: keyof typeof FontAwesome.glyphMap }[] = [
    { type: 'smoking', label: 'Smoking', icon: 'fire' },
    { type: 'alcohol', label: 'Alcohol', icon: 'glass' },
    { type: 'social_media', label: 'Social Media', icon: 'mobile-phone' },
    { type: 'sugar', label: 'Sugar', icon: 'spoon' },
    { type: 'pornography', label: 'Pornography', icon: 'eye-slash' },
    { type: 'gambling', label: 'Gambling', icon: 'money' },
    { type: 'junk_food', label: 'Junk Food', icon: 'shopping-basket' },
    { type: 'nail_biting', label: 'Nail Biting', icon: 'hand-stop-o' },
    { type: 'other', label: 'Other', icon: 'asterisk' },
];

const HABIT_LABELS: Record<string, string> = Object.fromEntries(HABITS.map(h => [h.type, h.label]));

type Step = 'welcome' | 'habit' | 'custom_habit' | 'name' | 'cost' | 'ready';

export default function OnboardingFlow() {
    const router = useRouter();
    const { completeOnboarding } = useHabitStore();
    const [step, setStep] = useState<Step>('welcome');
    const [selectedHabit, setSelectedHabit] = useState<HabitType | null>(null);
    const [customHabitName, setCustomHabitName] = useState('');
    const [name, setName] = useState('');
    const [costPerDay, setCostPerDay] = useState('');
    const [timePerDay, setTimePerDay] = useState('');
    const [dailyMinutes, setDailyMinutes] = useState(15);
    const [focusTasks, setFocusTasks] = useState(5);

    const handleComplete = async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        completeOnboarding(
            {
                type: selectedHabit || 'other',
                customHabitName: selectedHabit === 'other' ? customHabitName.trim() : undefined,
                startDate: new Date().toISOString(),
                triggers: [],
                dailyCommitmentMinutes: dailyMinutes,
                focusTasksCount: focusTasks,
                costPerDay: parseFloat(costPerDay) || 15,
                timePerDay: parseInt(timePerDay) || 45,
            },
            name.trim() || 'Friend'
        );
        router.replace('/(tabs)');
    };

    // WELCOME
    if (step === 'welcome') {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.welcomeContent}>
                    <Animated.View entering={FadeInDown.duration(1200).springify().damping(20)} style={s.logoWrap}>
                        <Text style={s.logo}>quit</Text>
                        <Animated.View entering={FadeIn.delay(800).duration(1000)} style={s.dot} />
                    </Animated.View>
                    <Animated.Text entering={FadeIn.delay(400).duration(1000)} style={s.tagline}>
                        reclaim your life.
                    </Animated.Text>
                </View>
                <Animated.View entering={FadeInUp.delay(600).duration(800)} style={s.bottom}>
                    <Pressable
                        style={({ pressed }) => [s.goldBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setStep('habit');
                        }}
                    >
                        <Text style={s.goldBtnText}>Begin Chapter One</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // HABIT SELECT
    if (step === 'habit') {
        return (
            <SafeAreaView style={s.container}>
                <Animated.View entering={FadeIn.duration(400)} style={s.header}>
                    <View style={s.headerTopRow}>
                        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep('welcome'); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.brand}>quit.</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: '33%' }]} /></View>
                </Animated.View>

                <ScrollView style={s.scrollFlex} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>
                        What are you{'\n'}leaving behind?
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>
                        Select your mountain to conquer.
                    </Animated.Text>

                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.grid}>
                        {HABITS.map((h, i) => {
                            const sel = selectedHabit === h.type;
                            return (
                                <Pressable
                                    key={h.type}
                                    style={({ pressed }) => [
                                        s.gridCard,
                                        sel && s.gridCardSel,
                                        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedHabit(h.type);
                                    }}
                                >
                                    <View style={[s.iconCircle, sel && s.iconCircleSel]}>
                                        <FontAwesome name={h.icon} size={22} color={sel ? Colors.background : Colors.gold} />
                                    </View>
                                    <Text style={[s.gridCardText, sel && s.gridCardTextSel]}>{h.label}</Text>
                                    {sel && (
                                        <Animated.View entering={FadeIn.duration(200)} style={s.cardCheck}>
                                            <FontAwesome name="check-circle" size={16} color={Colors.gold} />
                                        </Animated.View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </Animated.View>
                </ScrollView>
                <Animated.View entering={FadeInUp.duration(400)} style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [
                            s.outlineBtn,
                            !selectedHabit && s.btnDisabled,
                            pressed && selectedHabit && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => {
                            if (selectedHabit) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (selectedHabit === 'other') {
                                    setStep('custom_habit');
                                } else {
                                    setStep('name');
                                }
                            }
                        }}
                        disabled={!selectedHabit}
                    >
                        <Text style={s.outlineBtnText}>Continue</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // CUSTOM HABIT INPUT
    if (step === 'custom_habit') {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.header}>
                    <View style={s.headerTopRow}>
                        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep('habit'); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.brand}>quit.</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: '45%' }]} /></View>
                </View>
                <KeyboardAvoidingView
                    style={s.nameContent}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>What are you{'\n'}leaving behind?</Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>Define your own mountain.</Animated.Text>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Vaping, Video Games..."
                            placeholderTextColor={Colors.textDim}
                            value={customHabitName}
                            onChangeText={setCustomHabitName}
                            autoFocus
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                if (customHabitName.trim()) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setStep('name');
                                }
                            }}
                        />
                    </Animated.View>
                </KeyboardAvoidingView>
                <View style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [
                            s.outlineBtn,
                            !customHabitName.trim() && s.btnDisabled,
                            pressed && customHabitName.trim() && { opacity: 0.7 }
                        ]}
                        onPress={() => {
                            if (customHabitName.trim()) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStep('name');
                            }
                        }}
                        disabled={!customHabitName.trim()}
                    >
                        <Text style={s.outlineBtnText}>Continue</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // NAME INPUT
    if (step === 'name') {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.header}>
                    <View style={s.headerTopRow}>
                        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(selectedHabit === 'other' ? 'custom_habit' : 'habit'); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.brand}>quit.</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: '66%' }]} /></View>
                </View>
                <KeyboardAvoidingView
                    style={s.nameContent}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>What should{'\n'}we call you?</Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>This stays entirely private.</Animated.Text>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <TextInput
                            style={s.input}
                            placeholder="Your name"
                            placeholderTextColor={Colors.textDim}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                if (name.trim()) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setStep('cost');
                                }
                            }}
                        />
                    </Animated.View>
                </KeyboardAvoidingView>
                <View style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [
                            s.outlineBtn,
                            !name.trim() && s.btnDisabled,
                            pressed && name.trim() && { opacity: 0.7 }
                        ]}
                        onPress={() => {
                            if (name.trim()) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStep('cost');
                            }
                        }}
                        disabled={!name.trim()}
                    >
                        <Text style={s.outlineBtnText}>Continue</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // COST & TIME INPUT
    if (step === 'cost') {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.header}>
                    <View style={s.headerTopRow}>
                        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep('name'); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.brand}>quit.</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: '82%' }]} /></View>
                </View>
                <KeyboardAvoidingView
                    style={s.nameContent}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>What is the cost?</Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>Estimate daily losses. Leave blank to skip.</Animated.Text>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <Text style={s.inputLabel}>Money spent daily ($ / ₺ / €)</Text>
                        <TextInput
                            style={[s.input, { marginBottom: Spacing.xl }]}
                            placeholder="e.g. 15"
                            placeholderTextColor={Colors.textDim}
                            value={costPerDay}
                            onChangeText={setCostPerDay}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />
                        <Text style={s.inputLabel}>Minutes lost daily (e.g., 45)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 45"
                            placeholderTextColor={Colors.textDim}
                            value={timePerDay}
                            onChangeText={setTimePerDay}
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStep('ready');
                            }}
                        />
                    </Animated.View>
                </KeyboardAvoidingView>
                <View style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [
                            s.outlineBtn,
                            pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setStep('ready');
                        }}
                    >
                        <Text style={s.outlineBtnText}>Continue</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // READY
    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <View style={s.headerTopRow}>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep('cost'); }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                        <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                    </Pressable>
                    <Text style={s.brand}>quit.</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={s.progressBar}><View style={[s.progressFill, { width: '100%' }]} /></View>
            </View>
            <View style={s.readyContent}>
                <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>You are ready,{'\n'}{name.trim() || 'Friend'}.</Animated.Text>
                <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>Design your recovery protocol.</Animated.Text>
                <Animated.View entering={FadeInDown.delay(300).duration(800)} style={s.planCard}>
                    <View style={s.planRow}>
                        <Text style={s.planLabel}>Target</Text>
                        <Text style={s.planValueGold}>
                            {selectedHabit === 'other' && customHabitName.trim()
                                ? customHabitName.trim()
                                : HABIT_LABELS[selectedHabit || 'other']} Cessation
                        </Text>
                    </View>
                    <View style={s.planDivider} />
                    <View style={s.planRow}>
                        <Text style={s.planLabel}>Daily Work</Text>
                        <View style={s.counterWrap}>
                            <Pressable onPress={() => { Haptics.selectionAsync(); setDailyMinutes(Math.max(5, dailyMinutes - 5)) }} style={s.counterBtn}>
                                <Text style={s.counterBtnText}>-</Text>
                            </Pressable>
                            <Text style={s.planValue}>{dailyMinutes} min</Text>
                            <Pressable onPress={() => { Haptics.selectionAsync(); setDailyMinutes(Math.min(60, dailyMinutes + 5)) }} style={s.counterBtn}>
                                <Text style={s.counterBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </View>
                    <View style={s.planDivider} />
                    <View style={s.planRow}>
                        <Text style={s.planLabel}>Action Items</Text>
                        <View style={s.counterWrap}>
                            <Pressable onPress={() => { Haptics.selectionAsync(); setFocusTasks(Math.max(1, focusTasks - 1)) }} style={s.counterBtn}>
                                <Text style={s.counterBtnText}>-</Text>
                            </Pressable>
                            <Text style={s.planValue}>{focusTasks} / day</Text>
                            <Pressable onPress={() => { Haptics.selectionAsync(); setFocusTasks(Math.min(10, focusTasks + 1)) }} style={s.counterBtn}>
                                <Text style={s.counterBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(600).duration(1000)} style={s.motivationWrap}>
                    <FontAwesome name="shield" size={24} color={Colors.gold} style={{ marginBottom: Spacing.sm }} />
                    <Text style={s.motivationTitle}>The Contract is set.</Text>
                    <Text style={s.motivationText}>
                        Bugün verdiğin karar, yarın kim olacağını belirler.
                    </Text>
                </Animated.View>
            </View>
            <Animated.View entering={FadeInUp.delay(500).duration(800)} style={s.bottomFixed}>
                <Pressable
                    style={({ pressed }) => [s.goldBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                    onPress={handleComplete}
                >
                    <Text style={s.goldBtnText}>Acknowledge & Start</Text>
                </Pressable>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    brand: { fontSize: FontSize.md, color: Colors.gold, letterSpacing: 1, fontFamily: FF },
    progressBar: { height: 2, backgroundColor: Colors.border, borderRadius: 1 },
    progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 1 },

    // Welcome
    welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logoWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm },
    logo: { fontSize: 80, fontWeight: FontWeight.thin, color: Colors.text, letterSpacing: -4, fontFamily: FF },
    dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.gold, marginBottom: 20, marginLeft: 4 },
    tagline: { fontSize: FontSize.md, color: Colors.textSecondary, letterSpacing: 4, fontFamily: FF, textTransform: 'uppercase' },

    // Typography
    title: { fontSize: 36, fontWeight: FontWeight.light, color: Colors.text, lineHeight: 44, marginBottom: Spacing.sm, fontFamily: FF, letterSpacing: -0.5 },
    subtitle: { fontSize: FontSize.md, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.xl, fontFamily: FF },

    // Layouts
    scrollFlex: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 150 },
    bottom: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
    bottomFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, backgroundColor: Colors.background },

    // Grid System
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md },
    gridCard: {
        width: (width - (Spacing.lg * 2) - Spacing.md) / 2,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: '#1f1f1f',
        borderRadius: BorderRadius.xl, // Premium roundness
        padding: Spacing.md,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    gridCardSel: { borderColor: Colors.gold, backgroundColor: '#1a180f' }, // Very subtle gold tint
    iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    iconCircleSel: { backgroundColor: Colors.gold },
    gridCardText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, textAlign: 'center', fontWeight: '500' },
    gridCardTextSel: { color: Colors.gold, fontWeight: '600' },
    cardCheck: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },

    // Name & Cost Step
    nameContent: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
    input: { borderBottomWidth: 1, borderBottomColor: Colors.gold, paddingVertical: Spacing.md, fontSize: FontSize.xxl, color: Colors.text, fontWeight: FontWeight.light, fontFamily: FF },
    inputLabel: { fontSize: FontSize.xs, color: Colors.gold, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },

    // Ready Step
    readyContent: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
    planCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, backgroundColor: Colors.card, marginBottom: Spacing.xl },
    planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
    planLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 1 },
    planValue: { fontSize: FontSize.md, color: Colors.text, fontFamily: FF, fontWeight: '500', minWidth: 60, textAlign: 'center' },
    planValueGold: { fontSize: FontSize.md, color: Colors.gold, fontFamily: FF, fontWeight: 'bold' },
    planDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
    counterWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 100, paddingHorizontal: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
    counterBtn: { padding: Spacing.sm, width: 40, alignItems: 'center', justifyContent: 'center' },
    counterBtnText: { color: Colors.gold, fontSize: FontSize.lg, fontFamily: FF, fontWeight: 'bold' },

    motivationWrap: { alignItems: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.md },
    motivationTitle: { color: Colors.text, fontSize: FontSize.md, fontFamily: FF, fontWeight: 'bold', marginBottom: Spacing.xs, letterSpacing: 1, textTransform: 'uppercase' },
    motivationText: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: FF, textAlign: 'center', lineHeight: 22 },

    // Buttons
    outlineBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 100, paddingVertical: 18, alignItems: 'center', backgroundColor: Colors.card },
    outlineBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, letterSpacing: 1, fontFamily: FF },
    goldBtn: { backgroundColor: Colors.gold, borderRadius: 100, paddingVertical: 18, alignItems: 'center', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    goldBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1, fontFamily: FF, textTransform: 'uppercase' },
    btnDisabled: { opacity: 0.35 },
});

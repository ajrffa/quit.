import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useHabitStore, HabitType } from '../../stores/useHabitStore';
import { subDays, isSameDay, differenceInHours } from 'date-fns';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const FF = FontFamily.sans;

// ── Recovery Timeline Data ─────────────────────────────────────────────────
type RecoveryMilestone = { hours?: number; days?: number; text: string; icon: string };

const RECOVERY_TIMELINES: Record<HabitType | 'other', RecoveryMilestone[]> = {
    smoking: [
        { hours: 1, text: 'Kalp atış hızın normale döndü', icon: '❤️' },
        { hours: 8, text: 'Kanda karbon monoksit azaldı', icon: '🫁' },
        { hours: 24, text: 'Kalp krizi riski düşmeye başladı', icon: '💪' },
        { hours: 48, text: 'Nikotin tamamen vücudundan çıktı', icon: '✨' },
        { days: 3, text: 'Nefes almak kolaylaştı', icon: '🌬️' },
        { days: 14, text: 'Dolaşım sistemi iyileşti', icon: '🩸' },
        { days: 30, text: 'Öksürük ve nefes darlığı azaldı', icon: '🌿' },
        { days: 90, text: 'Akciğer kapasiten %30 arttı', icon: '🫧' },
        { days: 365, text: 'Kalp hastalığı riskin yarı yarıya düştü', icon: '🏆' },
    ],
    alcohol: [
        { hours: 6, text: 'Kandaki alkol sıfırlandı', icon: '🧹' },
        { hours: 24, text: 'Uyku kalitesi iyileşmeye başladı', icon: '😴' },
        { hours: 48, text: 'Dehidrasyon giderildi', icon: '💧' },
        { days: 3, text: 'Anksiyete belirgin şekilde azaldı', icon: '🧘' },
        { days: 7, text: 'Karaciğer kendini onarmaya başladı', icon: '🌿' },
        { days: 14, text: 'Kan basıncın normale döndü', icon: '❤️' },
        { days: 30, text: 'Cilt daha sağlıklı görünüyor', icon: '✨' },
        { days: 90, text: 'Karaciğer fonksiyonları normalleşti', icon: '🏆' },
        { days: 365, text: 'Kanser riski belirgin şekilde düştü', icon: '🎯' },
    ],
    social_media: [
        { hours: 2, text: 'Dopamin döngüsü kırılmaya başladı', icon: '🧠' },
        { hours: 6, text: 'Odak süresi uzamaya başladı', icon: '🎯' },
        { hours: 24, text: 'FOMO hissi azalmaya başladı', icon: '🌬️' },
        { days: 3, text: 'Uyku kalitesi belirgin iyileşti', icon: '😴' },
        { days: 7, text: 'Anksiyete ve karşılaştırma dürtüsü azaldı', icon: '🧘' },
        { days: 14, text: 'Dikkat süresi önemli ölçüde arttı', icon: '📚' },
        { days: 30, text: 'Gerçek ilişkiler güçlendi', icon: '❤️' },
        { days: 90, text: 'Yaratıcılık ve üretkenlik zirveye ulaştı', icon: '🚀' },
    ],
    sugar: [
        { hours: 2, text: 'Kan şekeri stabilleşmeye başladı', icon: '📊' },
        { hours: 12, text: 'Enerji çöküşleri önlendi', icon: '⚡' },
        { hours: 24, text: 'İnsülin hassasiyeti iyileşti', icon: '💉' },
        { days: 3, text: 'Cravings belirgin azaldı', icon: '🧠' },
        { days: 7, text: 'Daha sabit enerji seviyesi', icon: '🔋' },
        { days: 14, text: 'Cilt parlaklığı arttı', icon: '✨' },
        { days: 30, text: 'Kilo kontrolü iyileşti', icon: '⚖️' },
        { days: 90, text: 'Uzun vadeli diyabet riski azaldı', icon: '🏆' },
    ],
    pornography: [
        { hours: 24, text: 'Dopamin reseptörleri iyileşmeye başladı', icon: '🧠' },
        { days: 3, text: 'Uyku kalitesi iyileşti', icon: '😴' },
        { days: 7, text: 'Gerçek ilişkilere ilgi arttı', icon: '❤️' },
        { days: 14, text: 'Konsantrasyon ve hafıza güçlendi', icon: '🎯' },
        { days: 30, text: 'Özgüven ve motivasyon arttı', icon: '💪' },
        { days: 60, text: 'Duygusal denge sağlandı', icon: '🧘' },
        { days: 90, text: 'Dopamin sistemi büyük ölçüde iyileşti', icon: '✨' },
        { days: 180, text: 'Yeni bir insan gibi hissediyorsun', icon: '🚀' },
    ],
    gambling: [
        { hours: 24, text: 'İlk kriz dönemi aşıldı', icon: '🛡️' },
        { days: 3, text: 'Finansal stres azalmaya başladı', icon: '💰' },
        { days: 7, text: 'Uyku ve iştah normalleşti', icon: '😴' },
        { days: 14, text: 'Aile ilişkileri onarılmaya başladı', icon: '❤️' },
        { days: 30, text: 'Dürtüsel karar verme azaldı', icon: '🧠' },
        { days: 60, text: 'Mali planlama kapasiten arttı', icon: '📊' },
        { days: 90, text: 'Dopamin dengen normalleşti', icon: '✨' },
        { days: 365, text: 'Hayatın kontrol altında', icon: '🏆' },
    ],
    junk_food: [
        { hours: 4, text: 'Kan şekeri stabilleşti', icon: '📊' },
        { hours: 24, text: 'Sindirim sistemi rahatladı', icon: '🌿' },
        { days: 3, text: 'Enerji seviyen sabitlendi', icon: '⚡' },
        { days: 7, text: 'Cilt durumun iyileşmeye başladı', icon: '✨' },
        { days: 14, text: 'Bağırsak florası iyileşti', icon: '🦠' },
        { days: 30, text: 'İltihaplanma azaldı', icon: '💪' },
        { days: 60, text: 'Ağırlık yönetimi iyileşti', icon: '⚖️' },
        { days: 90, text: 'Kalp-damar sağlığın güçlendi', icon: '❤️' },
    ],
    nail_biting: [
        { days: 1, text: 'İlk 24 saati geçtin!', icon: '💪' },
        { days: 3, text: 'Tırnaklar büyümeye başladı', icon: '✨' },
        { days: 7, text: 'Enfeksiyon riski azaldı', icon: '🛡️' },
        { days: 14, text: 'Tırnak yatakları iyileşti', icon: '🌿' },
        { days: 30, text: 'Tırnaklar sağlıklı görünüyor', icon: '👐' },
        { days: 60, text: 'Anksiyete belirgin azaldı', icon: '🧘' },
        { days: 90, text: 'Alışkanlık döngüsü kırıldı', icon: '🔓' },
        { days: 180, text: 'Tam iyileşme sağlandı', icon: '🏆' },
    ],
    other: [
        { hours: 24, text: 'İlk 24 saati başardın', icon: '💪' },
        { days: 3, text: 'Vücudun adaptasyona başladı', icon: '🌿' },
        { days: 7, text: 'Bir hafta — büyük başarı', icon: '🎯' },
        { days: 14, text: 'Alışkanlık döngüsü zayıfladı', icon: '🧠' },
        { days: 30, text: 'Bir ay — zihin netleşti', icon: '✨' },
        { days: 60, text: 'İki ay — yeni sen inşa edildi', icon: '🔨' },
        { days: 90, text: '90 gün — bilimsel kanıtlı dönüşüm', icon: '🚀' },
        { days: 365, text: 'Bir yıl — tam kontrol', icon: '🏆' },
    ],
};

// ─── Animated Counter Hook ────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
    const anim = useRef(new RNAnimated.Value(0)).current;
    const display = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        RNAnimated.timing(anim, {
            toValue: target,
            duration,
            useNativeDriver: false,
        }).start();
        anim.addListener(({ value }) => {
            (display as any)._value = Math.floor(value);
        });
        return () => anim.removeAllListeners();
    }, [target]);

    return anim;
}

// ─── Money Examples ──────────────────────────────────────────────────────
function getMoneyExamples(amount: number): string[] {
    const examples: string[] = [];
    if (amount >= 500) examples.push('✈️ Uçak bileti');
    if (amount >= 200) examples.push('🎮 Oyun konsolu');
    if (amount >= 100) examples.push('👟 Spor ayakkabı');
    if (amount >= 50) examples.push('🍽️ Güzel bir akşam yemeği');
    if (amount >= 20) examples.push('📚 Birkaç kitap');
    if (amount >= 5) examples.push('☕ Bir haftalık kahve');
    return examples.slice(0, 3);
}

export default function StatsScreen() {
    const { currentStreak, activeHabit, relapseCount, checkInHistory } = useHabitStore();

    const hoursElapsed = useMemo(() => {
        if (!activeHabit) return 0;
        return differenceInHours(new Date(), new Date(activeHabit.startDate));
    }, [activeHabit]);

    const moneySaved = useMemo(() => {
        const cpd = activeHabit?.costPerDay || 15; // Fallback: ₺15/gün
        return Math.round(currentStreak * cpd);
    }, [currentStreak, activeHabit?.costPerDay]);

    const hoursSaved = useMemo(() => {
        const tpd = activeHabit?.timePerDay || 45; // Fallback: 45dk/gün
        return Math.round((currentStreak * tpd) / 60);
    }, [currentStreak, activeHabit?.timePerDay]);

    const heatmapDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = subDays(today, i);
            const checkedIn = (checkInHistory || []).some(ds => isSameDay(new Date(ds), d));
            days.push({ date: d, checkedIn });
        }
        return days;
    }, [checkInHistory]);

    const recoveryMilestones = useMemo(() => {
        const habitType = activeHabit?.type || 'other';
        const milestones = RECOVERY_TIMELINES[habitType] || RECOVERY_TIMELINES.other;
        return milestones.map(m => {
            const thresholdHours = m.hours ?? ((m.days ?? 0) * 24);
            const done = hoursElapsed >= thresholdHours;
            const label = m.hours
                ? `${m.hours} saat`
                : `${m.days} gün`;
            return { ...m, done, label };
        });
    }, [activeHabit?.type, hoursElapsed]);

    const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
    const nextMilestone = MILESTONES.find(m => m > currentStreak) || 365;
    const prevMilestone = [...MILESTONES].reverse().find(m => m <= currentStreak) || 0;
    const milestoneProgress = nextMilestone > prevMilestone
        ? (currentStreak - prevMilestone) / (nextMilestone - prevMilestone)
        : 1;

    const moneyAnim = useAnimatedCounter(moneySaved);
    const hoursAnim = useAnimatedCounter(hoursSaved);

    const moneyExamples = getMoneyExamples(moneySaved);

    if (!activeHabit) return null;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Text style={s.headerTitle}>Progress</Text>

                {/* ── Hero Card ─────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(600)} style={s.heroCard}>
                    <LinearGradient
                        colors={['rgba(212,175,55,0.08)', 'transparent']}
                        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.xl }]}
                    />
                    <Text style={s.heroLabel}>CURRENT STREAK</Text>
                    <Text style={s.heroValue}>
                        {currentStreak} <Text style={s.heroUnit}>DAYS</Text>
                    </Text>
                    <View style={s.heroProgressBg}>
                        <View style={[s.heroProgressFill, { width: `${Math.min(milestoneProgress * 100, 100)}%` }]} />
                    </View>
                    <Text style={s.heroSubtext}>
                        Sonraki milestone: <Text style={{ color: Colors.gold }}>{nextMilestone} gün</Text>
                        {' '}— {nextMilestone - currentStreak} gün kaldı
                    </Text>
                </Animated.View>

                {/* ── Para Tasarrufu ─────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(150).duration(600)} style={s.savingsCard}>
                    <View style={s.savingsHeader}>
                        <FontAwesome name="money" size={18} color={Colors.gold} />
                        <Text style={s.savingsTitle}>PARA TASARRUFU</Text>
                    </View>
                    <View style={s.counterRow}>
                        <RNAnimated.Text style={s.counterValue}>
                            {moneyAnim.interpolate({
                                inputRange: [0, moneySaved || 1],
                                outputRange: ['0', String(moneySaved)],
                            })}
                        </RNAnimated.Text>
                        <Text style={s.counterCurrency}>₺</Text>
                    </View>
                    <Text style={s.savingsSub}>Bugüne kadar biriktirdiğin para</Text>
                    {moneyExamples.length > 0 && (
                        <View style={s.examplesBox}>
                            <Text style={s.examplesLabel}>Bu parayla şunları alabilirdin:</Text>
                            {moneyExamples.map((ex, i) => (
                                <Text key={i} style={s.exampleItem}>{ex}</Text>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* ── Zaman Tasarrufu ──────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).duration(600)} style={s.timeCard}>
                    <View style={s.savingsHeader}>
                        <FontAwesome name="clock-o" size={18} color={Colors.gold} />
                        <Text style={s.savingsTitle}>ZAMAN TASARRUFU</Text>
                    </View>
                    <View style={s.counterRow}>
                        <RNAnimated.Text style={s.counterValue}>
                            {hoursAnim.interpolate({
                                inputRange: [0, hoursSaved || 1],
                                outputRange: ['0', String(hoursSaved)],
                            })}
                        </RNAnimated.Text>
                        <Text style={s.counterCurrency}> saat</Text>
                    </View>
                    <Text style={s.savingsSub}>
                        {hoursSaved >= 24
                            ? `${Math.round(hoursSaved / 24)} gün ${hoursSaved % 24} saate eşdeğer`
                            : 'Hayatına geri kazandırılan süre'}
                    </Text>
                </Animated.View>

                {/* ── Recovery Timeline ────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).duration(600)} style={s.section}>
                    <Text style={s.sectionTitle}>Vücut İyileşme Takvimi</Text>
                    <View style={s.timeline}>
                        {recoveryMilestones.map((m, i) => (
                            <View key={i} style={s.timelineItem}>
                                <View style={[s.timelineDot, m.done ? s.timelineDotDone : s.timelineDotPending]} />
                                {i < recoveryMilestones.length - 1 && (
                                    <View style={[s.timelineLine, m.done ? s.timelineLineDone : s.timelineLinePending]} />
                                )}
                                <View style={s.timelineContent}>
                                    <Text style={s.timelineEmoji}>{m.icon}</Text>
                                    <View style={s.timelineText}>
                                        <Text style={[s.timelineLabel, m.done ? s.timelineLabelDone : s.timelineLabelPending]}>
                                            {m.label}
                                        </Text>
                                        <Text style={[s.timelineDesc, m.done ? s.timelineDescDone : s.timelineDescPending]}>
                                            {m.text}
                                        </Text>
                                    </View>
                                    {m.done && <FontAwesome name="check-circle" size={16} color="#22c55e" />}
                                </View>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* ── 14 Günlük Heatmap ────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(400).duration(600)} style={s.section}>
                    <Text style={s.sectionTitle}>Son 14 Gün</Text>
                    <View style={s.heatmapGrid}>
                        {heatmapDays.map((day, i) => (
                            <View
                                key={i}
                                style={[
                                    s.heatBox,
                                    day.checkedIn ? s.heatBoxActive : s.heatBoxInactive,
                                    isSameDay(day.date, new Date()) && s.heatBoxToday,
                                ]}
                            />
                        ))}
                    </View>
                    <View style={s.heatmapLegend}>
                        <Text style={s.legendText}>Daha az</Text>
                        <View style={[s.heatBox, s.heatBoxInactive, { marginHorizontal: 4 }]} />
                        <View style={[s.heatBox, s.heatBoxActive, { marginHorizontal: 4 }]} />
                        <Text style={s.legendText}>Daha fazla</Text>
                    </View>
                </Animated.View>

                {/* ── Stats Grid ──────────────────────────────── */}
                <Animated.View entering={FadeIn.delay(500).duration(600)} style={s.statsGrid}>
                    <View style={s.statBox}>
                        <Text style={s.statValue}>{activeHabit.longestStreak || 0}</Text>
                        <Text style={s.statLabel}>En Uzun Seri</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={s.statValue}>{relapseCount || 0}</Text>
                        <Text style={s.statLabel}>Nüksler</Text>
                    </View>
                </Animated.View>

            </ScrollView>
        </SafeAreaView>
    );
}

const HEATBOX_SIZE = (width - Spacing.lg * 2 - 8 * 6) / 7;

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: Spacing.lg, paddingBottom: 120 },
    headerTitle: {
        fontSize: FontSize.hero, fontWeight: FontWeight.light, color: Colors.text,
        marginBottom: Spacing.xl, letterSpacing: -1, fontFamily: FF,
    },

    // Hero Card
    heroCard: {
        backgroundColor: Colors.card, padding: Spacing.xl, borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.gold + '40',
        overflow: 'hidden',
    },
    heroLabel: { fontSize: FontSize.xs, color: Colors.gold, letterSpacing: 2, marginBottom: Spacing.sm, fontFamily: FF },
    heroValue: { fontSize: 56, fontWeight: FontWeight.thin, color: Colors.text, letterSpacing: -2, fontFamily: FF },
    heroUnit: { fontSize: FontSize.md, color: Colors.textSecondary, letterSpacing: 1 },
    heroProgressBg: {
        height: 4, backgroundColor: Colors.background, borderRadius: 2,
        marginTop: Spacing.lg, marginBottom: Spacing.sm, overflow: 'hidden',
    },
    heroProgressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
    heroSubtext: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF },

    // Savings Cards
    savingsCard: {
        backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.xl,
        marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.gold + '40',
    },
    timeCard: {
        backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.xl,
        marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.gold + '30',
    },
    savingsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    savingsTitle: { fontSize: FontSize.xs, color: Colors.gold, letterSpacing: 2, fontFamily: FF, fontWeight: 'bold' },
    counterRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
    counterValue: { fontSize: 48, fontWeight: '900', color: Colors.text, fontFamily: FF, letterSpacing: -1 },
    counterCurrency: { fontSize: FontSize.xxl, color: Colors.gold, fontFamily: FF, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
    savingsSub: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, marginBottom: Spacing.md },
    examplesBox: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginTop: Spacing.xs },
    examplesLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, marginBottom: Spacing.sm, letterSpacing: 0.5 },
    exampleItem: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, marginBottom: 4 },

    // Timeline
    section: { marginBottom: Spacing.xl },
    sectionTitle: {
        fontSize: FontSize.lg, fontWeight: FontWeight.medium, color: Colors.text,
        marginBottom: Spacing.lg, fontFamily: FF,
    },
    timeline: { paddingLeft: Spacing.sm },
    timelineItem: { flexDirection: 'row', marginBottom: Spacing.lg, position: 'relative' },
    timelineDot: { width: 16, height: 16, borderRadius: 8, marginRight: Spacing.md, marginTop: 2, zIndex: 1 },
    timelineDotDone: { backgroundColor: '#22c55e' },
    timelineDotPending: { backgroundColor: Colors.border },
    timelineLine: { position: 'absolute', left: 7, top: 18, width: 2, height: '100%' },
    timelineLineDone: { backgroundColor: '#22c55e40' },
    timelineLinePending: { backgroundColor: Colors.border },
    timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    timelineEmoji: { fontSize: 20, width: 28 },
    timelineText: { flex: 1 },
    timelineLabel: { fontSize: FontSize.xs, fontFamily: FF, letterSpacing: 1, fontWeight: 'bold', marginBottom: 2 },
    timelineLabelDone: { color: '#22c55e' },
    timelineLabelPending: { color: Colors.textMuted },
    timelineDesc: { fontSize: FontSize.sm, fontFamily: FF, lineHeight: 20 },
    timelineDescDone: { color: Colors.text },
    timelineDescPending: { color: Colors.textDim },

    // Heatmap
    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
    heatBox: { width: HEATBOX_SIZE, aspectRatio: 1, borderRadius: 6 },
    heatBoxActive: { backgroundColor: Colors.gold },
    heatBoxInactive: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
    heatBoxToday: { borderWidth: 2, borderColor: Colors.text },
    heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    legendText: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF },

    // Stats Grid
    statsGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
    statBox: {
        flex: 1, backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.light, color: Colors.text, marginBottom: Spacing.xs, fontFamily: FF },
    statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontFamily: FF },
});

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useHabitStore } from '../../stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Svg, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp, FadeIn, useSharedValue, withTiming, useAnimatedProps } from 'react-native-reanimated';
import MilestoneModal from '../../components/MilestoneModal';

const { width } = Dimensions.get('window');
const ARC_SIZE = Math.min(width * 0.7, 300);
const ARC_STROKE = 6;
const ARC_RADIUS = (ARC_SIZE - ARC_STROKE) / 2;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const FF = FontFamily.sans;
const IS_DEV = __DEV__;

const QUOTES = [
  "Every day you resist, you become stronger.",
  "You're not giving up something — you're gaining freedom.",
  "The only way out is through.",
  "Progress, not perfection.",
  "Your future self will thank you.",
  "Small steps lead to big changes.",
];

const HABIT_LABELS: Record<string, string> = {
  smoking: 'Smoking', social_media: 'Social Media', alcohol: 'Alcohol',
  sugar: 'Sugar', gambling: 'Gambling', pornography: 'Pornography',
  junk_food: 'Junk Food', nail_biting: 'Nail Biting', other: 'Other',
};

const MILESTONES = [
  { days: 1, title: 'First Step', icon: 'star', description: 'The journey of a thousand miles begins with a single step.' },
  { days: 3, title: 'Momentum', icon: 'rocket', description: 'You are building momentum. Keep pushing forward!' },
  { days: 7, title: 'One Week', icon: 'trophy', description: 'A full week clean! Your mind and body are starting to heal.' },
  { days: 14, title: 'Fortnight', icon: 'shield', description: 'Two weeks in. Your willpower is growing stronger every day.' },
  { days: 30, title: 'One Month', icon: 'diamond', description: 'One month down! A massive achievement. You are transforming.' },
  { days: 60, title: 'Two Months', icon: 'leaf', description: 'Sixty days. New habits are forming. Stay vigilant.' },
  { days: 90, title: 'Reboot', icon: 'bolt', description: '90 days clean! For many, this marks a complete mental reboot.' },
  { days: 180, title: 'Half Year', icon: 'anchor', description: 'Six months. You have anchored yourself in your new life.' },
  { days: 365, title: 'One Year 🌱', icon: 'sun-o', description: 'A full year of freedom! quit. will plant 10 trees in your name. 🌱' },
];

const MILESTONE_DAYS = MILESTONES.map(m => m.days);

export default function HomeScreen() {
  const router = useRouter();
  const {
    activeHabit, currentStreak, lastCheckIn, level, checkIn, relapse,
    milestone365Shown, setMilestone365Shown,
  } = useHabitStore();
  const [quoteIndex] = useState(Math.floor(Math.random() * QUOTES.length));
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [shownMilestone, setShownMilestone] = useState<number | null>(null);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const hasCheckedIn = lastCheckIn === today;

  useEffect(() => {
    if (!activeHabit) return;
    const tick = () => {
      const diff = Date.now() - new Date(activeHabit.startDate).getTime();
      setElapsed({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeHabit?.startDate]);

  // Milestone celebration
  useEffect(() => {
    if (!MILESTONE_DAYS.includes(currentStreak) || currentStreak === shownMilestone) return;
    if (currentStreak === 365 && !milestone365Shown) {
      router.push('/milestone-365' as any);
      setMilestone365Shown();
    } else if (currentStreak !== 365) {
      setShownMilestone(currentStreak);
      setMilestoneVisible(true);
    }
  }, [currentStreak]);

  // 270° speedometer arc (90 days = full)
  const fractionalDays = elapsed.days + (elapsed.hours / 24) + (elapsed.minutes / 1440) + (elapsed.seconds / 86400);
  const mappedProgress = Math.min(fractionalDays / 90, 1);
  const arcLength = ARC_CIRCUMFERENCE * 0.75;

  const progressVal = useSharedValue(0);

  useEffect(() => {
    progressVal.value = withTiming(mappedProgress, { duration: 1000 });
  }, [mappedProgress, progressVal]);

  const animatedCircleProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: ARC_CIRCUMFERENCE - arcLength * progressVal.value
    };
  });

  if (!activeHabit) return null;

  // Milestone progress bar values
  const nextMilestone = MILESTONE_DAYS.find(m => m > currentStreak) || 365;
  const prevMilestone = [...MILESTONE_DAYS].reverse().find(m => m <= currentStreak) || 0;
  const milestoneProgress = nextMilestone > prevMilestone
    ? (currentStreak - prevMilestone) / (nextMilestone - prevMilestone)
    : 1;

  // Savings calculations
  const costPerDay = activeHabit.costPerDay || 0;
  const timePerDay = activeHabit.timePerDay || 0;
  const moneySaved = (costPerDay * elapsed.days).toFixed(0);
  const timeSaved = (timePerDay * elapsed.days / 60).toFixed(1); // hours

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(800)} style={s.headerRow}>
          <Text style={s.brand}>quit.</Text>
          <Text style={s.habitLabel}>
            {activeHabit.type === 'other' && activeHabit.customHabitName
              ? activeHabit.customHabitName
              : HABIT_LABELS[activeHabit.type]}
          </Text>
        </Animated.View>

        {/* Speedometer Arc */}
        <Animated.View entering={FadeIn.delay(200).duration(1000)} style={s.arcWrap}>
          <Svg width={ARC_SIZE} height={ARC_SIZE} style={{ transform: [{ rotate: '135deg' }] }}>
            <Defs>
              <SvgLinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.gold} stopOpacity="1" />
                <Stop offset="100%" stopColor="#8a6c1c" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Circle
              cx={ARC_SIZE / 2} cy={ARC_SIZE / 2} r={ARC_RADIUS}
              stroke={Colors.border} strokeWidth={ARC_STROKE} fill="none"
              strokeDasharray={`${ARC_CIRCUMFERENCE}`}
              strokeDashoffset={ARC_CIRCUMFERENCE * 0.25}
              strokeLinecap="round"
            />
            <AnimatedCircle
              cx={ARC_SIZE / 2} cy={ARC_SIZE / 2} r={ARC_RADIUS}
              stroke="url(#goldGrad)" strokeWidth={ARC_STROKE} fill="none"
              strokeDasharray={`${ARC_CIRCUMFERENCE}`}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
            />
          </Svg>
          <View style={s.arcInterior}>
            <Text style={s.daysNum}>{elapsed.days}</Text>
            <Text style={s.daysLabel}>DAYS CLEAN</Text>
            <Animated.Text entering={FadeInUp.delay(600).duration(800)} style={s.timer}>
              {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:{String(elapsed.seconds).padStart(2, '0')}
            </Animated.Text>
          </View>
        </Animated.View>

        {/* Milestone Progress Bar */}
        <Animated.View entering={FadeInDown.delay(350).duration(600)} style={s.milestoneWrap}>
          <View style={s.milestoneHeader}>
            <Text style={s.milestoneLabel}>Next: {nextMilestone} days</Text>
            <Text style={s.milestoneLabel}>{nextMilestone - currentStreak} to go</Text>
          </View>
          <View style={s.milestoneBg}>
            <View style={[s.milestoneFill, { width: `${milestoneProgress * 100}%` }]} />
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInUp.delay(500).duration(800)} style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Streak</Text>
            <Text style={s.statValue}>{currentStreak}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statLabel}>Best</Text>
            <Text style={s.statValue}>{activeHabit.longestStreak || 0}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statLabel}>Level</Text>
            <Text style={s.statValue}>{level}</Text>
          </View>
        </Animated.View>

        {/* Check-in CTA */}
        <Animated.View entering={FadeInUp.delay(600).duration(800)} style={s.actionWrap}>
          {!hasCheckedIn ? (
            <Pressable
              style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); checkIn(10); }}
            >
              <Text style={s.actionText}>COMMIT TO TODAY</Text>
            </Pressable>
          ) : (
            <View style={s.actionDone}>
              <Text style={s.actionDoneText}>Secured today ✓</Text>
            </View>
          )}
        </Animated.View>

        {/* Savings Cards */}
        <Animated.View entering={FadeInUp.delay(750).duration(800)} style={s.savingsRow}>
          {costPerDay > 0 ? (
            <View style={s.savingBox}>
              <Text style={s.savingValue}>${moneySaved}</Text>
              <Text style={s.savingLabel}>SAVED</Text>
            </View>
          ) : (
            <Pressable
              style={[s.savingBox, s.savingBoxEmpty]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/profile' as any); }}
            >
              <FontAwesome name="plus-circle" size={20} color={Colors.gold} style={{ marginBottom: 4 }} />
              <Text style={s.savingEmptyText}>Add daily cost</Text>
            </Pressable>
          )}
          {timePerDay > 0 ? (
            <View style={s.savingBox}>
              <Text style={s.savingValue}>{timeSaved}h</Text>
              <Text style={s.savingLabel}>TIME SAVED</Text>
            </View>
          ) : (
            <Pressable
              style={[s.savingBox, s.savingBoxEmpty]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/profile' as any); }}
            >
              <FontAwesome name="plus-circle" size={20} color={Colors.gold} style={{ marginBottom: 4 }} />
              <Text style={s.savingEmptyText}>Add daily time</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* SOS — Two-Option Modal Trigger */}
        <Animated.View entering={FadeInUp.delay(900).duration(800)} style={s.sosWrap}>
          <Pressable
            style={({ pressed }) => [s.sosBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSosModalVisible(true); }}
          >
            <FontAwesome name="heartbeat" size={20} color={Colors.error} style={{ marginRight: 8 }} />
            <Text style={s.sosText}>URGE? GET HELP NOW</Text>
          </Pressable>
        </Animated.View>

        {/* ── Milestones — horizontal scroll ── */}
        <Animated.View entering={FadeInDown.delay(500).duration(800)}>
          <Text style={s.sectionTitle}>MILESTONES</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(550).duration(800)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.milestonesScroll}
            style={{ marginHorizontal: -Spacing.lg }}
          >
            {MILESTONES.map(m => {
              const achieved = currentStreak >= m.days;
              return (
                <Pressable
                  key={m.days}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMilestone(m); }}
                  style={({ pressed }) => [
                    s.milestoneCard,
                    achieved && s.milestoneCardAchieved,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={[s.milestoneDot, achieved && s.milestoneDotAchieved]}>
                    <FontAwesome
                      name={achieved ? 'check' : (m.icon as any)}
                      size={achieved ? 13 : 16}
                      color={achieved ? Colors.background : Colors.textDim}
                    />
                  </View>
                  <Text style={[s.milestoneDays, achieved && s.milestoneAchievedText]}>{m.days}d</Text>
                  <Text style={[s.milestoneTitle, achieved && s.milestoneAchievedText]} numberOfLines={1}>{m.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Quote */}
        <Animated.View entering={FadeIn.delay(600).duration(800)} style={s.quoteCard}>
          <Text style={s.quoteText}>"{QUOTES[quoteIndex]}"</Text>
        </Animated.View>

        {/* DEV: 365 preview */}
        {IS_DEV && (
          <Pressable style={s.devBtn} onPress={() => router.push('/milestone-365' as any)}>
            <Text style={s.devBtnText}>DEV: View 365 Screen 🌱</Text>
          </Pressable>
        )}

        {/* Relapse */}
        <Animated.View entering={FadeIn.delay(700).duration(800)} style={s.relapseWrap}>
          <Pressable
            style={({ pressed }) => [s.relapseBtn, pressed && { opacity: 0.5 }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); relapse(); }}
          >
            <Text style={s.relapseText}>I Relapsed</Text>
          </Pressable>
        </Animated.View>

      </ScrollView>

      {/* SOS Modal — Two Options */}
      <Modal visible={sosModalVisible} transparent animationType="fade" onRequestClose={() => setSosModalVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setSosModalVisible(false)}>
          <View style={s.sosModalCard}>
            <Text style={s.sosModalTitle}>What do you need?</Text>
            <Text style={s.sosModalSubtitle}>Choose what feels right for this moment.</Text>
            <View style={s.sosModalOptions}>
              <Pressable
                style={({ pressed }) => [s.sosOptionBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                onPress={() => {
                  setSosModalVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/tools/breathe');
                }}
              >
                <Text style={s.sosOptionEmoji}>🧘</Text>
                <Text style={s.sosOptionLabel}>Breathe</Text>
                <Text style={s.sosOptionDesc}>Guided breathing exercise</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.sosOptionBtn, s.sosOptionBtnCoach, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                onPress={() => {
                  setSosModalVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/chat');
                }}
              >
                <Text style={s.sosOptionEmoji}>💬</Text>
                <Text style={s.sosOptionLabel}>Talk to Coach</Text>
                <Text style={s.sosOptionDesc}>AI-powered support</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Milestone Detail Modal */}
      <Modal visible={!!selectedMilestone} transparent animationType="fade" onRequestClose={() => setSelectedMilestone(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setSelectedMilestone(null)}>
          <View style={s.modalCard}>
            <FontAwesome
              name={selectedMilestone?.icon as any}
              size={36}
              color={currentStreak >= (selectedMilestone?.days || 0) ? Colors.gold : Colors.textDim}
              style={{ marginBottom: Spacing.md }}
            />
            <Text style={s.modalTitle}>{selectedMilestone?.title}</Text>
            <Text style={s.modalDays}>{selectedMilestone?.days} days</Text>
            <Text style={s.modalDesc}>{selectedMilestone?.description}</Text>
            {currentStreak >= (selectedMilestone?.days || 0) && (
              <View style={s.achievedBadge}>
                <Text style={s.achievedText}>✓ Achieved</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Milestone Celebration Modal */}
      {shownMilestone && (
        <MilestoneModal
          visible={milestoneVisible}
          streak={shownMilestone}
          habitType={activeHabit.type}
          onClose={() => setMilestoneVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, marginBottom: Spacing.lg },
  brand: { fontSize: FontSize.xxl, fontWeight: FontWeight.thin, color: Colors.text, letterSpacing: -1, fontFamily: FF },
  habitLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: FF, letterSpacing: 0.5 },

  // Arc
  arcWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: Spacing.lg },
  arcInterior: { position: 'absolute', alignItems: 'center' },
  daysNum: { fontSize: 72, fontWeight: FontWeight.thin, color: Colors.text, letterSpacing: -3, fontFamily: FF, lineHeight: 74 },
  daysLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 3, fontFamily: FF, marginTop: -4 },
  timer: { fontSize: FontSize.sm, color: Colors.textDim, fontFamily: FF, letterSpacing: 2, marginTop: Spacing.xs },

  // Milestone progress bar
  milestoneWrap: { marginBottom: Spacing.lg },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  milestoneLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF },
  milestoneBg: { height: 2, backgroundColor: Colors.border, borderRadius: 1, overflow: 'hidden' },
  milestoneFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 1 },

  // Stats Row
  statsRow: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: BorderRadius.xl, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.gold },
  statBox: { flex: 1, padding: Spacing.lg, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4, fontFamily: FF },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.light, color: Colors.text, fontFamily: FF },

  // Savings
  savingsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  savingBox: { flex: 1, backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  savingValue: { fontSize: FontSize.xl, fontWeight: FontWeight.light, color: Colors.text, fontFamily: FF, marginBottom: 4 },
  savingLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontFamily: FF },
  savingBoxEmpty: { borderStyle: 'dashed', borderColor: Colors.gold + '50', justifyContent: 'center' },
  savingEmptyText: { fontSize: FontSize.xs, color: Colors.gold, fontFamily: FF, letterSpacing: 0.5 },

  // CTA
  actionWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: -28,
    zIndex: 10,
  },
  actionBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  actionText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.background, letterSpacing: 2, fontFamily: FF },
  actionDone: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionDoneText: { fontSize: FontSize.md, color: Colors.textDim, fontFamily: FF, letterSpacing: 1 },

  // SOS
  sosWrap: { marginBottom: Spacing.xxl },
  sosBtn: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.error + '50', borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  sosText: { fontSize: FontSize.sm, color: Colors.error, letterSpacing: 2, fontWeight: FontWeight.bold, fontFamily: FF },

  // SOS Modal
  sosModalCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.xxl,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  sosModalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.text, fontFamily: FF, marginBottom: 4 },
  sosModalSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: FF, marginBottom: Spacing.xl },
  sosModalOptions: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  sosOptionBtn: {
    flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center',
  },
  sosOptionBtnCoach: { borderColor: Colors.gold + '50' },
  sosOptionEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  sosOptionLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, fontFamily: FF, marginBottom: 4 },
  sosOptionDesc: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, textAlign: 'center' },

  // Milestones — horizontal scroll
  sectionTitle: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.md, fontFamily: FF },
  milestonesScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  milestoneCard: {
    width: 90, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  milestoneCardAchieved: { borderColor: Colors.gold + '60', backgroundColor: Colors.gold + '08' },
  milestoneDot: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background,
    marginBottom: Spacing.xs,
  },
  milestoneDotAchieved: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  milestoneDays: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, letterSpacing: 1, marginBottom: 2 },
  milestoneTitle: { fontSize: 11, color: Colors.textSecondary, fontFamily: FF, fontWeight: FontWeight.medium, textAlign: 'center' },
  milestoneAchievedText: { color: Colors.text },

  // Quote
  quoteCard: { backgroundColor: Colors.card, padding: Spacing.xl, borderRadius: BorderRadius.xl, marginTop: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  quoteText: { fontSize: FontSize.md, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 24, textAlign: 'center', fontFamily: FF },

  // DEV
  devBtn: { alignSelf: 'center', marginBottom: Spacing.md, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#22c55e30', backgroundColor: '#22c55e10' },
  devBtnText: { color: '#22c55e', fontSize: FontSize.xs, fontFamily: FF },

  // Relapse
  relapseWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  relapseBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  relapseText: { fontSize: FontSize.sm, color: Colors.error, fontFamily: FF, letterSpacing: 1, textDecorationLine: 'underline' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  modalCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.xxl, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.text, fontFamily: FF, marginBottom: 4 },
  modalDays: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: FF, marginBottom: Spacing.lg },
  modalDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, fontFamily: FF },
  achievedBadge: { marginTop: Spacing.lg, backgroundColor: Colors.gold + '20', borderRadius: 100, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.gold + '50' },
  achievedText: { color: Colors.gold, fontSize: FontSize.sm, fontFamily: FF, fontWeight: FontWeight.medium },
});

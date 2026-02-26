import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily } from '@/constants/Theme';
import { useHabitStore, JournalEntry } from '@/stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, Layout, SlideOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type MoodType = JournalEntry['mood'];

const MOODS: { type: MoodType; icon: keyof typeof FontAwesome.glyphMap; label: string; color: string }[] = [
    { type: 'great', icon: 'smile-o', label: 'Great', color: '#4ade80' },
    { type: 'good', icon: 'smile-o', label: 'Good', color: '#a3e635' },
    { type: 'neutral', icon: 'meh-o', label: 'Okay', color: Colors.textMuted },
    { type: 'bad', icon: 'frown-o', label: 'Bad', color: '#f87171' },
    { type: 'terrible', icon: 'frown-o', label: 'Terrible', color: '#ef4444' },
];

export default function JournalToolScreen() {
    const { addJournalEntry, deleteJournalEntry, journalEntries } = useHabitStore();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'write'>('list');
    const [entry, setEntry] = useState('');
    const [selectedMood, setSelectedMood] = useState<MoodType | undefined>();

    const handleSave = () => {
        if (!entry.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addJournalEntry(entry, selectedMood);
        setEntry('');
        setSelectedMood(undefined);
        setViewMode('list');
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Entry",
            "This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Destroy",
                    style: "destructive",
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        deleteJournalEntry(id);
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
    };

    const formatTime = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const renderEntries = () => {
        return journalEntries.filter(e => !e.isBot).map((entry, i) => {
            const moodData = MOODS.find(m => m.type === entry.mood);

            return (
                <Animated.View
                    entering={FadeInDown.delay(i * 100).duration(500).springify()}
                    exiting={SlideOutDown.duration(300)}
                    layout={Layout.springify()}
                    key={entry.id}
                    style={s.entryCard}
                >
                    {/* Mood color accent line on the left */}
                    {moodData && (
                        <View style={[s.moodAccentLine, { backgroundColor: moodData.color }]} />
                    )}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
                    />

                    <View style={s.entryHeader}>
                        <View style={s.dateRow}>
                            <Text style={s.entryTime}>{formatTime(entry.date)}</Text>
                            <Text style={s.entryDateSeparator}>|</Text>
                            <Text style={s.entryDate}>{formatDate(entry.date)}</Text>
                        </View>
                        <Pressable
                            onPress={() => handleDelete(entry.id)}
                            style={({ pressed }) => [{ padding: 8 }, pressed && { opacity: 0.5 }]}
                            hitSlop={15}
                        >
                            <FontAwesome name="trash" size={14} color={Colors.textDim} />
                        </Pressable>
                    </View>

                    {moodData && (
                        <View style={[s.moodBadge, { borderColor: moodData.color + '40', backgroundColor: moodData.color + '15' }]}>
                            <FontAwesome name={moodData.icon} size={12} color={moodData.color} style={{ marginRight: 6 }} />
                            <Text style={[s.moodBadgeText, { color: moodData.color }]}>{moodData.label}</Text>
                        </View>
                    )}

                    <Text style={s.entryText}>{entry.text}</Text>
                </Animated.View>
            );
        });
    };

    return (
        <View style={s.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={s.header}>
                        <Pressable
                            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                if (viewMode === 'write') {
                                    setViewMode('list');
                                } else {
                                    router.back();
                                }
                            }}
                        >
                            <FontAwesome name="chevron-left" size={16} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.headerTitle}>{viewMode === 'write' ? 'CAPSULE ENTRY' : 'ARCHIVE'}</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    {viewMode === 'write' ? (
                        <>
                            <ScrollView style={s.content} contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                                <Animated.Text entering={FadeInDown.delay(100)} style={s.sectionTitle}>CURRENT STATE</Animated.Text>
                                <Animated.View entering={FadeInDown.delay(200)} style={s.moodSelector}>
                                    {MOODS.map(mood => {
                                        const isSelected = selectedMood === mood.type;
                                        return (
                                            <Pressable
                                                key={mood.type}
                                                style={({ pressed }) => [
                                                    s.moodOption,
                                                    isSelected && { borderColor: mood.color, backgroundColor: mood.color + '20' },
                                                    pressed && { transform: [{ scale: 0.95 }] }
                                                ]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedMood(mood.type);
                                                }}
                                            >
                                                <FontAwesome
                                                    name={mood.icon}
                                                    size={22}
                                                    color={isSelected ? mood.color : Colors.textDim}
                                                    style={[
                                                        { marginBottom: 6 },
                                                        isSelected && { textShadowColor: mood.color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 }
                                                    ]}
                                                />
                                                <Text style={[s.moodLabel, isSelected && { color: mood.color, fontWeight: 'bold' }]}>
                                                    {mood.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </Animated.View>

                                <Animated.Text entering={FadeInDown.delay(300)} style={[s.sectionTitle, { marginTop: Spacing.xl }]}>THOUGHT DUMP</Animated.Text>
                                <Animated.View entering={FadeInDown.delay(400)} style={s.inputContainer}>
                                    <LinearGradient
                                        colors={['rgba(20,20,30,0.8)', 'rgba(10,10,15,0.95)']}
                                        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
                                    />
                                    <TextInput
                                        style={s.textInput}
                                        placeholder="Type exactly what you're thinking. Getting it out breaks the cycle."
                                        placeholderTextColor={Colors.textDim}
                                        multiline
                                        autoFocus
                                        value={entry}
                                        onChangeText={setEntry}
                                        textAlignVertical="top"
                                    />
                                </Animated.View>
                            </ScrollView>

                            <Animated.View entering={FadeInDown.delay(500)} style={s.footerFixed}>
                                <LinearGradient colors={['rgba(5,5,10,0)', '#05050A']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <Pressable
                                    style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8 }, !entry.trim() && s.saveBtnDisabled]}
                                    onPress={handleSave}
                                    disabled={!entry.trim()}
                                >
                                    <Text style={s.saveBtnText}>COMMIT TO ARCHIVE</Text>
                                </Pressable>
                            </Animated.View>
                        </>
                    ) : (
                        <View style={s.listContainer}>
                            <ScrollView style={s.historyScroll} contentContainerStyle={{ paddingBottom: 150, paddingTop: Spacing.sm }} showsVerticalScrollIndicator={false}>
                                {journalEntries.filter(e => !e.isBot).length === 0 ? (
                                    <Animated.View entering={FadeIn.duration(800)} style={s.emptyState}>
                                        <View style={s.emptyIconCircle}>
                                            <FontAwesome name="archive" size={28} color={Colors.gold} />
                                        </View>
                                        <Text style={s.emptyStateText}>ARCHIVE EMPTY</Text>
                                        <Text style={s.emptyStateSubtext}>Writing helps contextualize your feelings and distance yourself from immediate urges.</Text>
                                    </Animated.View>
                                ) : (
                                    renderEntries()
                                )}
                            </ScrollView>

                            <Animated.View entering={FadeInDown.duration(400)} style={s.footerFixed}>
                                <LinearGradient colors={['rgba(5,5,10,0)', '#05050A', '#05050A']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <Pressable
                                    style={({ pressed }) => [s.newEntryBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setViewMode('write');
                                    }}
                                >
                                    <FontAwesome name="pencil" size={16} color={Colors.background} style={{ marginRight: 8 }} />
                                    <Text style={s.newEntryBtnText}>INITIALIZE ENTRY</Text>
                                </Pressable>
                            </Animated.View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05050A' }, // Deep black/blue slate
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, zIndex: 10 },
    backBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.sans, fontWeight: '900', color: Colors.gold, letterSpacing: 3, textTransform: 'uppercase' },
    sectionTitle: { fontSize: 11, fontFamily: FontFamily.sans, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.md },

    // Write Mode
    content: { flex: 1, padding: Spacing.xl },

    // Mood Selector
    moodSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
    moodOption: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    moodLabel: { fontSize: 9, fontFamily: FontFamily.sans, color: Colors.textDim, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

    inputContainer: {
        flex: 1,
        minHeight: 300,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: Spacing.lg,
        overflow: 'hidden'
    },
    textInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontFamily: FontFamily.sans, lineHeight: 26, zIndex: 2 },

    footerFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingBottom: 40, paddingTop: 40, zIndex: 20 },
    saveBtn: { backgroundColor: Colors.gold, paddingVertical: 18, borderRadius: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: Colors.gold, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    saveBtnText: { color: Colors.background, fontSize: FontSize.sm, fontFamily: FontFamily.sans, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase' },
    saveBtnDisabled: { opacity: 0.2, backgroundColor: Colors.border, shadowOpacity: 0 },

    // List Mode
    listContainer: { flex: 1 },
    newEntryBtn: { backgroundColor: Colors.gold, paddingVertical: 18, borderRadius: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 5 },
    newEntryBtnText: { color: Colors.background, fontSize: FontSize.sm, fontFamily: FontFamily.sans, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase' },
    historyScroll: { flex: 1, paddingHorizontal: Spacing.xl },

    // Empty State
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: Spacing.xl },
    emptyIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
    emptyStateText: { fontSize: FontSize.md, fontFamily: FontFamily.sans, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm, letterSpacing: 2 },
    emptyStateSubtext: { fontSize: FontSize.sm, fontFamily: FontFamily.sans, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },

    // Cards
    entryCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        paddingLeft: Spacing.lg + 12, // account for mood accent line
    },
    moodAccentLine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: BorderRadius.lg,
        borderBottomLeftRadius: BorderRadius.lg,
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, zIndex: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    entryTime: { fontSize: 11, fontFamily: FontFamily.sans, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 1 },
    entryDateSeparator: { fontSize: 10, fontFamily: FontFamily.sans, color: Colors.textDim, marginHorizontal: 8 },
    entryDate: { fontSize: 10, fontFamily: FontFamily.sans, color: Colors.textMuted, letterSpacing: 1 },

    moodBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginBottom: Spacing.md, borderWidth: 1, zIndex: 2 },
    moodBadgeText: { fontSize: 9, fontFamily: FontFamily.sans, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },

    entryText: { fontSize: FontSize.md, fontFamily: FontFamily.sans, color: Colors.text, lineHeight: 26, zIndex: 2 },
});

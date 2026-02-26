import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily, FontWeight } from '../constants/Theme';
import { useHabitStore } from '../stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { SlideInRight, FadeIn, FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

const FF = FontFamily.sans;

export default function ChatScreen() {
    const { chatMessages = [], sendChatMessage, isPremium } = useHabitStore();
    const [journalText, setJournalText] = React.useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();

    // Auto scroll to bottom & Premium Check Redirect
    useEffect(() => {
        const hasPremiumError = chatMessages.some(m => m.text === '__PREMIUM_REQUIRED__');
        if (hasPremiumError) {
            router.push('/paywall');
        }

        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
    }, [chatMessages]);

    const handleSendJournal = () => {
        if (journalText.trim()) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            sendChatMessage(journalText);
            setJournalText('');
        }
    };

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <SafeAreaView style={s.safeArea} edges={['top']}>
                <View style={s.header}>
                    <Pressable style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]} onPress={() => router.back()}>
                        <FontAwesome name="angle-left" size={28} color={Colors.text} />
                    </Pressable>
                    <View style={s.headerTitleWrap}>
                        <FontAwesome name="commenting-o" size={16} color={Colors.gold} style={{ marginRight: 6 }} />
                        <Text style={s.headerTitle}>Companion</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {!isPremium && (
                    <Pressable
                        style={s.premiumBanner}
                        onPress={() => router.push('/paywall')}
                    >
                        <FontAwesome name="lock" size={16} color={Colors.gold} style={{ marginRight: 8 }} />
                        <Text style={s.premiumBannerText}>AI Coach is a Premium feature</Text>
                        <View style={s.premiumBannerBtn}>
                            <Text style={s.premiumBannerBtnText}>Go Premium</Text>
                        </View>
                    </Pressable>
                )}

                <ScrollView ref={scrollViewRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Animated.View entering={FadeInDown.duration(600)} style={s.botMessage}>
                        <View style={s.botAvatar}><Text style={s.botAvatarText}>Q</Text></View>
                        <View style={s.botBubble}>
                            <Text style={s.botText}>How did today feel? Did you experience any strong urges, or did you hold the line easily? I&apos;m here to listen.</Text>
                        </View>
                    </Animated.View>

                    {[...chatMessages].map((entry, index) => {
                        if (entry.text === '__PREMIUM_REQUIRED__') return null;

                        const date = new Date(entry.date);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (entry.isBot) {
                            return (
                                <Animated.View key={entry.id} entering={FadeIn.delay(100)} style={s.botMessage}>
                                    <View style={s.botAvatar}><Text style={s.botAvatarText}>Q</Text></View>
                                    <View style={s.botBubble}>
                                        <Text style={s.botText}>{entry.text}</Text>
                                        <Text style={s.botTime}>{timeStr}</Text>
                                    </View>
                                </Animated.View>
                            );
                        }

                        return (
                            <Animated.View key={entry.id} entering={SlideInRight.delay(50)} style={s.userMessage}>
                                <View style={s.userBubble}>
                                    <Text style={s.userText}>{entry.text}</Text>
                                    <Text style={s.userTime}>{timeStr}</Text>
                                </View>
                            </Animated.View>
                        );
                    })}
                </ScrollView>

                <View style={s.inputWrapper}>
                    <View style={s.inputContainer}>
                        <TextInput style={s.textInput} placeholder="Type a message..." placeholderTextColor={Colors.textDim} value={journalText} onChangeText={setJournalText} multiline maxLength={1000} />
                        <Pressable style={({ pressed }) => [s.sendBtn, !journalText.trim() && s.sendBtnDisabled, pressed && journalText.trim() && { opacity: 0.7 }]} onPress={handleSendJournal} disabled={!journalText.trim()}>
                            <FontAwesome name="paper-plane" size={14} color={Colors.background} style={{ marginLeft: -2 }} />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    safeArea: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitleWrap: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: FontSize.md, color: Colors.gold, fontFamily: FF, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },

    // Chat Feed
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(212,175,55,0.1)',
        borderWidth: 1,
        borderColor: Colors.gold,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    premiumBannerText: {
        flex: 1,
        color: Colors.text,
        fontFamily: FF,
        fontSize: FontSize.sm,
    },
    premiumBannerBtn: {
        backgroundColor: Colors.gold,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
    },
    premiumBannerBtnText: {
        color: Colors.background,
        fontFamily: FF,
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Bubbles
    botMessage: { flexDirection: 'row', alignItems: 'flex-end', width: '90%' },
    botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
    botAvatarText: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: FF, fontWeight: 'bold' },
    botBubble: { flex: 1, backgroundColor: Colors.card, padding: Spacing.md, borderRadius: BorderRadius.lg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1f1f1f' },
    botText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: FF, lineHeight: 22 },
    botTime: { color: Colors.textMuted, fontSize: 10, fontFamily: FF, alignSelf: 'flex-start', marginTop: 6, opacity: 0.7 },

    userMessage: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },
    userBubble: { maxWidth: '85%', backgroundColor: Colors.gold + '15', padding: Spacing.md, borderRadius: BorderRadius.lg, borderBottomRightRadius: 4, borderWidth: 1, borderColor: Colors.gold },
    userText: { color: Colors.text, fontSize: FontSize.sm, fontFamily: FF, lineHeight: 22 },
    userTime: { color: Colors.gold, fontSize: 10, fontFamily: FF, alignSelf: 'flex-end', marginTop: 6, opacity: 0.7 },

    // Input Area
    inputWrapper: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 8 },
    textInput: { flex: 1, minHeight: 40, maxHeight: 120, color: Colors.text, fontSize: FontSize.md, fontFamily: FF, paddingTop: 10, paddingBottom: 10, paddingRight: Spacing.sm },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    sendBtnDisabled: { opacity: 0.3, backgroundColor: Colors.border },
});

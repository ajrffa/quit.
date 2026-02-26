import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, Pressable, FlatList, TextInput, Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import { useAuthStore } from '@/stores/useAuthStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { fetchMessages, sendMessage, markAsRead, Message } from '@/services/dmService';
import ReportModal from '@/components/ReportModal';

const FF = FontFamily.sans;

export default function ConversationScreen() {
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    // Açılır Menü (Şikayet/Engelle) Durumu
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportTargetId, setReportTargetId] = useState<string | null>(null);

    const userId = user?.id || 'local-user';

    const loadMessages = useCallback(async () => {
        if (!conversationId) return;
        const data = await fetchMessages(conversationId, userId);
        setMessages(data);
        // Mark as read
        await markAsRead(conversationId, userId);
    }, [conversationId, userId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    const handleSend = async () => {
        if (!text.trim() || !conversationId || sending) return;
        setSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newMsg = await sendMessage(conversationId, userId, text.trim());
        if (newMsg) {
            setMessages(prev => [...prev, newMsg]);
            setText('');
            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
        setSending(false);
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={[s.msgRow, item.isMine ? s.msgRowMine : s.msgRowOther]}>
                <View style={[s.msgBubble, item.isMine ? s.msgBubbleMine : s.msgBubbleOther]}>
                    <Text style={[s.msgText, item.isMine ? s.msgTextMine : s.msgTextOther]}>
                        {item.content}
                    </Text>
                    <View style={s.msgMeta}>
                        <Text style={[s.msgTime, item.isMine && s.msgTimeMine]}>{time}</Text>
                        {item.isMine && (
                            <FontAwesome
                                name={item.isRead ? 'check-circle' : 'check-circle-o'}
                                size={12}
                                color={item.isRead ? Colors.gold : Colors.textDim}
                                style={{ marginLeft: 4 }}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.headerTitle}>Chat</Text>
                <Pressable
                    onPress={() => {
                        // Diğer kullanıcının ID'sini bul (kendi ID'miz olmayan herhangi bir mesajdan)
                        const otherMsg = messages.find(m => !m.isMine);
                        if (otherMsg) {
                            setReportTargetId(otherMsg.senderId);
                            setReportModalVisible(true);
                        } else {
                            // Mesaj yoksa engelleme/şikayet şimdilik devre dışı kalsın
                            // (conversation bilgisi yüklenince oradan da alınabilir)
                        }
                    }}
                    style={s.headerBtn}
                    disabled={!messages.some(m => !m.isMine)}
                >
                    <FontAwesome name="ellipsis-h" size={20} color={messages.some(m => !m.isMine) ? Colors.textMuted : 'transparent'} />
                </Pressable>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={s.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={s.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        flatListRef.current?.scrollToEnd({ animated: false });
                    }}
                    ListEmptyComponent={
                        <View style={s.emptyChat}>
                            <FontAwesome name="comments-o" size={40} color={Colors.textDim} />
                            <Text style={s.emptyChatText}>Start the conversation</Text>
                        </View>
                    }
                />

                {/* Input */}
                <BlurView intensity={80} tint="dark" style={[s.inputWrapper, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
                    <View style={s.inputContainer}>
                        <TextInput
                            style={s.textInput}
                            placeholder="Type a message..."
                            placeholderTextColor={Colors.textDim}
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={1000}
                        />
                        <Pressable
                            style={({ pressed }) => [
                                s.sendBtn,
                                !text.trim() && s.sendBtnDisabled,
                                pressed && text.trim() && { opacity: 0.7 },
                            ]}
                            onPress={handleSend}
                            disabled={!text.trim() || sending}
                        >
                            <FontAwesome name="arrow-up" size={16} color={Colors.background} />
                        </Pressable>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>

            {/* Engelle / Şikayet Modal */}
            {reportTargetId && (
                <ReportModal
                    visible={reportModalVisible}
                    onClose={() => setReportModalVisible(false)}
                    currentUserId={userId}
                    targetUserId={reportTargetId}
                    targetUserName="Kullanıcı" // conversation meta verisiyle genişletilebilir
                    contentId={conversationId}
                    contentType="message"
                    onBlocked={() => {
                        // Engellenirse önceki ekrana dön
                        router.back();
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.text, fontFamily: FF },

    // Messages List
    messagesList: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },

    // Message Rows
    msgRow: { width: '100%', marginBottom: Spacing.xs },
    msgRowMine: { alignItems: 'flex-end' },
    msgRowOther: { alignItems: 'flex-start' },

    // Bubbles
    msgBubble: {
        maxWidth: '80%', padding: Spacing.md, borderRadius: BorderRadius.lg,
    },
    msgBubbleMine: {
        backgroundColor: Colors.gold + '20', borderBottomRightRadius: 4,
        borderWidth: 1, borderColor: Colors.gold + '30',
    },
    msgBubbleOther: {
        backgroundColor: Colors.card, borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: Colors.border,
    },

    msgText: { fontSize: FontSize.md, lineHeight: 22, fontFamily: FF },
    msgTextMine: { color: Colors.text },
    msgTextOther: { color: Colors.textSecondary },

    msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    msgTime: { fontSize: 10, color: Colors.textDim, fontFamily: FF },
    msgTimeMine: { color: Colors.gold + '80' },

    // Empty
    emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyChatText: { color: Colors.textDim, fontSize: FontSize.md, fontFamily: FF, marginTop: Spacing.md },

    // Input
    inputWrapper: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end',
        backgroundColor: Colors.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: Spacing.md, paddingVertical: 8,
    },
    textInput: {
        flex: 1, minHeight: 40, maxHeight: 120,
        color: Colors.text, fontSize: FontSize.md, fontFamily: FF,
        paddingTop: 10, paddingBottom: 10,
    },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gold,
        alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm, marginBottom: 2,
    },
    sendBtnDisabled: { opacity: 0.3, backgroundColor: Colors.border },
});

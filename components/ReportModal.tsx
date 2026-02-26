/**
 * components/ReportModal.tsx
 * Engelle / Şikayet Et ortak modal bileşeni.
 * Community postları ve DM sohbetlerinde kullanılır.
 */

import React, { useState } from 'react';
import {
    StyleSheet, Text, View, Pressable, Modal, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { blockUser, reportContent, REPORT_REASONS, ReportReason } from '@/services/moderationService';

const FF = FontFamily.sans;

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    currentUserId: string;
    targetUserId: string;
    targetUserName: string;
    contentId?: string;
    contentType?: 'post' | 'reply' | 'message';
    onBlocked?: () => void;
}

export default function ReportModal({
    visible, onClose, currentUserId, targetUserId, targetUserName,
    contentId, contentType, onBlocked,
}: ReportModalProps) {
    const [mode, setMode] = useState<'menu' | 'report' | 'done'>('menu');
    const [loading, setLoading] = useState(false);
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);

    const handleBlock = async () => {
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await blockUser(currentUserId, targetUserId);
        setLoading(false);
        setMode('done');
        onBlocked?.();
    };

    const handleReport = async (reason: ReportReason) => {
        setLoading(true);
        setSelectedReason(reason);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (contentId && contentType) {
            await reportContent(currentUserId, contentId, contentType, reason);
        }
        setLoading(false);
        setMode('done');
    };

    const handleClose = () => {
        setMode('menu');
        setSelectedReason(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <Pressable style={s.backdrop} onPress={handleClose}>
                <Animated.View entering={SlideInUp.duration(300)} style={s.sheet}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        {/* Tutma Çubuğu */}
                        <View style={s.handle} />

                        {mode === 'menu' && (
                            <Animated.View entering={FadeIn.duration(200)}>
                                <Text style={s.sheetTitle}>{targetUserName}</Text>

                                {/* Engelle */}
                                <Pressable
                                    style={({ pressed }) => [s.menuItem, s.menuDanger, pressed && { opacity: 0.6 }]}
                                    onPress={handleBlock}
                                    disabled={loading}
                                >
                                    <FontAwesome name="ban" size={18} color="#ef4444" />
                                    <Text style={[s.menuText, s.menuTextDanger]}>Engelle</Text>
                                    {loading && <ActivityIndicator size="small" color="#ef4444" style={{ marginLeft: 'auto' }} />}
                                </Pressable>

                                {/* Şikayet Et */}
                                {contentId && (
                                    <Pressable
                                        style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.6 }]}
                                        onPress={() => setMode('report')}
                                    >
                                        <FontAwesome name="flag" size={18} color={Colors.textMuted} />
                                        <Text style={s.menuText}>Şikayet Et</Text>
                                    </Pressable>
                                )}

                                {/* İptal */}
                                <Pressable
                                    style={({ pressed }) => [s.menuItem, s.menuCancel, pressed && { opacity: 0.6 }]}
                                    onPress={handleClose}
                                >
                                    <Text style={s.cancelText}>İptal</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {mode === 'report' && (
                            <Animated.View entering={FadeIn.duration(200)}>
                                <Text style={s.sheetTitle}>Şikayet Nedeni</Text>
                                {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([key, label]) => (
                                    <Pressable
                                        key={key}
                                        style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.6 }]}
                                        onPress={() => handleReport(key)}
                                        disabled={loading}
                                    >
                                        <Text style={s.menuText}>{label}</Text>
                                        {loading && selectedReason === key && (
                                            <ActivityIndicator size="small" color={Colors.gold} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </Pressable>
                                ))}
                                <Pressable
                                    style={({ pressed }) => [s.menuItem, s.menuCancel, pressed && { opacity: 0.6 }]}
                                    onPress={() => setMode('menu')}
                                >
                                    <Text style={s.cancelText}>Geri</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {mode === 'done' && (
                            <Animated.View entering={FadeIn.duration(300)} style={s.doneWrap}>
                                <FontAwesome name="check-circle" size={48} color={Colors.gold} />
                                <Text style={s.doneTitle}>Teşekkürler</Text>
                                <Text style={s.doneText}>İşleminiz kaydedildi. Güvenliğiniz bizim için önemli.</Text>
                                <Pressable
                                    style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.7 }]}
                                    onPress={handleClose}
                                >
                                    <Text style={s.doneBtnText}>Tamam</Text>
                                </Pressable>
                            </Animated.View>
                        )}
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: Spacing.xl, paddingBottom: 40,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
        alignSelf: 'center', marginTop: 12, marginBottom: Spacing.lg,
    },
    sheetTitle: {
        fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text,
        fontFamily: FF, marginBottom: Spacing.lg, textAlign: 'center',
    },

    // Menü
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    menuDanger: {},
    menuText: { fontSize: FontSize.md, color: Colors.textSecondary, fontFamily: FF },
    menuTextDanger: { color: '#ef4444', fontWeight: FontWeight.medium },
    menuCancel: { justifyContent: 'center', borderBottomWidth: 0, marginTop: Spacing.sm },
    cancelText: { fontSize: FontSize.md, color: Colors.textMuted, fontFamily: FF, textAlign: 'center', width: '100%' },

    // Tamamlandı
    doneWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
    doneTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, fontFamily: FF, marginTop: Spacing.md },
    doneText: { fontSize: FontSize.md, color: Colors.textMuted, fontFamily: FF, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
    doneBtn: {
        backgroundColor: Colors.gold, borderRadius: 100, paddingVertical: 14, paddingHorizontal: 40,
        marginTop: Spacing.xl,
    },
    doneBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: FontWeight.bold, fontFamily: FF },
});

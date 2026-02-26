import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useAuthStore } from '../../stores/useAuthStore';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const FF = FontFamily.sans;

export default function VerifyScreen() {
    const router = useRouter();
    const { verifyOtp, isLoading, pendingEmail, clearPendingEmail } = useAuthStore();
    const [otp, setOtp] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    // If there's no pending email (user navigated here directly), send them back
    if (!pendingEmail) {
        if (typeof window !== 'undefined') {
            setTimeout(() => router.replace('/auth/register'), 0);
        }
        return null;
    }

    const canSubmit = otp.length === 6;

    const handleVerify = async () => {
        setLocalError(null);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Use Supabase native OTP verification
        const success = await verifyOtp(pendingEmail, otp);

        if (success) {
            clearPendingEmail();
            router.replace('/');
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setLocalError(useAuthStore.getState().error || 'Verification failed. Please try again.');
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <KeyboardAvoidingView
                style={s.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Back + Brand */}
                    <Animated.View entering={FadeIn.duration(400)} style={s.headerRow}>
                        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <Text style={s.brand}>quit.</Text>
                        <View style={{ width: 44 }} />
                    </Animated.View>

                    {/* Title */}
                    <Animated.Text entering={FadeInDown.duration(600)} style={s.title}>
                        Verify your{'\n'}email.
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>
                        We sent a 6-digit code to{'\n'}
                        <Text style={{ color: Colors.gold, fontWeight: '500' }}>{pendingEmail}</Text>
                    </Animated.Text>

                    {/* Error */}
                    {localError && (
                        <Animated.View entering={FadeIn.duration(300)} style={s.errorBox}>
                            <Text style={s.errorText}>{localError}</Text>
                            <Pressable onPress={() => setLocalError(null)}>
                                <Text style={s.errorDismiss}>✕</Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Form */}
                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.form}>
                        <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>VERIFICATION CODE</Text>
                            <TextInput
                                style={s.input}
                                placeholder="000000"
                                placeholderTextColor={Colors.textDim}
                                value={otp}
                                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))} // only numbers
                                keyboardType="number-pad"
                                maxLength={6}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="done"
                                onSubmitEditing={handleVerify}
                            />
                        </View>

                        <Text style={s.hintText}>
                            Check your spam folder if you don&apos;t see the email.
                        </Text>
                    </Animated.View>
                </ScrollView>

                {/* Submit */}
                <Animated.View entering={FadeInUp.delay(400).duration(800)} style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [
                            s.goldBtn,
                            !canSubmit && s.btnDisabled,
                            pressed && canSubmit && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={handleVerify}
                        disabled={!canSubmit || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.background} />
                        ) : (
                            <Text style={s.goldBtnText}>Verify & Create</Text>
                        )}
                    </Pressable>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 120 },

    // Header
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    brand: { fontSize: FontSize.md, color: Colors.gold, letterSpacing: 1, fontFamily: FF },

    // Title
    title: { fontSize: 36, fontWeight: FontWeight.light, color: Colors.text, lineHeight: 44, marginBottom: Spacing.sm, fontFamily: FF, letterSpacing: -0.5 },
    subtitle: { fontSize: FontSize.md, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.xl, fontFamily: FF, lineHeight: 24 },

    // Error
    errorBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '40',
        borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
    },
    errorText: { color: Colors.error, fontSize: FontSize.sm, fontFamily: FF, flex: 1 },
    errorDismiss: { color: Colors.error, fontSize: FontSize.md, paddingLeft: Spacing.md },

    // Form
    form: {},
    inputWrap: { marginBottom: Spacing.sm },
    inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, fontFamily: FF },
    input: {
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 16,
        fontSize: 32, color: Colors.gold, fontFamily: FF,
        letterSpacing: 12, textAlign: 'center', fontWeight: 'bold'
    },

    hintText: {
        fontSize: FontSize.xs, color: Colors.textDim, fontFamily: FF, textAlign: 'center', marginTop: Spacing.lg
    },

    // Bottom
    bottomFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, backgroundColor: Colors.background },
    goldBtn: {
        backgroundColor: Colors.gold, borderRadius: 100, paddingVertical: 18, alignItems: 'center',
    },
    goldBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1, fontFamily: FF, textTransform: 'uppercase' },
    btnDisabled: { opacity: 0.35 },
});

import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '../../constants/Theme';
import { useAuthStore } from '../../stores/useAuthStore';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { validatePassword, validateEmail } from '../../utils/sanitize';

const FF = FontFamily.sans;
const IS_DEV = __DEV__; // In production builds this is automatically false

export default function RegisterScreen() {
    const router = useRouter();
    const { signUp, isLoading, error, clearError, setPendingEmail } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordValidation = useMemo(() => validatePassword(password), [password]);
    const emailValidation = useMemo(() => validateEmail(email.trim()), [email]);

    const canSubmit = (IS_DEV && email.includes('test')) || (emailValidation.isValid && passwordValidation.isValid && password === confirmPassword && acceptedTerms);

    const strengthColors: Record<string, string> = {
        'weak': '#ef4444',
        'fair': '#f59e0b',
        'strong': '#22c55e',
    };

    const handleRegister = async () => {
        setLocalError(null);

        const isTestEmail = IS_DEV && email.trim().toLowerCase().includes('test');

        if (!isTestEmail) {
            if (!emailValidation.isValid) {
                setLocalError(emailValidation.error || 'Invalid email');
                return;
            }
            if (!passwordValidation.isValid) {
                setLocalError(passwordValidation.errors.join(', '));
                return;
            }
            if (password !== confirmPassword) {
                setLocalError('Passwords do not match');
                return;
            }
            if (!acceptedTerms) {
                setLocalError('You must accept the Terms of Service');
                return;
            }
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // DEV CHEAT: Bypass auth for "test" emails to avoid rate limits
        if (isTestEmail) {
            console.log('[DEV] Bypassing auth & email limits for test account');
            useAuthStore.setState({
                user: { id: 'dev-123', email: email.trim() } as any,
                session: { access_token: 'fake', refresh_token: 'fake', user: { id: 'dev-123' } } as any,
            });
            router.replace('/');
            return;
        }

        // Call Supabase signUp — this sends a verification email automatically
        const success = await signUp(email.trim(), password);
        if (success) {
            // Store pendingEmail for the verify screen
            setPendingEmail(email.trim().toLowerCase());
            router.push('/auth/verify');
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setLocalError(useAuthStore.getState().error || 'Registration failed. Please try again.');
        }
    };

    const displayError = localError || error;

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
                        Start your{'\n'}journey.
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={s.subtitle}>
                        Create an account to join the community.
                    </Animated.Text>

                    {/* Error */}
                    {displayError && (
                        <Animated.View entering={FadeIn.duration(300)} style={s.errorBox}>
                            <Text style={s.errorText}>{displayError}</Text>
                            <Pressable onPress={() => { setLocalError(null); clearError(); }}>
                                <Text style={s.errorDismiss}>✕</Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Form */}
                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.form}>
                        <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>EMAIL</Text>
                            <TextInput
                                style={s.input}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.textDim}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>PASSWORD</Text>
                            <View style={[s.inputContainer, password.length > 0 && !passwordValidation.isValid ? s.inputError : null]}>
                                <TextInput
                                    style={s.inputNoBorder}
                                    placeholder="Min 8 characters"
                                    placeholderTextColor={Colors.textDim}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                                    <FontAwesome name={showPassword ? "eye" : "eye-slash"} size={20} color={Colors.textMuted} />
                                </Pressable>
                            </View>
                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <View style={s.strengthWrap}>
                                    <View style={s.strengthBar}>
                                        <View style={[
                                            s.strengthFill,
                                            {
                                                width: passwordValidation.strength === 'strong' ? '100%' :
                                                    passwordValidation.strength === 'fair' ? '66%' : '33%',
                                                backgroundColor: strengthColors[passwordValidation.strength],
                                            }
                                        ] as any} />
                                    </View>
                                    <Text style={[s.strengthLabel, { color: strengthColors[passwordValidation.strength] }]}>
                                        {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                                    </Text>
                                </View>
                            )}
                            {password.length > 0 && passwordValidation.errors.length > 0 && (
                                <View style={s.rulesList}>
                                    {passwordValidation.errors.map((err, i) => (
                                        <Text key={i} style={s.ruleItem}>• {err}</Text>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>CONFIRM PASSWORD</Text>
                            <View style={[s.inputContainer, confirmPassword && password !== confirmPassword ? s.inputError : null]}>
                                <TextInput
                                    style={s.inputNoBorder}
                                    placeholder="••••••••"
                                    placeholderTextColor={Colors.textDim}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    returnKeyType="go"
                                    onSubmitEditing={handleRegister}
                                />
                                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={s.eyeBtn}>
                                    <FontAwesome name={showConfirmPassword ? "eye" : "eye-slash"} size={20} color={Colors.textMuted} />
                                </Pressable>
                            </View>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <Text style={s.fieldError}>Passwords do not match</Text>
                            )}
                        </View>

                        {/* Terms */}
                        <Pressable
                            style={s.termsRow}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setAcceptedTerms(!acceptedTerms);
                            }}
                        >
                            <View style={[s.checkbox, acceptedTerms && s.checkboxActive]}>
                                {acceptedTerms && <FontAwesome name="check" size={12} color={Colors.background} />}
                            </View>
                            <Text style={s.termsText}>
                                I agree to the{' '}
                                <Link href="/legal/terms" style={s.termsLink}>Terms of Service</Link>
                                {' '}and{' '}
                                <Link href="/legal/privacy" style={s.termsLink}>Privacy Policy</Link>
                            </Text>
                        </Pressable>
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
                        onPress={handleRegister}
                        disabled={!canSubmit || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.background} />
                        ) : (
                            <Text style={s.goldBtnText}>Create Account</Text>
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
    subtitle: { fontSize: FontSize.md, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.xl, fontFamily: FF },

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
    inputWrap: { marginBottom: Spacing.lg },
    inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, fontFamily: FF },
    input: {
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 16,
        fontSize: FontSize.md, color: Colors.text, fontFamily: FF,
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
    },
    inputNoBorder: {
        flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: 16,
        fontSize: FontSize.md, color: Colors.text, fontFamily: FF,
        backgroundColor: 'transparent',
    },
    eyeBtn: {
        paddingHorizontal: Spacing.lg, paddingVertical: 16,
        justifyContent: 'center', alignItems: 'center',
    },

    // Terms
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing.sm },
    checkbox: {
        width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, marginTop: 2,
    },
    checkboxActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
    termsText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, lineHeight: 20 },
    termsLink: { color: Colors.gold, fontWeight: FontWeight.medium },

    // Password Strength
    strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontFamily: FF, fontWeight: FontWeight.medium },
    rulesList: { marginTop: 6 },
    ruleItem: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, lineHeight: 18 },

    // Field Errors
    inputError: { borderColor: Colors.error + '80' },
    fieldError: { color: Colors.error, fontSize: FontSize.xs, fontFamily: FF, marginTop: 4 },

    // Bottom
    bottomFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, backgroundColor: Colors.background },
    goldBtn: {
        backgroundColor: Colors.gold, borderRadius: 100, paddingVertical: 18, alignItems: 'center',
    },
    goldBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1, fontFamily: FF, textTransform: 'uppercase' },
    btnDisabled: { opacity: 0.35 },
});

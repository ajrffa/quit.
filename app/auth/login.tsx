import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import { useAuthStore } from '@/stores/useAuthStore';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { signInWithApple, signInWithGoogle, isAppleSignInAvailable } from '@/services/socialAuth';

const FF = FontFamily.sans;
const IS_DEV = __DEV__;

export default function LoginScreen() {
    const router = useRouter();
    const { signIn, isLoading, error, clearError } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
    const [appleAvailable, setAppleAvailable] = useState(false);

    useEffect(() => {
        isAppleSignInAvailable().then(setAppleAvailable);
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // DEV CHEAT: Bypass Supabase for test accounts
        if (IS_DEV && email.trim().toLowerCase().includes('test')) {
            console.log('[DEV] Creating local pseudo-session for test address in Login');
            useAuthStore.setState({
                user: { id: 'dev-123', email: email.trim() } as any,
                session: { access_token: 'fake', refresh_token: 'fake', user: { id: 'dev-123' } } as any
            });
            router.replace('/');
            return;
        }

        const success = await signIn(email.trim(), password);
        if (success) {
            router.replace('/');
        }
    };

    const handleApple = async () => {
        setSocialLoading('apple');
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await signInWithApple();
            if (success) router.replace('/');
        } catch {
            // Error handled in socialAuth service
        } finally {
            setSocialLoading(null);
        }
    };

    const handleGoogle = async () => {
        setSocialLoading('google');
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await signInWithGoogle();
            if (success) router.replace('/');
        } catch {
            // Error handled in socialAuth service
        } finally {
            setSocialLoading(null);
        }
    };

    const isBusy = isLoading || socialLoading !== null;

    return (
        <SafeAreaView style={s.container}>
            <KeyboardAvoidingView
                style={s.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header with Back Button */}
                    <Animated.View entering={FadeIn.duration(400)} style={s.headerRow}>
                        <Pressable onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/');
                            }
                        }} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                            <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                        </Pressable>
                        <View style={{ flex: 1 }} />
                    </Animated.View>

                    {/* Logo */}
                    <Animated.View entering={FadeInDown.duration(1000).springify().damping(20)} style={s.logoWrap}>
                        <Text style={s.logo}>quit</Text>
                        <Animated.View entering={FadeIn.delay(600).duration(800)} style={s.dot} />
                    </Animated.View>

                    <Animated.Text entering={FadeIn.delay(300).duration(800)} style={s.tagline}>
                        Welcome back, warrior.
                    </Animated.Text>

                    {/* Error */}
                    {error && (
                        <Animated.View entering={FadeIn.duration(300)} style={s.errorBox}>
                            <Text style={s.errorText}>{error}</Text>
                            <Pressable onPress={clearError}>
                                <Text style={s.errorDismiss}>✕</Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Social Login Buttons */}
                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={s.socialSection}>
                        {appleAvailable && (
                            <Pressable
                                style={({ pressed }) => [s.socialBtn, s.appleBtn, pressed && { opacity: 0.8 }]}
                                onPress={handleApple}
                                disabled={isBusy}
                            >
                                {socialLoading === 'apple' ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <FontAwesome name="apple" size={20} color="#fff" />
                                        <Text style={s.socialBtnText}>Continue with Apple</Text>
                                    </>
                                )}
                            </Pressable>
                        )}

                        <Pressable
                            style={({ pressed }) => [s.socialBtn, s.googleBtn, pressed && { opacity: 0.8 }]}
                            onPress={handleGoogle}
                            disabled={isBusy}
                        >
                            {socialLoading === 'google' ? (
                                <ActivityIndicator color={Colors.text} />
                            ) : (
                                <>
                                    <FontAwesome name="google" size={18} color="#4285F4" />
                                    <Text style={[s.socialBtnText, { color: Colors.text }]}>Continue with Google</Text>
                                </>
                            )}
                        </Pressable>
                    </Animated.View>

                    {/* Divider */}
                    <View style={s.dividerRow}>
                        <View style={s.dividerLine} />
                        <Text style={s.dividerText}>OR</Text>
                        <View style={s.dividerLine} />
                    </View>

                    {/* Email/Password Form */}
                    <Animated.View entering={FadeInDown.delay(500).duration(800)} style={s.form}>
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
                            <View style={s.inputContainer}>
                                <TextInput
                                    style={s.inputNoBorder}
                                    placeholder="••••••••"
                                    placeholderTextColor={Colors.textDim}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    returnKeyType="go"
                                    onSubmitEditing={handleLogin}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                                    <FontAwesome name={showPassword ? "eye" : "eye-slash"} size={20} color={Colors.textMuted} />
                                </Pressable>
                            </View>
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                s.goldBtn,
                                (!email.trim() || !password) && s.btnDisabled,
                                pressed && email.trim() && password && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={handleLogin}
                            disabled={!email.trim() || !password || isBusy}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.background} />
                            ) : (
                                <Text style={s.goldBtnText}>Sign In</Text>
                            )}
                        </Pressable>
                    </Animated.View>
                </ScrollView>

                {/* Bottom: Create Account */}
                <Animated.View entering={FadeInUp.delay(700).duration(800)} style={s.bottomFixed}>
                    <Pressable
                        style={({ pressed }) => [s.outlineBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/auth/register' as any);
                        }}
                    >
                        <Text style={s.outlineBtnText}>Create Account</Text>
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

    // Header & Logo
    headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    logoWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: '5%', marginBottom: Spacing.sm },
    logo: { fontSize: 48, fontWeight: FontWeight.thin, color: Colors.text, letterSpacing: -3, fontFamily: FF },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gold, marginBottom: 16, marginLeft: 3 },
    tagline: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', letterSpacing: 2, fontFamily: FF, textTransform: 'uppercase', marginBottom: Spacing.xl },

    // Error
    errorBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '40',
        borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
    },
    errorText: { color: Colors.error, fontSize: FontSize.sm, fontFamily: FF, flex: 1 },
    errorDismiss: { color: Colors.error, fontSize: FontSize.md, paddingLeft: Spacing.md },

    // Social Buttons
    socialSection: { gap: Spacing.sm, marginBottom: Spacing.lg },
    socialBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        borderRadius: 100, paddingVertical: 16, borderWidth: 1,
    },
    appleBtn: { backgroundColor: '#000', borderColor: '#333' },
    googleBtn: { backgroundColor: Colors.card, borderColor: Colors.border },
    socialBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.medium, fontFamily: FF },

    // Divider
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { color: Colors.textDim, fontSize: FontSize.xs, marginHorizontal: Spacing.md, fontFamily: FF, letterSpacing: 2 },

    // Form
    form: { gap: Spacing.md },
    inputWrap: {},
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

    // Buttons
    goldBtn: {
        backgroundColor: Colors.gold, borderRadius: 100, paddingVertical: 18, alignItems: 'center',
        marginTop: Spacing.sm,
    },
    goldBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1, fontFamily: FF, textTransform: 'uppercase' },
    btnDisabled: { opacity: 0.35 },

    // Bottom
    bottomFixed: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, backgroundColor: Colors.background },
    outlineBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 100, paddingVertical: 18, alignItems: 'center', backgroundColor: Colors.card },
    outlineBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, letterSpacing: 1, fontFamily: FF },
});

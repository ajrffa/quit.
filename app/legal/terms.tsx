import React from 'react';
import { StyleSheet, Text, ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const FF = FontFamily.sans;

export default function TermsOfServiceScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={s.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.headerTitle}>Terms of Service</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={s.scrollContent}>
                <Text style={s.lastUpdated}>Last Updated: February 2026</Text>

                <Text style={s.sectionTitle}>1. Acceptance of Terms</Text>
                <Text style={s.paragraph}>
                    By accessing or using the quit. application, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service.
                </Text>

                <Text style={s.sectionTitle}>2. Description of Service</Text>
                <Text style={s.paragraph}>
                    quit. provides a community-driven addiction recovery tracking tool. We do not provide medical advice. The information and tools provided by quit. are for educational and motivational purposes only and are not a substitute for professional medical treatment.
                </Text>

                <Text style={s.sectionTitle}>3. User Accounts</Text>
                <Text style={s.paragraph}>
                    To use certain features of the service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
                </Text>

                <Text style={s.sectionTitle}>4. Community Guidelines</Text>
                <Text style={s.paragraph}>
                    quit. is a supportive community. We have a zero-tolerance policy for harassment, hate speech, spam, or any form of toxic behavior. Users found violating these guidelines will have their accounts terminated immediately without prior notice.
                </Text>

                <Text style={s.sectionTitle}>5. Termination</Text>
                <Text style={s.paragraph}>
                    We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: FontSize.md, color: Colors.text, fontFamily: FF, fontWeight: FontWeight.medium },
    scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
    lastUpdated: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: FF, marginBottom: Spacing.xl },
    sectionTitle: { fontSize: FontSize.lg, color: Colors.gold, fontFamily: FF, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.lg },
    paragraph: { fontSize: FontSize.sm, color: Colors.textSecondary, fontFamily: FF, lineHeight: 22 },
});

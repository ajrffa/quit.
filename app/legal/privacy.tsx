import React from 'react';
import { StyleSheet, Text, ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, FontFamily } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const FF = FontFamily.sans;

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={s.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.textMuted} />
                </Pressable>
                <Text style={s.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={s.scrollContent}>
                <Text style={s.lastUpdated}>Last Updated: February 2026</Text>

                <Text style={s.sectionTitle}>1. Information We Collect</Text>
                <Text style={s.paragraph}>
                    We only collect information necessary to provide our service. This includes the email address you use to register, and the habit tracking data you explicitly provide within the app (such as start dates, streak counts, and check-in history).
                </Text>

                <Text style={s.sectionTitle}>2. How We Use Your Information</Text>
                <Text style={s.paragraph}>
                    Your data is used solely to maintain your account, track your progress, and provide you with personalized statistics and community features. We use your email to send essential account notifications, such as verification codes.
                </Text>

                <Text style={s.sectionTitle}>3. Data Security</Text>
                <Text style={s.paragraph}>
                    We implement a variety of security measures to maintain the safety of your personal information. Your account is secured by Supabase Auth, and all passwords and sensitive data are cryptographically hashed. We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information.
                </Text>

                <Text style={s.sectionTitle}>4. Data Deletion</Text>
                <Text style={s.paragraph}>
                    You have the right to request the deletion of your account and all associated data at any time. This can be done through the application settings or by contacting our support team. Once requested, your data will be permanently erased from our active databases.
                </Text>

                <Text style={s.sectionTitle}>5. Changes to This Policy</Text>
                <Text style={s.paragraph}>
                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
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

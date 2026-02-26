import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useHabitStore } from '../stores/useHabitStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Colors } from '../constants/Theme';

export default function AppGatekeeper() {
    const _hasHydrated = useHabitStore(s => s._hasHydrated);
    const onboardingComplete = useHabitStore(s => s.onboardingComplete);
    const { session, isInitialized } = useAuthStore();

    // Wait for both stores to hydrate
    if (!_hasHydrated || !isInitialized) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={Colors.gold} />
            </View>
        );
    }

    // Authenticated but hasn't completed onboarding
    if (!onboardingComplete) {
        return <Redirect href="/onboarding/welcome" />;
    }

    // All good → main app
    return <Redirect href="/(tabs)" />;
}

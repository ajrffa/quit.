import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors, FontFamily, FontSize } from '@/constants/Theme';
import { useHabitStore } from '@/stores/useHabitStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function AppLockOverlay() {
    const { isAppLockEnabled, _hasHydrated } = useHabitStore();
    const [isLocked, setIsLocked] = useState(false);
    const [authHasFailed, setAuthHasFailed] = useState(false);

    // Prompt authentication
    const promptAuthentication = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Quit',
                fallbackLabel: 'Use Passcode',
                cancelLabel: 'Cancel',
            });

            if (result.success) {
                setIsLocked(false);
                setAuthHasFailed(false);
            } else {
                setAuthHasFailed(true);
            }
        } else {
            // Unlikely to happen if the user enabled the feature on a device, but fallback to unlocked
            setIsLocked(false);
        }
    };

    useEffect(() => {
        // App must be fully loaded
        if (!_hasHydrated) return;

        // If the user hasn't enabled the app lock, don't lock
        if (!isAppLockEnabled) {
            setIsLocked(false);
            return;
        }

        // On mount, if it's enabled, lock it and trigger auth.
        setIsLocked(true);
        promptAuthentication();

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                setIsLocked(true);
            } else if (nextAppState === 'active') {
                if (isLocked) {
                    promptAuthentication();
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [_hasHydrated, isAppLockEnabled]);

    if (!isLocked) return null;

    return (
        <View style={StyleSheet.absoluteFillObject}>
            <View style={s.lockContainer}>
                <FontAwesome name="lock" size={64} color={Colors.gold} style={{ marginBottom: 20 }} />
                <Text style={s.title}>Quit is Locked</Text>

                {authHasFailed && (
                    <Text style={s.instruction} onPress={promptAuthentication}>
                        Tap here to try unlocking again
                    </Text>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    lockContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontFamily: FontFamily.sans,
        fontSize: FontSize.lg,
        color: Colors.text,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    instruction: {
        fontFamily: FontFamily.sans,
        fontSize: FontSize.md,
        color: Colors.gold,
        marginTop: 20,
        textDecorationLine: 'underline',
    },
});

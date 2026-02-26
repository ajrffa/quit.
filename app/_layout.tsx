import 'react-native-reanimated';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/Theme';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  registerForPushNotifications,
  scheduleStreakReminder,
  addNotificationResponseListener,
} from '@/services/notificationService';
import { logger } from '@/utils/logger';
import { AppLockOverlay } from '@/components/ui/AppLockOverlay';
import { Platform } from 'react-native';

import { useEffect } from 'react';
import {
  useFonts,
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const BirakDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.gold,
    background: Colors.background,
    card: Colors.tabBar,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.gold,
  },
};

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize);

  const [loaded, error] = useFonts({
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold
  });

  useEffect(() => {
    initialize();

    // Initialize RevenueCat
    const rcKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
    if (rcKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Purchases = require('react-native-purchases').default;
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: rcKey });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: rcKey });
        }
      } catch (e) {
        logger.warn('Failed to initialize RevenueCat', e);
      }
    }

    // Register for push notifications
    registerForPushNotifications().catch(() => { });
    scheduleStreakReminder(true).catch(() => { });

    // Handle notification taps
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as any;
      // Can navigate based on data.type if needed
      logger.info('[Bildirim tıklama]', data);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <ThemeProvider value={BirakDarkTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="dm" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding/welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <AppLockOverlay />
    </ThemeProvider>
  );
}

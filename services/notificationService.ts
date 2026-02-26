/**
 * notificationService.ts
 *
 * 3 tip bildirim: sabah motivasyonu, milestone yaklaşım, relapse prevention.
 */

import * as Notifications from 'expo-notifications';
import { HabitType } from '../stores/useHabitStore';

// ── _layout.tsx uyumluluk shimları ──────────────────────────────────────────
export async function registerForPushNotifications(): Promise<void> {
    await requestNotificationPermissions();
}

export async function scheduleStreakReminder(_enabled: boolean): Promise<void> {
    // Artık scheduleAllNotifications ile yönetiliyor
}

export function addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
): { remove: () => void } {
    const sub = Notifications.addNotificationResponseReceivedListener(listener);
    return { remove: () => sub.remove() };
}
// ─────────────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
function getNextMilestone(streak: number): number | null {
    return MILESTONES.find(m => m > streak) ?? null;
}

const MORNING_MESSAGES: Record<HabitType | 'other', (name: string, streak: number) => string> = {
    smoking: (n, d) => `Günaydın ${n}! ${d}. günün başlıyor. Bugün de ciğerlerin biraz daha temizlendi. 🫁`,
    alcohol: (n, d) => `Günaydın ${n}! ${d} gündür temizsin. Karaciğerin nazarlarla bakıyor. 💧`,
    social_media: (n, d) => `Günaydın ${n}! ${d} gündür gerçek hayattasın. Bugün ne üreteceksin? 🎯`,
    sugar: (n, d) => `Günaydın ${n}! ${d} gündür şekeriz. Enerji seviyen daha stabil. ⚡`,
    pornography: (n, d) => `Günaydın ${n}! ${d} gündür güçlüsün. Bugün de bu gücü koru. 🛡️`,
    gambling: (n, d) => `Günaydın ${n}! ${d} gündür kumardan uzaksın. Cüzdanın minnettar. 💰`,
    junk_food: (n, d) => `Günaydın ${n}! ${d} gündür sağlıklı besleniyorsun. Bedenin teşekkür ediyor. 🥗`,
    nail_biting: (n, d) => `Günaydın ${n}! ${d} gündür tırnaklarına sahip çıkıyorsun. 💅`,
    other: (n, d) => `Günaydın ${n}! ${d}. gün. Bugün de güçlüsün. 💪`,
};

const MILESTONE_APPROACH: Record<HabitType | 'other', (next: number) => string> = {
    smoking: (next) => `Yarın ${next}. günün! Vücudunda büyük bir değişim eşiğine geliyorsun. 🫁`,
    alcohol: (next) => `Yarın ${next}. günün! Karaciğer iyileşmesinde kritik bir noktaya yaklaşıyorsun. 💧`,
    social_media: (next) => `Yarın ${next}. günün! Odağın zirveye çıkmak üzere. 🎯`,
    sugar: (next) => `Yarın ${next}. günün! Kan şekeri dengesi eşiğine yaklaşıyorsun. ⚡`,
    pornography: (next) => `Yarın ${next}. günün! Önemli bir dönüşüm eşiğine geliyorsun. 🛡️`,
    gambling: (next) => `Yarın ${next}. günün! Finansal özgürlüğe bir adım daha yakınsın. 💰`,
    junk_food: (next) => `Yarın ${next}. günün! Vücudun büyük bir iyileşme noktasına geliyor. 🥗`,
    nail_biting: (next) => `Yarın ${next}. günün! Tırnakların güçleniyor! 💪`,
    other: (next) => `Yarın ${next}. günün! Bu eşiği aşmak için mükemmel konumdasın. 🏆`,
};

const RELAPSE_PREVENTION: Record<HabitType | 'other', (streak: number) => string> = {
    smoking: (d) => `${d} günlük başarına dikkat et — bugün giriş yapmayı unutma! 🔥`,
    alcohol: (d) => `${d} günlük temizliğini koru. Bugün bir saniye bile önemli. 💧`,
    social_media: (d) => `${d} günlük odağını boşa harcama. Giriş yap, streakini koru. 📵`,
    sugar: (d) => `${d} günlük sağlıklı yaşamın devam etsin. Bugün giriş yapmayı unutma! ⚡`,
    pornography: (d) => `${d} günlük gücün var. Bugün de güçlü ol! 🛡️`,
    gambling: (d) => `${d} günlük başarını kaybetme. Giriş yap! 💰`,
    junk_food: (d) => `${d} günlük sağlıklı beslenmen devam ediyor. Kontrol sende! 🥗`,
    nail_biting: (d) => `${d} günlük iyileşmen var. Bugün de devam et! 💪`,
    other: (d) => `${d} günlük başarın tehlikede! Giriş yaparak streakini koru. 🔥`,
};

export async function scheduleAllNotifications(
    habitType: HabitType | 'other',
    currentStreak: number,
    userName: string,
): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const name = userName || 'Mücadeleci';

    // 1. Sabah Motivasyon — her gün 09:00
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'quit. günlük hatırlatma',
            body: MORNING_MESSAGES[habitType](name, currentStreak + 1),
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
        },
    });

    // 2. Milestone Yaklaşım — 1 gün kala, akşam 19:00
    const nextMilestone = getNextMilestone(currentStreak);
    if (nextMilestone !== null && (nextMilestone - currentStreak) === 1) {
        const tonight = new Date();
        tonight.setHours(19, 0, 0, 0);
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🏆 Kritik Eşik Yarın!',
                body: MILESTONE_APPROACH[habitType](nextMilestone),
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: tonight,
            },
        });
    }

    // 3. Relapse Prevention — 48 saat sonra
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '⚠️ Streakini Kaybetmek Üzeresin',
            body: RELAPSE_PREVENTION[habitType](currentStreak),
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2 * 24 * 60 * 60,
            repeats: false,
        },
    });
}

export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Haftalık Özet Bildirimi (Her Pazar 20:00) ─────────────────────────────
const WEEKLY_MOTIVATION: ((streak: number) => string)[] = [
    (s) => `${s} günlük yolculuğun devam ediyor. Her gün biraz daha özgürsün.`,
    (s) => `${s} gün tamam! Beynin bugün bir hafta öncesine göre çok daha güçlü.`,
    (s) => `Bu hafta da kazandın. ${s} günlük streak — bu rakam her geçen gün daha anlamlı.`,
    (s) => `${s} gün boyunca kendine sadık kaldın. Bu, öz saygının somut kanıtı.`,
    (s) => `Geçen hafta muhteşemdi. ${s} gün — artık hiçbir şey seni durduramaz.`,
];

export async function scheduleWeeklySummary(params: {
    weeklyCheckins: number;
    streak: number;
    moneySaved: number;
    hoursSaved: number;
    habitType: HabitType | 'other';
}): Promise<void> {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const { weeklyCheckins, streak, moneySaved, hoursSaved } = params;
    const motivationIndex = streak % WEEKLY_MOTIVATION.length;
    const motivationMsg = WEEKLY_MOTIVATION[motivationIndex](streak);

    const body = [
        `📅 Bu hafta: ${weeklyCheckins}/7 gün temiz`,
        moneySaved > 0 ? `💰 Toplam tasarruf: ₺${moneySaved}` : null,
        hoursSaved > 0 ? `⏱️ Kazanılan süre: ${hoursSaved} saat` : null,
        `\n${motivationMsg}`,
    ].filter(Boolean).join('\n');

    await Notifications.scheduleNotificationAsync({
        content: {
            title: `quit. — Haftalık Raporun 📊`,
            body,
            sound: true,
            data: { navigateTo: 'stats' }, // _layout.tsx'de handle edilecek
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1, // 1=Pazar (expo-notifications convention)
            hour: 20,
            minute: 0,
        },
    });
}


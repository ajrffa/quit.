import { supabase } from './supabase';
import { logger } from '@/utils/logger';

// ── Profile Sync: Keep Supabase profile in sync with local store ──────────

export async function syncProfileToSupabase(data: {
    userName: string;
    habitType: string;
    customHabitName?: string;
    currentStreak: number;
    longestStreak: number;
    relapseCount: number;
    xp: number;
    level: number;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            user_name: data.userName,
            habit_type: data.habitType,
            custom_habit_name: data.customHabitName || null,
            current_streak: data.currentStreak,
            longest_streak: data.longestStreak,
            relapse_count: data.relapseCount,
            xp: data.xp,
            level: data.level,
        });

    if (error) logger.warn('[ProfilSync] Hata:', error.message);
}

export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        logger.warn('[ProfilSync] Profil alma hatası:', error.message);
        return null;
    }
    return data;
}

export async function savePushToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
}

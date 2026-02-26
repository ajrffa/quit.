import { supabase } from './supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export async function callAiCoach(message: string, habitType: string, streak: number, userName: string): Promise<string> {
    const session = useAuthStore.getState().session;
    if (!session) throw new Error('not_authenticated');

    const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message, habitType, streak, userName }
    });

    if (error?.message?.includes('premium_required')) throw new Error('premium_required');
    if (error?.message?.includes('rate_limited')) throw new Error('rate_limited');
    if (error) {
        console.error("Supabase Functions Error:", error);
        return `[Sistem Hatası]: ${error.message || 'AI Coach başlatılamadı.'}`;
    }
    if (!data?.reply) {
        return "[Sistem Hatası]: Edge Function boş yanıt döndürdü.";
    }
    return data.reply;
}

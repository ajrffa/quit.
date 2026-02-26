import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EncryptedStorage } from '@/utils/encryptedStorage';
import { validateJournalEntry } from '@/utils/sanitize';
import { filterContent } from '@/utils/contentFilter';
import { callAiCoach } from '@/services/aiService';

let idCounter = 0;
const uniqueId = () => `${Date.now()}-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`;

export type HabitType = 'smoking' | 'alcohol' | 'social_media' | 'sugar' | 'pornography' | 'gambling' | 'junk_food' | 'nail_biting' | 'other';

export interface HabitData {
    type: HabitType;
    startDate: string; // ISO string
    triggers: string[];
    longestStreak?: number;
    dailyCommitmentMinutes?: number;
    focusTasksCount?: number;
    customHabitName?: string;
    costPerDay?: number;
    timePerDay?: number;
}

interface Activity {
    id: string;
    title: string;
    type: 'reflection' | 'breathing' | 'learning' | 'action';
    completed: boolean;
    time: string;
    duration?: string;
}

export interface JournalEntry {
    id: string;
    date: string;
    text: string;
    isBot: boolean; // still keeping for backward comp if needed, but not used for chat anymore
    mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
}

export interface ChatMessage {
    id: string;
    date: string;
    text: string;
    isBot: boolean;
}

export interface CopingStrategy {
    id: string;
    title: string;
    description: string;
    icon: 'leaf' | 'fire' | 'hourglass' | 'bolt' | 'star' | 'shield' | 'heart' | 'magic' | 'book' | 'circle' | 'scissors' | 'asterisk' | 'rocket' | 'trash';
    durationMinutes?: number;
    route?: string; // Optional deep link to an interactive tool screen
}

interface HabitState {
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;

    onboardingComplete: boolean;
    userName: string;
    isPremium: boolean;
    isAppLockEnabled: boolean;
    activeHabit: HabitData | null;
    currentStreak: number;
    relapseCount: number;
    lastCheckIn: string | null;
    checkInHistory: string[]; // ISO date strings for heatmap
    streakFreezeCount: number; // How many freezes remain
    lastFreezeUsed: string | null; // ISO date of last freeze
    milestone365Shown: boolean; // Has the 365-day celebration been shown?
    weeklyCheckins: number; // How many check-ins this week
    xp: number;
    level: number;
    todayActivities: Activity[];
    journalEntries: JournalEntry[];
    chatMessages: ChatMessage[];
    copingStrategies: CopingStrategy[];
    lastTriggeredMilestone: number | null; // set to streak value when milestone hit

    setPremium: (status: boolean) => void;
    setAppLockEnabled: (enabled: boolean) => void;
    completeOnboarding: (habit: HabitData, name: string) => void;
    checkIn: (xpGained: number) => void;
    relapse: () => void;
    completeActivity: (id: string, xpGained: number) => void;
    // Action Tools (Journaling & Chat)
    addJournalEntry: (text: string, mood?: JournalEntry['mood']) => void;
    deleteJournalEntry: (id: string) => void;

    sendChatMessage: (text: string) => Promise<void>;
    clearChatMessages: () => void;
    updateSavingsSettings: (cost: number, time: number) => void;
    addCopingStrategy: (title: string, description: string, icon: CopingStrategy['icon'], durationMinutes?: number) => void;
    removeCopingStrategy: (id: string) => void;
    restoreDefaultStrategies: () => void;
    // Streak Freeze
    useStreakFreeze: () => void;
    addStreakFreeze: () => void;
    // Milestone
    setMilestone365Shown: () => void;
    clearTriggeredMilestone: () => void;
    resetApp: () => void;
}

const generateDailyActivities = (count: number, totalMinutes: number): Activity[] => {
    const pool: { title: string; type: Activity['type'] }[] = [
        { title: 'Morning Reflection', type: 'reflection' },
        { title: 'Urge Surfing Guide', type: 'learning' },
        { title: 'Deep Breathing', type: 'breathing' },
        { title: 'Evening Check-in', type: 'action' },
        { title: 'Mindful Walk', type: 'action' },
        { title: 'Trigger Analysis', type: 'reflection' },
        { title: 'Read Recovery Material', type: 'learning' },
        { title: 'Meditate', type: 'breathing' },
    ];

    // Shuffle
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.max(1, Math.min(count, pool.length)));
    const minPerTask = Math.max(1, Math.floor(totalMinutes / selected.length));

    return selected.map((s, index) => ({
        id: uniqueId(),
        title: s.title,
        type: s.type,
        completed: false,
        time: 'Today',
        duration: `${minPerTask} min`
    }));
};

const DEFAULT_COPING_STRATEGIES: CopingStrategy[] = [
    { id: 'cs_1', title: 'Personal Journal', description: 'Write down what you are feeling right now. Processing your cravings on paper helps contextualize the emotion and detach it from your immediate actions.', icon: 'book', durationMinutes: 5, route: '/tools/journal' },
    { id: 'cs_new1', title: 'Thought Tosser', description: 'Write down your intrusive thought or craving. Crumple it into a ball and physically flick it into the trash. A powerful cognitive detachment tool.', icon: 'circle', durationMinutes: 2, route: '/tools/shredder' },
    { id: 'cs_3', title: 'Bubble Wrap', description: 'A satisfying, tactile distraction. Popping bubbles provides immediate haptic feedback that grounds your sensory awareness and interrupts obsessive thought loops.', icon: 'circle', durationMinutes: 3, route: '/tools/bubble' },
    { id: 'cs_new3', title: 'Pixel Art Revealer', description: 'Drag your finger to reveal vibrant colors from a blank grid. A highly tactile, ASMR-like distractor that occupies the visual working memory and disrupts craving loops.', icon: 'magic', durationMinutes: 5, route: '/tools/pixel' },
    { id: 'cs_new2', title: 'Deep Focus Mandala', description: 'Clear your working memory by drawing perfectly symmetrical geometric patterns. Requires total visual focus.', icon: 'asterisk', durationMinutes: 5, route: '/tools/mandala' },
    { id: 'cs_surf1', title: 'Neon Surf', description: 'Take control of a spacecraft in a high-speed neon environment. A highly engaging, visually intense arcade game to flood your senses and escape urgent thought loops.', icon: 'rocket', durationMinutes: 5, route: '/tools/surf' },
    { id: 'cs_4', title: 'Tetris Effect', description: 'Play a highly visual, fast-paced puzzle game like Tetris on your phone. Cravings rely heavily on visual working memory. Flooding your visual center inhibits the brain\'s ability to picture the craving.', icon: 'star', durationMinutes: 5, route: '/tools/grid' },
    { id: 'cs_5', title: 'Soundscape Meditation', description: 'Put on your headphones. Listen to a calming atmospheric soundscape. Focus entirely on the layers of audio to gently ease your nervous system out of fight-or-flight mode.', icon: 'heart', durationMinutes: 10, route: '/tools/meditate' },
];

export const getXPForLevel = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));

export const useHabitStore = create<HabitState>()(
    persist(
        (set, get) => ({
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            onboardingComplete: false,
            userName: '',
            isPremium: false,
            isAppLockEnabled: false,
            activeHabit: null,
            currentStreak: 0,
            relapseCount: 0,
            lastCheckIn: null,
            checkInHistory: [],
            streakFreezeCount: 1, // 1 free freeze on start
            lastFreezeUsed: null,
            milestone365Shown: false,
            weeklyCheckins: 0,
            xp: 0,
            level: 1,
            todayActivities: [],
            journalEntries: [],
            chatMessages: [],
            copingStrategies: DEFAULT_COPING_STRATEGIES,
            lastTriggeredMilestone: null,

            setPremium: (status) => set({ isPremium: status }),
            setAppLockEnabled: (enabled) => set({ isAppLockEnabled: enabled }),

            completeOnboarding: (habit, name) => {
                const activities = generateDailyActivities(habit.focusTasksCount || 5, habit.dailyCommitmentMinutes || 15);
                set({
                    onboardingComplete: true,
                    activeHabit: { ...habit, longestStreak: 0 },
                    userName: name,
                    todayActivities: activities,
                    journalEntries: [],
                });
            },

            checkIn: (xpGained) => {
                const today = new Date().toISOString().split('T')[0];
                const state = get();
                if (state.lastCheckIn === today) return;

                const newStreak = state.currentStreak + 1;
                const newLongest = Math.max(state.activeHabit?.longestStreak || 0, newStreak);
                let newXp = state.xp + xpGained;
                let newLevel = state.level;

                while (newXp >= getXPForLevel(newLevel)) {
                    newXp -= getXPForLevel(newLevel);
                    newLevel++;
                }

                const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365];
                const isMilestone = MILESTONE_DAYS.includes(newStreak);

                set({
                    currentStreak: newStreak,
                    lastCheckIn: today,
                    checkInHistory: [...(state.checkInHistory || []), today],
                    weeklyCheckins: (state.weeklyCheckins || 0) + 1,
                    xp: newXp,
                    level: newLevel,
                    activeHabit: state.activeHabit ? { ...state.activeHabit, longestStreak: newLongest } : null,
                    lastTriggeredMilestone: isMilestone ? newStreak : null,
                });
            },

            relapse: () => {
                const state = get();
                const activities = generateDailyActivities(state.activeHabit?.focusTasksCount || 5, state.activeHabit?.dailyCommitmentMinutes || 15);
                set({
                    currentStreak: 0,
                    relapseCount: (state.relapseCount || 0) + 1,
                    xp: Math.max(0, state.xp - 50),
                    activeHabit: state.activeHabit ? { ...state.activeHabit, startDate: new Date().toISOString() } : null,
                    todayActivities: activities,
                });
            },

            completeActivity: (id, xpGained) => {
                const state = get();
                const activities = state.todayActivities.map(a =>
                    a.id === id ? { ...a, completed: true } : a
                );
                let newXp = state.xp + xpGained;
                let newLevel = state.level;

                while (newXp >= getXPForLevel(newLevel)) {
                    newXp -= getXPForLevel(newLevel);
                    newLevel++;
                }
                set({ todayActivities: activities, xp: newXp, level: newLevel });
            },

            addJournalEntry: (text, mood) => {
                const state = get();
                const validation = validateJournalEntry(text);
                if (!validation.isValid) return;

                const filterResult = filterContent(validation.sanitized);
                const safeText = filterResult.isSafe ? validation.sanitized : filterResult.cleaned;

                const newEntry: JournalEntry = {
                    id: uniqueId(),
                    date: new Date().toISOString(),
                    text: safeText,
                    isBot: false,
                    mood: mood,
                };

                // Add user message immediately
                set({ journalEntries: [newEntry, ...(state.journalEntries || [])] });
            },

            deleteJournalEntry: (id) => {
                const state = get();
                set({
                    journalEntries: state.journalEntries.filter((entry) => entry.id !== id)
                });
            },

            sendChatMessage: async (text) => {
                const state = get();
                const validation = validateJournalEntry(text);
                if (!validation.isValid) return;

                const filterResult = filterContent(validation.sanitized);
                const safeText = filterResult.isSafe ? validation.sanitized : filterResult.cleaned;

                const userMsg: ChatMessage = {
                    id: uniqueId(),
                    date: new Date().toISOString(),
                    text: safeText,
                    isBot: false,
                };

                // Önce kullanıcı mesajını ekle
                set({ chatMessages: [...(state.chatMessages || []), userMsg] });

                try {
                    // Bot cevabı - Supabase AI Coach
                    const botResponse = await callAiCoach(
                        safeText,
                        state.activeHabit?.type || 'other',
                        state.currentStreak,
                        state.userName
                    );

                    const botMsg: ChatMessage = {
                        id: `bot-${uniqueId()}`,
                        date: new Date().toISOString(),
                        text: botResponse,
                        isBot: true,
                    };

                    set((s) => ({ chatMessages: [...(s.chatMessages || []), botMsg] }));
                } catch (error) {
                    console.error("AI response error:", error);
                    const errorMsg: ChatMessage = {
                        id: `bot-err-${uniqueId()}`,
                        date: new Date().toISOString(),
                        text: "An error occurred. I'm having trouble analyzing your message right now. But keep breathing, you're doing great.",
                        isBot: true,
                    };
                    set((s) => ({ chatMessages: [...(s.chatMessages || []), errorMsg] }));
                }
            },

            clearChatMessages: () => {
                set({ chatMessages: [] });
            },

            updateSavingsSettings: (cost, time) => {
                const state = get();
                if (state.activeHabit) {
                    set({
                        activeHabit: {
                            ...state.activeHabit,
                            costPerDay: cost,
                            timePerDay: time,
                        }
                    });
                }
            },

            addCopingStrategy: (title, description, icon, durationMinutes) => {
                set((state) => ({
                    copingStrategies: [...state.copingStrategies, { id: uniqueId(), title, description, icon, durationMinutes }]
                }));
            },

            restoreDefaultStrategies: () => {
                set({ copingStrategies: DEFAULT_COPING_STRATEGIES });
            },

            removeCopingStrategy: (id) => {
                set((state) => ({
                    copingStrategies: state.copingStrategies.filter(cs => cs.id !== id)
                }));
            },

            useStreakFreeze: () => {
                const state = get();
                if ((state.streakFreezeCount || 0) <= 0) return;
                const today = new Date().toISOString().split('T')[0];
                set({
                    lastFreezeUsed: today,
                    streakFreezeCount: Math.max(0, (state.streakFreezeCount || 0) - 1),
                    lastCheckIn: today, // Mark as checked in so streak doesn't break
                });
            },

            addStreakFreeze: () => {
                set((state) => ({ streakFreezeCount: (state.streakFreezeCount || 0) + 1 }));
            },

            setMilestone365Shown: () => set({ milestone365Shown: true }),
            clearTriggeredMilestone: () => set({ lastTriggeredMilestone: null }),

            resetApp: () => {
                set({
                    onboardingComplete: false,
                    userName: '',
                    activeHabit: null,
                    currentStreak: 0,
                    relapseCount: 0,
                    lastCheckIn: null,
                    checkInHistory: [],
                    streakFreezeCount: 1,
                    lastFreezeUsed: null,
                    milestone365Shown: false,
                    weeklyCheckins: 0,
                    xp: 0,
                    level: 1,
                    todayActivities: [],
                    journalEntries: [],
                    copingStrategies: DEFAULT_COPING_STRATEGIES,
                });
            }
        }),
        {
            name: 'birak-ios-storage',
            storage: createJSONStorage(() => EncryptedStorage),
            onRehydrateStorage: () => (state) => {
                if (state) state.setHasHydrated(true);
            },
        }
    )
);

import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily } from '../../constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, SlideOutDown, FadeOut } from 'react-native-reanimated';
import { useHabitStore, CopingStrategy } from '../../stores/useHabitStore';

interface AddStrategyModalProps {
    visible: boolean;
    onClose: () => void;
}

const FF = FontFamily.sans;

const AVAILABLE_ICONS: CopingStrategy['icon'][] = ['star', 'leaf', 'bolt', 'fire', 'hourglass', 'shield', 'heart', 'magic'];

export function AddStrategyModal({ visible, onClose }: AddStrategyModalProps) {
    const { addCopingStrategy } = useHabitStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [durationStr, setDurationStr] = useState('');
    const [icon, setIcon] = useState<CopingStrategy['icon']>('star');

    if (!visible) return null;

    const handleSave = () => {
        if (!title.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const duration = parseInt(durationStr, 10);

        addCopingStrategy(
            title.trim(),
            description.trim(),
            icon,
            !isNaN(duration) && duration > 0 ? duration : undefined
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Reset state
        setTitle('');
        setDescription('');
        setDurationStr('');
        setIcon('star');

        onClose();
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Animated.View style={s.overlay} entering={FadeIn} exiting={FadeOut}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
                    <Pressable style={s.backdrop} onPress={onClose} />
                </BlurView>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kbAware}>
                    <Animated.View style={s.modal} entering={FadeInDown.springify().damping(18)} exiting={SlideOutDown}>

                        <View style={s.header}>
                            <Text style={s.title}>Add Activity</Text>
                            <Pressable style={s.closeBtn} onPress={onClose}>
                                <FontAwesome name="times" size={20} color={Colors.textMuted} />
                            </Pressable>
                        </View>

                        <Text style={s.label}>Title</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 10 Min Meditation"
                            placeholderTextColor={Colors.textDim}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={s.label}>Description & Why it works</Text>
                        <TextInput
                            style={[s.input, s.inputMulti]}
                            placeholder="e.g. Helps me ground myself..."
                            placeholderTextColor={Colors.textDim}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        <Text style={s.label}>Duration (minutes)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 10"
                            placeholderTextColor={Colors.textDim}
                            value={durationStr}
                            onChangeText={setDurationStr}
                            keyboardType="number-pad"
                        />

                        <Text style={s.label}>Icon</Text>
                        <View style={s.iconSelector}>
                            {AVAILABLE_ICONS.map(ic => (
                                <Pressable
                                    key={ic}
                                    onPress={() => setIcon(ic)}
                                    style={[s.iconOption, icon === ic && s.iconOptionSelected]}
                                >
                                    <FontAwesome name={ic} size={20} color={icon === ic ? Colors.gold : Colors.textMuted} />
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            style={({ pressed }) => [s.btn, s.btnPrimary, (!title.trim()) && s.btnDisabled, pressed && title.trim() && { opacity: 0.8 }]}
                            onPress={handleSave}
                            disabled={!title.trim()}
                        >
                            <Text style={s.btnPrimaryText}>Save Activity</Text>
                        </Pressable>

                    </Animated.View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { flex: 1 },
    kbAware: { width: '100%', justifyContent: 'flex-end' },
    modal: {
        backgroundColor: Colors.card,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
        borderBottomWidth: 0,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
    title: {
        fontSize: FontSize.lg,
        color: Colors.text,
        fontFamily: FF,
        fontWeight: 'bold',
    },
    closeBtn: { padding: Spacing.xs },
    label: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontFamily: FF,
        marginBottom: Spacing.xs,
        fontWeight: '500',
    },
    input: {
        backgroundColor: 'rgba(20,20,20,0.5)',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text,
        fontFamily: FF,
        fontSize: FontSize.md,
        marginBottom: Spacing.lg,
    },
    inputMulti: {
        height: 80,
        textAlignVertical: 'top',
    },
    iconSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(20,20,20,0.5)',
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconOptionSelected: {
        borderColor: Colors.gold,
        backgroundColor: Colors.gold + '15',
    },
    btn: {
        width: '100%',
        height: 56,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimary: {
        backgroundColor: Colors.gold,
    },
    btnPrimaryText: {
        color: Colors.background,
        fontSize: FontSize.md,
        fontFamily: FF,
        fontWeight: 'bold',
    },
    btnDisabled: {
        opacity: 0.5,
    }
});

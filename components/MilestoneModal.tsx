import React, { useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, Pressable, Dimensions,
    Animated as RNAnimated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontFamily, FontWeight } from '../constants/Theme';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { HabitType } from '../stores/useHabitStore';

const { width, height } = Dimensions.get('window');
const FF = FontFamily.sans;

// ── Milestone Messages ──────────────────────────────────────────────────────
type MilestoneMessages = Record<number, { title: string; message: string; emoji: string }>;

const MESSAGES_BY_HABIT: Record<HabitType | 'other' | 'default', MilestoneMessages> = {
    smoking: {
        1: { emoji: '🔥', title: 'İlk Gün!', message: 'Sigarasız 24 saat. Kandaki oksijen seviyeni zaten hissedebilirsin.' },
        3: { emoji: '💪', title: 'Üç Gün!', message: 'Nikotin kasılmaların zirveye ulaştı ve geçti. En zor kısım bitti.' },
        7: { emoji: '🫁', title: 'Bir Hafta!', message: 'Bir hafta — vücudundaki nikotin tamamen temizlendi. Akciğerlerin nefes alıyor.' },
        14: { emoji: '💨', title: 'İki Hafta!', message: 'Dolaşım sisteminiz iyileşiyor. Merdivenleri artık daha kolay çıkıyorsundur.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: '30 gün! Sigara içme isteğin dramatik şekilde azaldı. Sen buna layıksın.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'Akciğer kapasiten artık %30 daha fazla. Her nefes özgürlük kokar.' },
        90: { emoji: '🏆', title: '90 Gün!', message: 'Üç ay. Artık istatistiksel olarak bağımlı değilsin. Bu dönüşüm kalıcı.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Yarım yıl temiz! Kalp hastalığı riskin sigaracılara kıyasla yarı yarıya düştü.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Kalp krizi riskin bir sigaracının yarısına indi. Sen bir efsanesin.' },
    },
    alcohol: {
        1: { emoji: '💧', title: 'İlk Gün!', message: 'Alkol kanından çıktı. Vücudun onarıma başladı.' },
        3: { emoji: '😴', title: 'Üç Gün!', message: 'Uyku kaliten iyileşiyor. Gerçek dinlenmeyi tekrar keşfediyorsun.' },
        7: { emoji: '🧠', title: 'Bir Hafta!', message: 'Beyin sisi dağılıyor. Zihnin netleşiyor, kararların keskinleşiyor.' },
        14: { emoji: '❤️', title: 'İki Hafta!', message: 'Kan basıncın normalize döndü. Kalbin sağlıklı atıyor.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: '30 gün temiz! Karaciğerin büyük onarım sürecini tamamladı. Tebrikler.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! Sosyal kaygı ve depresyon önemli ölçüde azalmış olmalı.' },
        90: { emoji: '🏆', title: '90 Gün!', message: 'Üç ay! Karaciğer fonksiyonların neredeyse normal. Bu yolda devam et.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı aydır temizsin. Kanser riski belirgin şekilde düşüyor.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Hayatını geri aldın. Bu başarı sonsuza kadar senindir.' },
    },
    social_media: {
        1: { emoji: '📵', title: 'İlk Gün!', message: 'Telefonu bıraktın. Dopamin sistemi dengelenmeye başladı.' },
        3: { emoji: '🎯', title: 'Üç Gün!', message: 'Dikkat süren uzuyor. Derin odak geri dönüyor.' },
        7: { emoji: '🧠', title: 'Bir Hafta!', message: 'Bir hafta! FOMO geçti. Gerçek hayat ekrandan çok daha iyi.' },
        14: { emoji: '😴', title: 'İki Hafta!', message: 'Uyku kaliten zirveye ulaştı. Melatonin ritmin geri döndü.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: '30 gün! Konsantrasyonun dijital öncesi seviyeye döndü.' },
        60: { emoji: '📚', title: 'İki Ay!', message: 'Okuma, düşünme, yaratma. Bunlar için zamanın var artık.' },
        90: { emoji: '🏆', title: '90 Gün!', message: 'Üç ay! Dopamin sistemin tamamen iyileşti. Sen kazandın.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Hayatındaki gerçek insanlar seni geri kazandı.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıldır sosyal medyadan özgürsün. Bu cesaret başkalarına da ilham verir.' },
    },
    default: {
        1: { emoji: '🔥', title: 'İlk Gün!', message: 'İlk adımı attın. Bu yolculuğun en önemli anı.' },
        3: { emoji: '💪', title: 'Üç Gün!', message: 'Üç gün! Vücudun adapte oluyor. En zor kısım bitti.' },
        7: { emoji: '🎯', title: 'Bir Hafta!', message: 'Bir hafta! Alışkanlık döngüsü kırılmaya başladı.' },
        14: { emoji: '✨', title: 'İki Hafta!', message: 'İki hafta! Zihnin ve vücudun değiştiğini hissediyorsundur.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: '30 gün! Bilimsel olarak yeni bir alışkanlık oluşturma eşiği.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! Bunu gerçekten yapıyorsun. Devam et.' },
        90: { emoji: '🏆', title: '90 Gün!', message: 'Üç ay! Artık bu senin yeni kimliğin. Tebrikler.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay temiz. Bu bir dönüşüm hikayesi.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Hayatın artık tamamen senin kontrolünde.' },
    },
    pornography: {
        1: { emoji: '🛡️', title: 'İlk Gün!', message: 'Zor bir seçim yaptın. Dopamin sistemi iyileşmeye başladı.' },
        3: { emoji: '💪', title: 'Üç Gün!', message: 'Üç gün! Beyin nöroplastisitenin ilk işaretlerini veriyor.' },
        7: { emoji: '🧠', title: 'Bir Hafta!', message: 'Bir hafta! Gerçek hayata olan ilgi geri dönüyor.' },
        14: { emoji: '❤️', title: 'İki Hafta!', message: 'İki hafta! Duygusal bağ kurma kapasitin artıyor.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: 'Bir ay! Özgüven ve motivasyonun zirveye çıkıyor.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! Dopamin dengen sağlıklı seviyelere döndü.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Beyin büyük ölçüde iyileşti. Sen güçsün.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Gerçek, derin ilişkiler kurabilecek donanıma sahipsin.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Bu savaşı kazandın. Artık özgürsün.' },
    },
    gambling: {
        1: { emoji: '🎰', title: 'İlk Gün!', message: 'Kumar masasından kalktın. İlk gün en zorlu olanıdır.' },
        3: { emoji: '💰', title: 'Üç Gün!', message: 'Üç gün! Finansal düşüncen berraklaşıyor.' },
        7: { emoji: '📊', title: 'Bir Hafta!', message: 'Bir hafta! Parasını kontrolün altında tutuyorsun.' },
        14: { emoji: '❤️', title: 'İki Hafta!', message: 'İki hafta! Ailene ve sevdiklerine daha çok zaman ayırıyorsun.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: 'Bir ay! Finansal planlaman güçlendi.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! Dürtüsel karar verme neredeyse sona erdi.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Dopamin dengen sağlıklı. Devam et.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Hayatın gerçek anlamda değişti.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Kazandığın her şey senindir — hepsini sen yarattın.' },
    },
    sugar: {
        1: { emoji: '🍬', title: 'İlk Gün!', message: 'Şekeri bıraktın. Kan şekerin stabilleşmeye başladı.' },
        3: { emoji: '⚡', title: 'Üç Gün!', message: 'Üç gün! Enerji çöküşleri artık yok.' },
        7: { emoji: '✨', title: 'Bir Hafta!', message: 'Bir hafta! Cildinde fark var. Beyin gücün arttı.' },
        14: { emoji: '🌿', title: 'İki Hafta!', message: 'İki hafta! Bağırsak florası yenilendi.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: 'Bir ay! Kilo yönetimin iyileşti, enerji seviyen sabit.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! İltihaplanma azaldı, eklem ağrıları geçiyor.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Uzun vadeli diyabet riskin dramatik şekilde düştü.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Yeni beslenme alışkanlıkların kalıcı oldu.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Sağlıklı beslenme artık senin doğan.' },
    },
    junk_food: {
        1: { emoji: '🥗', title: 'İlk Gün!', message: 'Sağlıklı seçim yaptın. Sindirim sistemi rahatlamaya başladı.' },
        3: { emoji: '⚡', title: 'Üç Gün!', message: 'Üç gün! Enerji seviyen daha stabil.' },
        7: { emoji: '✨', title: 'Bir Hafta!', message: 'Bir hafta! Cilt parlaklığın arttı.' },
        14: { emoji: '🌿', title: 'İki Hafta!', message: 'İki hafta! Mikrobiyomun iyileşti.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: 'Bir ay! Vücut ağırlığın kontrol altında.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! İltihaplanma belirgin şekilde azaldı.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Sağlıklı beslenme artık bir alışkanlık.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Kalp-damar sistemin güçlendi.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Uzun ömürlülük için sağlam bir zemin kurdun.' },
    },
    nail_biting: {
        1: { emoji: '💅', title: 'İlk Gün!', message: 'İlk 24 saat! Tırnakların büyüyecek.' },
        3: { emoji: '✨', title: 'Üç Gün!', message: 'Üç gün! Tırnak yatakları iyileşmeye başladı.' },
        7: { emoji: '🌿', title: 'Bir Hafta!', message: 'Bir hafta! Enfeksiyon riski geride kaldı.' },
        14: { emoji: '💪', title: 'İki Hafta!', message: 'İki hafta! Tırnak yatakların sağlıklı görünüyor.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: 'Bir ay! Tırnakların şekilleniyor.' },
        60: { emoji: '🧘', title: 'İki Ay!', message: 'İki ay! Anksiyeteyi yönetme beceerin arttı.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Alışkanlık döngüsü kalıcı olarak kırıldı.' },
        180: { emoji: '👑', title: 'Altı Ay!', message: 'Altı ay! Tam iyileşme. Tırnakların artık güçlü.' },
        365: { emoji: '🚀', title: 'Bir YIL!', message: 'Bir yıl! Bu küçük zafer, büyük bir öz disiplinin kanıtı.' },
    },
    other: {
        1: { emoji: '🔥', title: 'İlk Gün!', message: 'İlk adımı attın. Bu yolculuğun en önemli anı.' },
        3: { emoji: '💪', title: 'Üç Gün!', message: 'Üç gün! Vücudun adapte oluyor.' },
        7: { emoji: '🎯', title: 'Bir Hafta!', message: 'Bir hafta! Alışkanlık döngüsü kırılmaya başladı.' },
        14: { emoji: '✨', title: 'İki Hafta!', message: 'İki hafta! Değişimi hissediyorsundur.' },
        30: { emoji: '🌟', title: 'Bir Ay!', message: '30 gün! Bilimsel olarak yeni bir alışkanlık eşiği.' },
        60: { emoji: '⚡', title: 'İki Ay!', message: 'İki ay! Gerçekten yapıyorsun. Devam et.' },
        90: { emoji: '🏆', title: '90 Gün!', message: '90 gün! Bu senin yeni kimliğin.' },
        180: { emoji: '🚀', title: 'Altı Ay!', message: 'Altı ay! Bu bir dönüşüm hikayesi.' },
        365: { emoji: '👑', title: 'Bir YIL!', message: 'Bir yıl! Hayatın artık tamamen senin.' },
    },
};

// ── Confetti Particle ─────────────────────────────────────────────────────
function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
    const anim = useRef(new RNAnimated.Value(0)).current;
    const rotate = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        RNAnimated.loop(
            RNAnimated.parallel([
                RNAnimated.timing(anim, { toValue: 1, duration: 2000 + delay * 200, useNativeDriver: true }),
                RNAnimated.timing(rotate, { toValue: 1, duration: 1500 + delay * 100, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 50] });
    const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, -20] });
    const rotateZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const opacity = anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

    return (
        <RNAnimated.View style={{
            position: 'absolute', top: -20, left: x,
            transform: [{ translateY }, { translateX }, { rotateZ }],
            opacity,
        }}>
            <View style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 2 }} />
        </RNAnimated.View>
    );
}

const CONFETTI_COLORS = [Colors.gold, '#ff6b6b', '#4ecdc4', '#a8e6cf', '#ffd93d', '#ffffff'];
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * width,
}));

// ── Main Component ────────────────────────────────────────────────────────
interface Props {
    visible: boolean;
    streak: number;
    habitType: HabitType | 'other';
    onClose: () => void;
}

export default function MilestoneModal({ visible, streak, habitType, onClose }: Props) {
    const messages = MESSAGES_BY_HABIT[habitType] || MESSAGES_BY_HABIT.default;
    const data = messages[streak] || MESSAGES_BY_HABIT.default[streak];

    useEffect(() => {
        if (visible && data) {
            // Triple haptic burst for celebration
            const fire = async () => {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
                setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 600);
            };
            fire();
        }
    }, [visible]);

    if (!data) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.overlay}>
                {/* Confetti */}
                {PARTICLES.map(p => (
                    <ConfettiParticle key={p.id} delay={p.delay} color={p.color} x={p.x} />
                ))}

                <Animated.View entering={ZoomIn.springify().damping(14)} style={s.card}>
                    {/* Emoji */}
                    <Animated.Text entering={FadeIn.delay(200).duration(500)} style={s.emoji}>
                        {data.emoji}
                    </Animated.Text>

                    {/* Streak badge */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.streakBadge}>
                        <Text style={s.streakBadgeText}>{streak} GÜN</Text>
                    </Animated.View>

                    {/* Title */}
                    <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={s.title}>
                        {data.title}
                    </Animated.Text>

                    {/* Message */}
                    <Animated.Text entering={FadeInDown.delay(500).duration(500)} style={s.message}>
                        {data.message}
                    </Animated.Text>

                    {/* CTA */}
                    <Animated.View entering={FadeInUp.delay(700).duration(500)} style={{ width: '100%' }}>
                        <Pressable
                            style={({ pressed }) => [s.btn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onClose();
                            }}
                        >
                            <Text style={s.btnText}>Devam Et 🚀</Text>
                        </Pressable>
                    </Animated.View>

                    <Animated.Text entering={FadeIn.delay(900)} style={s.share}>
                        Bu başarını paylaş
                    </Animated.Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: Spacing.xxl,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gold + '40',
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    emoji: { fontSize: 72, marginBottom: Spacing.md },
    streakBadge: {
        backgroundColor: Colors.gold + '20',
        borderWidth: 1,
        borderColor: Colors.gold,
        borderRadius: 100,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.md,
    },
    streakBadgeText: {
        color: Colors.gold,
        fontFamily: FF,
        fontWeight: FontWeight.bold,
        fontSize: FontSize.sm,
        letterSpacing: 3,
    },
    title: {
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        fontFamily: FF,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        fontFamily: FF,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xl,
    },
    btn: {
        backgroundColor: Colors.gold,
        borderRadius: 100,
        paddingVertical: 18,
        alignItems: 'center',
        width: '100%',
        marginBottom: Spacing.md,
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    btnText: {
        color: Colors.background,
        fontFamily: FF,
        fontWeight: FontWeight.bold,
        fontSize: FontSize.md,
        letterSpacing: 1,
    },
    share: {
        fontSize: FontSize.xs,
        color: Colors.textDim,
        fontFamily: FF,
        letterSpacing: 0.5,
    },
});

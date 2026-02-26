/**
 * test_security.ts
 * Kullanıcı güvenliği ve veri temizleme özelliklerini test eden ufak betik.
 */
import { filterContent, isContentSafe, getFilterWarning } from './utils/contentFilter';

console.log('=== KÜFÜR FİLTRESİ ÇALIŞIYOR MU? ===');

const testCases = [
    { name: 'Normal Mesaj', text: 'Bugün harika bir gün, devam ediyorum!' },
    { name: 'Küfür', text: 'Seni aptal gerizekalı!' },
    { name: 'Leetspeak', text: 'Sen tam bir 0c ve $h1t sin' },
    { name: 'İngilizce Hakaret', text: 'What the fuck is this bullshit' },
    { name: 'Tehdit', text: 'Seni bulurum ve öldürürüm anladın mı' },
    { name: 'Tuzaklı', text: 'Pencerenin kenarı' } // 'Pencere' kelimesinde sorun yok
];

testCases.forEach((tc) => {
    const res = filterContent(tc.text);
    console.log(`\nTest: ${tc.name}`);
    console.log(`Girdi: "${tc.text}"`);
    console.log(`Güvenli mi: ${res.isSafe}`);
    if (!res.isSafe) console.log(`Uyarı Mesajı: ${getFilterWarning(res)}`);
    console.log(`Temizlenmiş: "${res.cleaned}"`);
});

console.log('\n=== TEST TAMAMLANDI ===');

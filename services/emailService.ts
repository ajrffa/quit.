import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// E-postaların kimden gönderileceği (Supabase Edge Function üzerinden)
const FROM_EMAIL = 'quit. <onboarding@resend.dev>';

/**
 * Resend API çağrısını Supabase Edge Function üzerinden yapar.
 * Resend API key client'a asla açık değil — sadece Supabase secret olarak saklanır.
 * Deploy: supabase secrets set RESEND_API_KEY=re_xxxxx
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const { error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html },
    });

    if (error) {
        logger.error('Edge Function e-posta hatası:', error);
        return false;
    }

    return true;
}

/**
 * Kullanıcı başarıyla kayıt olduğunda harika bir "Hoş Geldin" e-postası atar.
 */
export async function sendWelcomeEmail(toEmail: string) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="color-scheme" content="light dark">
            <style>
                body, table, td, div, p { background-color: #0A0A0A !important; color: #FFFFFF !important; }
                .content-box { background-color: #1A1A1A !important; border: 1px solid #333333 !important; }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A0A">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <h1 style="color: #FFD700; font-size: 32px; letter-spacing: -1px; font-weight: 300; margin: 0 0 20px 0;">quit.</h1>
                        <table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1A1A1A" style="background-color: #1A1A1A; border: 1px solid #333333; border-radius: 16px; max-width: 500px; margin: 0 auto;">
                            <tr>
                                <td style="padding: 40px; text-align: center;">
                                    <h2 style="color: #FFFFFF; font-size: 24px; font-weight: 500; margin: 0 0 16px 0;">Your Journey Begins.</h2>
                                    <p style="color: #A0A0A0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                        Congratulations on joining the community, ${toEmail}.
                                        You've made a difficult choice, but you are not alone.
                                    </p>
                                    <div style="margin: 32px 0;">
                                        <a href="myapp://" style="background-color: #FFD700; color: #0A0A0A; padding: 16px 32px; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 16px; display: inline-block;">
                                            OPEN APP
                                        </a>
                                    </div>
                                    <p style="color: #666666; font-size: 14px; margin: 0;">
                                        If you didn't create this account, please ignore this email.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <div style="margin-top: 40px; color: #666666; font-size: 12px; letter-spacing: 1px;">© 2026 quit. app</div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    const success = await sendEmail(toEmail, 'Welcome to quit. 🚀', html);
    if (success) {
        logger.info(`Hoş geldin e-postası başarıyla gönderildi: ${toEmail}`);
    }
    return success;
}

// sendVerificationEmail removed — Supabase now handles verification emails natively.

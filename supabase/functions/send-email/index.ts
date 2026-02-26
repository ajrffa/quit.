// Supabase Edge Function: send-email
// Resend API key is stored as a Supabase secret (RESEND_API_KEY), never exposed to the client.
// Deploy with: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
// Then: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const FROM_EMAIL = 'quit. <onboarding@resend.dev>';

serve(async (req) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { to, subject, html } = await req.json();

        if (!to || !subject || !html) {
            return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // API key comes from Supabase secret — never exposed to client
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            return new Response(JSON.stringify({ error: 'RESEND_API_KEY secret not set' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject,
                html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ error: data }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, id: data.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

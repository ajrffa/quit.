import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // 1. Kullanıcıyı doğrula
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'unauthorized', message: 'Missing Authorization header' }), { status: 401, headers: corsHeaders })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) return new Response(JSON.stringify({ error: 'unauthorized', message: authError?.message }), { status: 401, headers: corsHeaders })

        // 2. Premium kontrolü
        const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single()
        if (!profile?.is_premium) return new Response(JSON.stringify({ error: 'premium_required' }), { status: 403, headers: corsHeaders })

        // 3. Rate limit — dakikada max 10 istek
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
        const { count } = await supabase.from('ai_requests').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', oneMinuteAgo)
        if ((count ?? 0) >= 10) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: corsHeaders })

        // 4. İsteği kaydet
        await supabase.from('ai_requests').insert({ user_id: user.id })

        // 5. Claude API çağır
        const { message, habitType, streak, userName } = await req.json()
        const anthropicKey = Deno.env.get('ANTHROPIC_KEY')
        if (!anthropicKey) {
            throw new Error('Anthropic API key missing')
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307', // valid model name
                max_tokens: 300,
                system: `You are a compassionate addiction recovery coach inside the Quit app. The user's name is ${userName || 'friend'}, they are trying to quit ${habitType || 'their habit'} and have been clean for ${streak || 0} days. Be empathetic, brief (2-3 sentences max), warm and practical. Never give medical advice. Respond in the same language as the user's message.`,
                messages: [{ role: 'user', content: message }]
            })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('Claude API Error:', response.status, errText)
            throw new Error(`Claude API error: ${response.status}`)
        }

        const data = await response.json()
        const reply = data.content[0].text

        return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (e: any) {
        console.error('Edge Function Error:', e)
        return new Response(JSON.stringify({ error: 'server_error', details: e.message }), { status: 500, headers: corsHeaders })
    }
})

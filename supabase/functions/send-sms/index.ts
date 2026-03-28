
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'self';",
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
        const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
        const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

        // Validate that all required secrets are set
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
            const missing = []
            if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID')
            if (!TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN')
            if (!TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER')
            throw new Error(`Missing Twilio secrets: ${missing.join(', ')}. Add them in Supabase Dashboard → Edge Functions → Secrets.`)
        }

        const { to, body } = await req.json()

        if (!to || !body) {
            throw new Error('Missing required fields: "to" (phone number) and "body" (message)')
        }

        console.log(`Sending SMS to ${to}: ${body}`)
        console.log(`Using Twilio SID: ${TWILIO_ACCOUNT_SID.slice(0, 8)}...`)
        console.log(`Using From number: ${TWILIO_PHONE_NUMBER}`)

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
                },
                body: new URLSearchParams({
                    To: to,
                    From: TWILIO_PHONE_NUMBER,
                    Body: body,
                }).toString(),
            }
        )

        const data = await response.json()
        console.log('Twilio response status:', response.status)
        console.log('Twilio response data:', JSON.stringify(data))

        if (!response.ok) {
            // Twilio error responses have code + message fields
            const errorMsg = data.message || data.error_message || `Twilio error (status ${data.code || response.status})`
            throw new Error(errorMsg)
        }

        return new Response(JSON.stringify({ success: true, sid: data.sid }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('SMS Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

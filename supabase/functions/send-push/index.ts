
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Full Private Key Configuration for FCM
const FIREBASE_CONFIG = {
  "type": "service_account",
  "project_id": "first-project-5f861",
  "private_key_id": "ef5eea5aa24d8af02c482af3065d0f60c9322236",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDAbCfdnQ+mnZab\nA9EVwpylBnxuUbsE7We2yb3wmwvVd5iKQLCaZZCnEsSfOkdb2N2/vCuXvw48Qx7N\ntIbGu1dnspSOMqC3xfK9gwvI3vSwxGn2PdnqdxCG28e0LIUQLKgyzN/Z8IlkBnBx\ndg5I0R3ANcTSO0D8bNwbig4MEB9nMmrwcsAOsVBOwm/jAkAEknNAD9VuLiRGykWa\nm0QpoC7vxSXpnj11W74+xLMHAjaPSjaHXratk9lte390FbUcvQNVMSkE2fHpWGwE\nAvMPNoWIWlgmaO/IW/NrBz1a2UGvo21WU0rmWSgriTSfyijANrKx+QjGhnfUWV1B\nyJ4HquvAgMBAAECggEAHK/jL6BrRWlIGzsx8D8P0HCLm3zW13C3XiJsjVLoLD6E\nwNPNIG+U5bugEacEHXbS9HNOwnRK4IQXMw6/ayBh8wVGLX7xxAQgYM2JM7y9mR7n\nNz1YYCK5FYntl3htrBAkUVKG6vx31zA4kknJ7mQyvcWmXrtTwG5QUFDAMF8091Lk\nMcLLs34d8l01gxP00ah04MpENbAYwPJAAmjMVoxDNcWW4yS5REQTkBNyAyRZlbFJ\nYvy/dsD7wm0yD7VAinfX+aHrU3MqFBxl9gMsWfqHUlkbosY8nU0Jt8Lo5frTwnVn\nrVEOj5UTde+RuMKsJ6ILVTlIPy88Ao/LI5sLzqwPPQKBgQDmhibmFtLNuNrUvt0S\ngQYFYC+akp4zh8MI0dQ+wLf5xupohhavI1O/87VW1ShGYU6HERGR5ReLSmkyXRlm\nlk2jX9G3CJqBXDY+nMhuZnmLOUq5BwGv20PPpqlo5tMeCZeZKCzDENGWlLIR7+QG\nakRHeaMcN+uxd2/JI31olKHrfQKBgQDVsA684+vwmvvS1nIvqMyzORMS1hq3nPQP\nKeJyitXLYksCHzGNbgtnbAi98xb0g8u8IumAV/ci/Fw3IrcuXs7/f7tO5GDv8rC/\n/SYmdh7RmF/I8Wxf/t4ukTfcKMfuWP81l0pPzIaceb42wwP+JMm9/wEPCfKiyXGE\n1RWvGd8jmwKBgQDdpHaaG6+rpOSiULD2LZ/AY27hy77YBNx9CmJrw5ggTCTtQp9k\n3S6VDJl6V5BVuxFpw/uEryQoBO+IQQM/I5yaTHKy7U7AugxdvxjnLRgHyJoTtKzm\njIdyi+euuOCbrNVZqMsA8pbRlT5xCJnRoTLtFgLCCvJOu2t7lOfrOZ1FcQKBgA0A\nzaTI6c6WX8SQsBoeV3aAfpyi0rVho6hYkCMQN7pMnOvgIg/NJnyAoneMl1UBwCAO\nr87Ti4JhgOsJ/cOgmVAK4ccHNq7jQcYtDWlBvtZaQ1ni9wlQZQzIYXHQOXpTiBQm\nxKrec0KKVfzXGSMZ8fzRy6qynEUzpOjEXrFtDZsJAoGBAJrOp3/nlPJ3CucR5czx\nFLsb+Xp29OWiWDWD/KVwYauWTlK/Jp+YWs+UgwnF5M0Wq4TdjA/6dQt4bx3r8+GZ\neO9atE6cw71ZL0RjOIoMC8tZMg8wMq0yM1KDy4PKOuTH35iWZd/qU3GqM9cwTqol\nKIARkgKvoy6z3UTRKe71JOZG\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@first-project-5f861.iam.gserviceaccount.com"
}

// Function to generate and refresh FCM Access Token efficiently
async function getAccessToken() {
  const iat = getNumericDate(0);
  const exp = getNumericDate(3600);
  const payload = {
    iss: FIREBASE_CONFIG.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  // Convert PKCS8 to CryptoKey
  const pem = FIREBASE_CONFIG.private_key.replace(/\\n/g, '\n');
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binaryDerString = atob(b64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(`FCM Token Error: ${data.error_description || data.error}`);
  return data.access_token;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { receiver_id, sender_name, message_content, sender_id } = await req.json();
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // 1. Fetch user's FCM token from profiles
        const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${receiver_id}&select=fcm_token`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        
        const profiles = await profileResp.json();
        const fcmToken = profiles?.[0]?.fcm_token;

        if (!fcmToken) {
           return new Response(JSON.stringify({ success: false, reason: "No device registered" }), { 
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 200 
           });
        }

        // 2. Fetch Google OAuth2 Access Token
        const accessToken = await getAccessToken();

        // 3. Send Notification via Firebase V1 API
        const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_CONFIG.project_id}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: {
                title: sender_name || "New Message",
                body: message_content || "Check the app to see your message."
              },
              data: {
                sender_id: sender_id || "",
                type: "message_push"
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  click_action: "OPEN_CHAT"
                }
              }
            }
          })
        });

        const fcmData = await fcmResponse.json();
        
        return new Response(JSON.stringify({ 
          success: true, 
          message_id: fcmData.name 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

    } catch (error) {
        console.error('Push Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
})

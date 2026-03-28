
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'self';",
}

// Full Private Key Configuration for FCM
const FIREBASE_CONFIG = {
  "type": "service_account",
  "project_id": Deno.env.get('FIREBASE_PROJECT_ID')!,
  "client_email": Deno.env.get('FIREBASE_CLIENT_EMAIL')!,
  "private_key": Deno.env.get('FIREBASE_PRIVATE_KEY')!
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
        const payload = await req.json();
        const { record, table } = payload;
        
        let receiverId: string;
        let title: string;
        let body: string;
        let senderId: string = "";

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Handle Different Tables (Messages vs Notifications)
        if (table === 'messages') {
            receiverId = record.receiver_id;
            senderId = record.sender_id;
            
            // Fetch sender name
            const senderResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${senderId}&select=name`, {
              headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
            });
            const senderProfile = await senderResp.json();
            title = senderProfile?.[0]?.name || "New Message";
            body = record.content?.startsWith('[') ? "Shared a file" : (record.content || "Tap to view");
        } else if (table === 'notifications') {
            receiverId = record.user_id;
            title = record.title || "Casting Call Notification";
            body = record.message || "Tap to open the app.";
        } else {
            // Manual call format (if any)
            receiverId = payload.receiver_id;
            title = payload.sender_name || "Notification";
            body = payload.message_content || "Tap to view";
            senderId = payload.sender_id || "";
        }

        if (!receiverId) throw new Error("Missing receiver_id");

        // 1. Fetch user's FCM token from profiles
        const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${receiverId}&select=fcm_token`, {
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
              notification: { title, body },
              data: {
                sender_id: senderId,
                type: table === 'messages' ? "message_push" : "general_push"
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
        return new Response(JSON.stringify({ success: true, message_id: fcmData.name }), {
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

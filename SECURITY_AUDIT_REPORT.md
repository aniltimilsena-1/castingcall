# Senior Security Engineer's Audit Report: CaastingCall Auth System

**Security Auditor:** Antigravity AI (Senior Security Engineer)
**Date:** 2026-03-30
**Project:** CaastingCall (User Hub Expansion)

## Executive Summary
The authentication system currently uses **Supabase Auth**, which provides a strong baseline (secure hashing, JWT management). However, several critical vulnerabilities were identified in the custom implementation layers, specifically regarding **client-side security enforcement**, **broken access control logic** (Privilege Escalation), and **misconfigured security headers**.

---

## 1. Vulnerabilities and Risks

### [CRITICAL] 🔴 Client-Side Rate Limiting Bypass
- **Problem**: The authentication rate limiting (5 attempts/min) and Math CAPTCHA are implemented exclusively in the React frontend (`AuthPage.tsx`).
- **Why it's a risk**: An attacker can bypass the UI logic entirely and call the Supabase Auth API (`signInWithPassword`) directly using a script or `curl`. This makes the brute-force protection effectively non-existent for automated attacks.
- **Fix**: Rate limiting must be enforced at the server/database level.

### [HIGH] 🟠 Password Reset Verification Bypass
- **Problem**: In `SettingsPage.tsx`, the requirement to enter the "Current Password" for a password change is skipped if a frontend flag `isRecovering` is `true`.
- **Why it's a risk**: An already authenticated user (or anyone with access to the browser console) can manually set `isRecovering = true` in the React state to change the account password without knowing the current one.
- **Fix**: Require the current password for ALL password changes unless the session was started via a verified recovery link (and verify this server-side).

### [HIGH] 🟠 Broken Permissions-Policy Header
- **Problem**: `vercel.json` sets `"Permissions-Policy": "camera=(), microphone=()"`
- **Why it's a risk**: This is a **Self-Inflicted Denial of Service (DoS)**. It explicitly prevents the browser from ever accessing the camera or microphone, breaking the `VoiceNoteRecorder` and `WebRTCCall` features.
- **Status**: ✅ **FIXED** (Updated to `(self)`).

### [MEDIUM] 🟡 Privilege Escalation Mitigation Conflicts
- **Problem**: Migration `20260330110000` hardcodes the user role to `'Actor'` during signup.
- **Why it's a risk**: While it prevents users from setting `role = 'Admin'`, it breaks the legitimate signup flow where users (Directors, Producers, etc.) need to choose their role.
- **Status**: ✅ **FIXED** (Update to whitelist logic in migration `20260330120000_secure_role_whitelist.sql`).

### [LOW] 🟢 Session Storage in LocalStorage
- **Problem**: The Supabase client persists sessions in `localStorage`.
- **Why it's a risk**: Sensitive tokens are accessible to any script running on the page, making them vulnerable to XSS.
- **Mitigation**: A strict CSP (implemented) helps, but an SSR approach with `HttpOnly` cookies is preferred for maximum security.

---

## 2. Immediate Security Fixes

### Fix A: Role Whitelist (Server-Side)
Update the `handle_new_user` trigger to allow valid roles while blocking `Admin`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_role TEXT;
BEGIN
    input_role := NEW.raw_user_meta_data->>'role';
    
    INSERT INTO public.profiles (user_id, name, email, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', ''), 
        NEW.email,
        -- Whitelist check: default to 'Actor' if invalid or unauthorized role requested
        CASE 
            WHEN input_role IN ('Actor', 'Director', 'Singer', 'Choreographer', 'Producer', 'Casting Director') 
            THEN input_role
            ELSE 'Actor'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fix B: Hardening Password Change Logic
Modify `SettingsPage.tsx` to handle re-authentication more robustly.

```typescript
// Proposed check in SettingsPage.tsx
if (!isRecovering) {
  // Only the real recovery flow (started from link) should skip this
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user?.email || "",
    password: oldPassword,
  });
  if (reAuthError) throw new Error("Verification failed: Current password incorrect.");
}
```

---

## 3. Suggested Secure Architecture

1.  **Server-Side Rate Limiting**: Implement a Supabase Edge Function to handle authentication attempts. The function would check the rate-limit table BEFORE calling the Supabase Auth API.
2.  **Supabase Auth Hooks**: If using a Pro plan, use the `MFA` and `Custom Access Token` hooks to inject additional security claims.
3.  **Honeypots**: Add an invisible "honeypot" field to the signup form to catch simple automated bots.
4.  **Database Hardening**: Ensure all tables have RLS enabled and strictly enforce `auth.uid() = user_id`. Currently, some tables might only have partial coverage.

---

## Conclusion
The application has a good security foundation, but the current "rate limiting" and "privilege escalation" fixes are partially flawed (bypassable or breaking features). Implementing the suggested SQL whitelist and hardening the re-authentication logic should be prioritized.

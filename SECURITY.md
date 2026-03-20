# Security Documentation and Threat Model

This document outlines the security measures implemented in the CaastingCall application and the underlying threat model.

## Security Measures

### 1. Content Security Policy (CSP)
A robust Content Security Policy is implemented via `vercel.json` headers to prevent Cross-Site Scripting (XSS), data injection, and clickjacking.

*   **Key Directives:**
    *   `default-src 'self'`: Only allow content from our own domain by default.
    *   `script-src`: Restricted to 'self', Stripe for payments, and Supabase for authentication/database.
    *   `img-src`: Specifically allowed for Supabase storage, Stripe assets, and trusted placeholders (Unsplash).
    *   `frame-src`: Restricted to Stripe (for secure payment iFrames).
    *   `X-Frame-Options: DENY`: Prevents the site from being embedded in an iFrame (Clickjacking protection).
    *   `X-Content-Type-Options: nosniff`: Prevents the browser from trying to mime-sniff the content-type.

### 2. Authentication and Password Hashing
Managed by **Supabase Auth**, which uses industry-standard security practices:
*   **Secure Hashing**: Passwords are hashed using `bcrypt`.
*   **JWT Sessions**: Stateless sessions with secure, short-lived tokens.
*   **Multi-Factor Authentication (MFA)**: Support available via Supabase.

### 3. Data Access Control (RLS)
The application uses **Supabase Row Level Security (RLS)** to enforce a "least privilege" access model directly at the database level.
*   **Identity-Based Policies**: Users can only read/write their own profiles, messages, and applications.
*   **Role-Based Policies**: Administrative features (deleting comments, moderation) are restricted to users with the 'Admin' role in the `profiles` table.

---

## Threat Model (Simplified)

### Assets to Protect
*   **User Data**: Biographies, phone numbers, locations, and messages.
*   **User Uploads**: Professional photos and video auditions.
*   **Admin Access**: Access to moderation and user management features.
*   **Transaction Data**: Secure communication with Stripe for payments.

### Potential Threats and Mitigations

| Threat | Risk | Mitigation |
| :--- | :--- | :--- |
| **XSS (Cross-Site Scripting)** | High | Manual CSP implementation and React's automatic string escaping. |
| **Broken Access Control** | High | Database-enforced Row Level Security (RLS) on all sensitive tables. |
| **SQL Injection** | Low | Managed by Supabase PostgREST (all queries are parameterized). |
| **Insecure Hashing** | Medium | Handled by Supabase Auth (using `bcrypt`). |
| **Clickjacking** | Low | `X-Frame-Options: DENY` header implemented. |
| **Large File Upload Exhaustion** | Medium | Client-side size validation and Supabase Storage bucket quotas. |

### Areas for Improvement
*   **Security Scanning**: Integrate automated scans (e.g., OWASP ZAP) into the CI pipeline.
*   **Rate Limiting**: Implement a custom edge function or use Supabase's built-in rate limits for sensitive API endpoints.

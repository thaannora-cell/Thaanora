# Supabase sign-in emails (Phase 3B · A1)

Customers (My Thaanora) and staff (back office) both sign in with a **6-digit code** from an email.
The email also carries a link, which only works in the same browser that asked for it.

Supabase → **Authentication → Emails → Templates**. Paste the same template into **both**:
- **Magic Link** (people who already have an account, staff included)
- **Confirm signup** (a customer's very first sign-in)

**Subject**
```
Your Thaanora code: {{ .Token }}
```

**Body (HTML)**
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1d2a24">
  <p style="font-size:13px;letter-spacing:3px;color:#8A6A2E;margin:0 0 8px">THAANORA</p>
  <h2 style="color:#0E3B2E;margin:0 0 12px">Your sign-in code</h2>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0E3B2E;margin:0 0 12px">{{ .Token }}</p>
  <p style="margin:0 0 16px">Enter this code on the Thaanora website. It works for a few minutes.
     If you didn't ask for it, you can ignore this email.</p>
  <p dir="rtl" style="margin:0 0 16px;text-align:right">رمز الدخول إلى ثانورا: <b>{{ .Token }}</b><br>
     أدخليه في موقع ثانورا. صالح لبضع دقائق. إن لم تطلبيه فتجاهلي هذه الرسالة.</p>
  <p style="font-size:13px;color:#6b6b6b;margin:0">Or <a href="{{ .ConfirmationURL }}" style="color:#0E3B2E">sign in with this link</a>
     (same browser only).</p>
</div>
```

## Other Supabase settings for customer accounts
1. **Authentication → Sign In / Providers**: turn **Allow new users to sign up** ON. (Staff sign-in stays
   invite-only: the back office never creates accounts.) Email provider ON; **Email OTP length = 6**.
2. **Authentication → URL Configuration → Redirect URLs**: add `http://localhost:3000/**` and the live
   address followed by `/**` (for example `https://thaanora.vercel.app/**`).
3. Before launch: **Site URL** = the live address (it is still `http://localhost:3000`).

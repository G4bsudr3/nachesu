# Login links that survive email scanners

## Problem
Access and password-recovery emails contain a raw single-use verification link. School mail scanners and link previews open it first and use it up, so when the student clicks, the link is already "used" and they get stuck.

## What changes
1. **Email link points to our own page**: `/auth/confirmar?token_hash=...&type=magiclink|recovery&next=...`. Opening the page does not use the link.
2. **New confirmation page** (NachesU look, joão-de-barro "peeking"): one big button "entrar na nachesu" (or "criar nova senha" for recovery). Only the click signs the student in. Scanners never click, so the link stays valid.
3. **Clear way out when a link is expired/used**: the same page shows "esse link já foi usado ou expirou" with the email field and a button "mandar um link novo", no dead end.
4. `/reset-password` invalid-link state gets the same "mandar um link novo" button instead of only an error.

## Technical details
- `send-access-link`: use `linkData.properties.hashed_token` + `verification_type` to build `${APP_BASE}/auth/confirmar?token_hash=..&type=..&next=..` (next sanitized, internal path only). Keep uniform responses.
- New `src/pages/AuthConfirmar.tsx`, route in `App.tsx` (public). On click: `supabase.auth.verifyOtp({ token_hash, type })`; success → `next` (or `/reset-password` for recovery); error → recovery state calling `send-access-link`.
- Old links already in inboxes keep working (the raw verify link still redirects as today).
- Redeploy `send-access-link`; verify with Playwright (page load does not consume token; click signs in).
- Password failures (invalid_credentials) are regular wrong passwords; the existing "enviar link" fallback already covers them, no change.

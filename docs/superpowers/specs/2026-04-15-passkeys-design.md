# DevTodo Passkeys / Biometric Auth + Password Change

## Overview

Add WebAuthn-based passkey login so the user can unlock the app with Touch ID, Face ID, Windows Hello, or Android fingerprint. Multiple passkeys per user (Mac + phone + work laptop). Password remains as the always-available fallback. Add a "Change password" form in Settings since reset is otherwise impossible in a single-user local app.

## Constraints

- **HTTPS required** in production. WebAuthn won't work on plain `http://` (localhost is exempt for dev).
- **Browser support**: Chrome, Edge, Firefox, Safari all support WebAuthn. Detect via `window.PublicKeyCredential` and `isUserVerifyingPlatformAuthenticatorAvailable()`.
- **Self-hosted**: `RP_ID` (relying party domain) configurable via env. Defaults to `localhost`.

## Library Choice

`@simplewebauthn/server` (~80k weekly downloads, well-maintained) + `@simplewebauthn/browser` (matching client). They handle the messy WebAuthn parsing (CBOR, COSE keys, attestation). Without them the implementation is ~500 lines of binary parsing.

## Data Model

**New table: `passkeys`**

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK autoincrement |
| userId | INTEGER | FK → users.id, ON DELETE CASCADE |
| credentialId | TEXT | base64url-encoded WebAuthn credential ID, UNIQUE |
| publicKey | TEXT | base64-encoded COSE public key |
| counter | INTEGER | Signature counter, anti-replay |
| deviceName | TEXT | Friendly name from User-Agent ("Chrome on Mac") |
| transports | TEXT | JSON array, e.g. `["internal"]` or `["hybrid","internal"]` |
| createdAt | TEXT | ISO timestamp, default now |
| lastUsedAt | TEXT | ISO timestamp, nullable |

## Backend

### Routes (all in `server/src/routes/passkeys.ts`)

**Public (no auth):**
- `GET /api/auth/passkey/available` → `{ available: boolean }` — true if any passkey exists. Login page calls this to decide whether to auto-prompt.
- `POST /api/auth/passkey/auth/options` → returns `PublicKeyCredentialRequestOptions` with challenge + allowedCredentials. Stores challenge in a short-lived cookie.
- `POST /api/auth/passkey/auth/verify` → body is browser's signed assertion. Verifies signature against stored public key + counter. On success: sets JWT cookie (same as password login). Returns `{ ok: true }`.

**Auth required:**
- `POST /api/auth/passkey/register/options` → returns `PublicKeyCredentialCreationOptions` with challenge + excludeCredentials (existing IDs to prevent double-register).
- `POST /api/auth/passkey/register/verify` → body is browser's attestation response + optional `deviceName`. Stores credential. If no deviceName provided, derive from User-Agent server-side.
- `GET /api/auth/passkey` → `[{ id, deviceName, createdAt, lastUsedAt }]`
- `DELETE /api/auth/passkey/:id` → removes one passkey

**Password change** (`server/src/routes/auth.ts`):
- `POST /api/auth/password/change` (auth required) → `{ current, new }`. Bcrypt-verify current. If valid, hash new and update users row. Issue fresh JWT (so user stays logged in).

### Challenge Storage

Challenges are server-generated random buffers that browsers must sign. Storage options:
- **Cookie** (`pk_chal`, httpOnly, 5 min expiry) — simple, stateless, our choice
- In-memory map (lost on restart, doesn't scale beyond single instance)
- DB table (overkill for 5-minute TTL)

We use a httpOnly cookie. After verify, clear it.

### Env vars (added to `.env.example`)

```
RP_ID=localhost              # 'localhost' for dev, your domain in production
RP_NAME=DevTodo              # display name shown in browser prompts
RP_ORIGIN=http://localhost:5173  # for dev. Comma-separated for multiple.
```

## Frontend

### New library

`@simplewebauthn/browser` — provides `startRegistration()` and `startAuthentication()` helpers.

### New components

**`client/src/components/PasskeyBanner.tsx`**
- Renders above the todo list (top of header).
- Visible when: authenticated, `PublicKeyCredential` supported, and user has zero registered passkeys.
- Layout: small horizontal pill with lock icon + "Enable fingerprint for fast login" + "Set up" button + "Maybe later" link.
- Dismissable per session (localStorage `passkey-banner-dismissed-<userId>`). After successful registration, shows "Passkey added" for 2s then unmounts permanently.

**`client/src/components/LoginPage.tsx` updates**
- `useEffect` on mount:
  1. Check `window.PublicKeyCredential` and `isUserVerifyingPlatformAuthenticatorAvailable()`. If false, render existing password form unchanged.
  2. Call `GET /api/auth/passkey/available`. If `false`, render password form.
  3. If both true: show "Tap to unlock with fingerprint" button + auto-trigger `startAuthentication()` after 100ms (gives user a beat to see the UI).
  4. On success → redirect.
  5. On user cancel or hardware error → show "Use password instead" link that reveals the password input. Don't auto-retry.
- Password input always remains visible below, just collapsed initially when biometric is offered.

**`client/src/components/SecuritySection.tsx`** (new component, rendered inside `SettingsPage`)
- **Change password subsection**: 3 inputs (current, new, confirm) + "Update password" button. Shows inline error if current password wrong or new password too short (<4).
- **Passkeys subsection**:
  - List rendering each passkey: device icon (laptop/phone based on transports), deviceName, "Added Apr 15", "Last used 2h ago" or "Never used", trash button (with confirm).
  - "Add passkey" button at bottom. Click → re-prompts password (security check) → calls `POST /api/auth/passkey/register/options` → calls `startRegistration()` from `@simplewebauthn/browser` → on success POSTs verify with deviceName auto-populated.
  - HTTPS warning banner at top of subsection if `location.protocol !== 'https:'` and host !== 'localhost'.

### Files

- `server/src/db/schema.ts` — add passkeys table
- `server/src/routes/passkeys.ts` — new
- `server/src/routes/auth.ts` — add password/change endpoint
- `server/src/index.ts` — mount /api/auth/passkey
- `server/.env.example` — RP_* vars
- `client/src/lib/passkey.ts` — small wrapper around @simplewebauthn/browser
- `client/src/components/PasskeyBanner.tsx` — new
- `client/src/components/SecuritySection.tsx` — new
- `client/src/components/LoginPage.tsx` — auto-prompt logic
- `client/src/components/SettingsPage.tsx` — render SecuritySection

## UX Flows

### First-time setup
1. User creates password → logged in
2. PasskeyBanner appears at top: "Enable fingerprint for fast login?"
3. Click "Set up" → browser prompts biometric → device creates keypair → public key sent to server
4. Banner becomes green "Passkey added ✓" for 2s then disappears

### Subsequent login
1. Visit app → /api/auth/status returns `{ authenticated: false, needsSetup: false }`
2. Login page checks `/api/auth/passkey/available` → true
3. Page shows "Unlock with fingerprint" button; biometric prompt auto-triggers
4. User taps sensor → JWT cookie set → redirect to dashboard
5. If cancel → "Use password instead" link → password form reveals

### Adding a second device
1. Open app on phone (logged out)
2. Login with password
3. Settings → Security → "Add passkey" → re-enter password → tap phone biometric → done
4. Banner doesn't show on phone next time (passkey exists for this device, login auto-prompts)

### Password change
1. Settings → Security → Change password subsection
2. Enter current + new + confirm → submit
3. Inline success toast: "Password updated"

## Verification Plan

1. Fresh install on `localhost:3000`. Create password. Banner appears.
2. Click "Set up" → Touch ID prompt appears (Mac). Tap. Banner shows success then disappears.
3. Logout. Login page shows fingerprint button + auto-prompts. Tap → logged in.
4. Cancel biometric prompt → password input appears as fallback.
5. Open Settings → Security. See passkey listed: "Chrome on Mac, added today, last used just now".
6. "Add passkey" → re-enter password → register a second one → list shows two.
7. Delete one → confirm → list shows one.
8. Change password → enter wrong current → inline error. Enter correct → success.
9. Old passkeys still work after password change (passkeys are independent).
10. Test on `http://example.com` (not HTTPS, not localhost) → warning shown, registration disabled.

# credit-disputor

## Backend API

The API lives in [`backend/`](backend/). It uses **Node.js**, **Express**, **TypeScript**, **Prisma**, and **PostgreSQL**. Docker Compose in that folder runs Postgres for local development.

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### Setup

From the `backend` directory:

1. Start the database:

   ```bash
   cd backend
   docker compose up -d
   ```

2. Install dependencies and configure the environment:

   ```bash
   npm install
   cp .env.example .env
   ```

   Set `JWT_SECRET` in `.env` to a long random string. `DATABASE_URL` should match the Postgres credentials in `.env` / `docker-compose.yml` (defaults work out of the box).

   Environment validation uses **envalid**. Important variables (see `backend/.env.example`):

   - `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`.
   - `OTP_CODE_SECRET` — HMAC secret for email OTP codes (required).
   - `OTP_TTL_MS`, `PASSWORD_RESET_TTL_MS` — e.g. `10m`, `1h`.
   - `EMAIL_PROVIDER` — `console` (log only) or `resend`; set `RESEND_API_KEY` and `EMAIL_FROM` when using Resend.
   - `FRONTEND_URL` — base URL for password reset links (`/reset-password?token=...`).
   - `GOOGLE_CLIENT_ID` — optional; Google OAuth **Web client ID** for `POST /auth/google` (Google Identity Services). Comma-separated for multiple clients. Leave empty to disable Google sign-in (endpoint returns 503).
   - `PUBLIC_API_URL` — optional; public origin of this API for the logo in HTML emails (`/public/logo.jpg`). Defaults to `http://localhost:PORT` when unset; set to your deployed API URL (HTTPS) in production so images load in mail clients.
   - `LOG_LEVEL`, `LOG_PRETTY` — **Pino** logging.

3. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

4. Run the server:

   ```bash
   npm run dev
   ```

The server listens on `http://localhost:3000` (or the `PORT` you set).

### API documentation

- **Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Email verification (one-time after signup)

After **signup**, the API returns `{ user, verificationRequired: true }` and sends a **4-digit code** by email (or logs it when `EMAIL_PROVIDER=console`). Exchange the code for tokens with **`POST /auth/verify-email`** (`email`, `code`). This is **signup email verification only**—do not confuse it with sign-in MFA below. Once verified, the user has `emailVerified: true`.

**Password sign-in** then requires **MFA**: **`POST /auth/signin`** returns `{ mfaRequired, mfaToken, maskedEmail, mfaMethods }` (not session tokens), including `mfaMethods.webauthn` when the user has passkeys. With the same **`Authorization: Bearer <mfaToken>`** header you can: call **`POST /auth/signin/send-code`** to email a 4-digit sign-in OTP, then **`POST /auth/signin/mfa/verify`** with `{ kind: "email_otp" | "totp" | "backup_code", code }`; or, if `webauthn` is true, call **`POST /auth/signin/webauthn/authentication-options`** then **`POST /auth/signin/webauthn/authentication-verify`** with the browser WebAuthn assertion. **Google sign-in** (`POST /auth/google`) issues tokens in one step with no MFA.

Use **`POST /auth/resend-email-verification`** (`email`) to resend the **signup** verification code.

### Phone verification (Twilio Verify)

Signup stores **`phoneNumber`** as **E.164** (`TWILIO_PHONE_DEFAULT_REGION` helps parse national formats). **SMS is not sent at signup**; the user must be signed in first.

- **`POST /v1/phone/send-verification`** (Bearer **`accessToken`**) — starts or restarts Twilio Verify SMS when `phoneVerified` is false and a phone is on file.
- **`POST /v1/phone/verify`** (Bearer) — `{ code }` — returns `{ ok: true, user }` with **`phoneVerified: true`**. Does not issue new session tokens.
- **`TWILIO_VERIFY_PROVIDER=console`** — logs instead of sending SMS; use code **`000000`** to verify locally.
- Changing the number in **`PATCH /v1/me`** resets **`phoneVerified`** and sends SMS to the new number; the same v1 verify endpoints apply.

Email **templates** live under `backend/src/lib/emails/`; escaping, branded HTML layout (header with logo, footer), and sending are handled in `backend/src/services/email/` (**Resend** or **console** via `email.service.ts`). Static assets for mail (e.g. [`backend/public/logo.jpg`](backend/public/logo.jpg)) are served at **`GET /public/...`** when the API is running.

### Password reset

- **`POST /auth/forgot-password`** — `{ "email" }`. Always returns the same generic message (no account enumeration). If the user exists, an email is sent with a link: `{FRONTEND_URL}/reset-password?token=...`.
- **`POST /auth/reset-password`** — `{ "token", "password", "confirmPassword" }`. Valid token updates the password and revokes existing refresh tokens.

### Auth endpoints (summary)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Register; email OTP; phone saved as E.164, `phoneVerified` false until v1 phone verify |
| `POST` | `/auth/signin` | Password check → `mfaToken` + `mfaMethods` |
| `POST` | `/auth/signin/send-code` | Bearer `mfaToken` → emails sign-in OTP |
| `POST` | `/auth/signin/resend-code` | Same as send-code |
| `POST` | `/auth/signin/mfa/verify` | Bearer `mfaToken` + `{ kind, code }` → session tokens |
| `POST` | `/auth/signin/webauthn/authentication-options` | Bearer `mfaToken` → WebAuthn assertion options |
| `POST` | `/auth/signin/webauthn/authentication-verify` | Bearer `mfaToken` + assertion JSON → session tokens |
| `POST` | `/auth/google` | GIS `idToken` → session tokens (no MFA) |
| `POST` | `/auth/verify-email` | `{ email, code }` — verify email after signup |
| `POST` | `/auth/resend-email-verification` | `{ email }` — resend signup verification code |
| `POST` | `/auth/forgot-password` | Request reset email |
| `POST` | `/auth/reset-password` | Set new password with token from email |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `GET` | `/auth/me` | Current user (Bearer access token) |
| `POST` | `/v1/phone/send-verification` | Bearer — resend SMS for current user’s phone |
| `POST` | `/v1/phone/verify` | Bearer + `{ code }` — set `phoneVerified` |

After signup OTP verification, sign-in MFA verification, or Google sign-in, responses include `accessToken`, `refreshToken`, and `user`. Store refresh tokens securely; they are one-time rotatable.

### Health

- `GET /health` — process liveness
- `GET /health/db` — database connectivity (returns `503` if the DB is down)

### Production notes

- Use TLS (HTTPS) in front of the API in production.
- Keep `JWT_SECRET` secret and rotate if compromised.

### Troubleshooting Postgres in Docker

If the database container exits with “database files are incompatible with server”, an old volume was created by a different major Postgres version. Remove the project volume and start again (this deletes local DB data):

```bash
cd backend
docker compose down -v
docker compose up -d
```

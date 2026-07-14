# Auth setup

The site is private: you sign in with Google, and only allowlisted email
addresses are let through. `brianas@behindthechair.com` is hardcoded as admin in
`src/lib/auth.ts` and always has access. Everyone else is managed on the
**Users** page (admins only).

Sign-in won't work until you create a Google OAuth client and paste two values
into `.env`. That's the only manual step.

## 1. Create the Google OAuth client

1. Go to <https://console.cloud.google.com/> and create a project (any name).
2. In the sidebar: **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - Fill in app name, your support email, and your developer email. Nothing
     else is required.
   - You do **not** need to submit for verification. Leave it in "Testing" — you
     may add yourself and other users as Test users, or publish it. Either is
     fine, because our own allowlist is what actually controls access.
3. In the sidebar: **APIs & Services → Credentials → Create credentials → OAuth
   client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs** — add one line per environment. These must
     match exactly, including the scheme and any port:
     - `http://localhost:3000/api/auth/callback` (local development)
     - `https://your-real-domain.com/api/auth/callback` (production)
4. Copy the **Client ID** and **Client secret**.

## 2. Fill in `.env`

```sh
AUTH_SECRET="..."            # already generated; regenerate with: openssl rand -hex 32
GOOGLE_CLIENT_ID="..."       # paste from step 1
GOOGLE_CLIENT_SECRET="..."   # paste from step 1
APP_URL="http://localhost:3000"   # in production, the site's real https:// URL
```

`.env` is gitignored — never commit these.

`APP_URL` is what builds the OAuth redirect URI, so it must line up with what
you registered in step 1. Changing `AUTH_SECRET` signs everyone out.

## 3. Run it

```sh
npx prisma db push   # creates the AllowedUser table (already done once)
npm run dev
```

Visit <http://localhost:3000>. You'll be bounced to `/login`. Sign in as
`brianas@behindthechair.com`, then use the **Users** tab to add everyone else by
their Google email address.

## How access is enforced

Four independent layers, so no single mistake opens the site up:

- `src/proxy.ts` bounces signed-out visitors to `/login` before any page renders.
- `getSession()` in `src/lib/auth.ts` verifies the cookie's HMAC signature and
  its expiry, then **re-checks the allowlist on every request**. Removing someone
  on the Users page cuts them off on their next click, and a role stored in the
  cookie is never trusted — it's re-read from the database, so a tampered cookie
  can't grant admin.
- Every Server Action starts with `await requireUser()` (or `requireAdmin()`).
  This matters: Server Actions are reachable as direct POST endpoints whether or
  not the UI ever renders a button for them, so a page-level check is not enough
  on its own.
- Unverified Google emails are rejected, so an unverified address can't be used
  to match an allowlist entry.

## Keeping it out of search engines

Also four layers, since crawlers honour different ones:

- `src/app/robots.ts` serves `Disallow: /` for all user agents. It's deliberately
  reachable while signed out — a crawler redirected to `/login` would never read
  the rule, and an unreachable `robots.txt` is treated as "crawl anything".
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` on every
  response, set in `next.config.ts` (covers static files) and `src/proxy.ts`
  (covers redirects). This is the header crawlers respect even for non-HTML.
- `<meta name="robots" content="noindex, nofollow, nocache">` from the layout's
  metadata.
- The content itself is behind the login wall, so there's nothing to index.

Note that `robots.txt` and `noindex` are honoured, not enforced — they stop
Google, not a determined human. The login wall is the actual protection.

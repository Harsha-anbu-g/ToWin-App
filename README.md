# ToWin Mobile

React Native + Expo app of the ToWin elders ↔ helpers trust platform. Same brand
and theme as the website (`../ToWin`, read-only reference), redesigned for mobile:
Instagram-shaped shell — Home feed, big center action, Messages, Profile, with
Friends top-right.

## Run it

1. **Backend** (Spring Boot, reused unchanged; Postgres runs natively on :5432):

   ```bash
   cd /Users/aghar/Documents/Projects/ToWin/backend
   set -a && source ../.env && set +a   # JWT_SECRET etc.
   ./mvnw spring-boot:run               # serves :8080
   ```

2. **App**:

   ```bash
   cd App
   npm install
   npx expo start
   ```

3. **Phone**: install Expo Go, then open Safari on the phone and go to
   `exp://<your-mac-lan-ip>:8081` (find the IP with `ipconfig getifaddr en0`;
   it's also baked into `app.json → expo.extra.apiBaseUrl` — update it when the
   network changes). Phone and Mac must share a network; watch out for
   FortiClient/VPNs blocking LAN traffic on the Mac.

**Demo logins** (bypass the login rate limiter): elder `elder` / `12345678`,
helper `helper` / `123456789`.

## Hard constraints

- **Expo SDK 54** — the user's iPhone Expo Go supports SDK 54 only. Do NOT
  upgrade `expo` past 54 without re-checking Expo Go → Settings → Supported SDK.
- `../ToWin` is **read-only** reference. All work happens here.
- **Never push to any remote** without explicit permission (local commits only).
- Theme tokens (`src/theme/tokens.js`) are a locked 1:1 port of the website's
  `index.css` — do not "improve" the palette.
- Login body field is `identifier`, not `email`. Bad logins trip a 15-min
  per-IP 429 — use the demo logins for testing.

## Layout

- `app/` — expo-router screens: `(auth)` stack, `(tabs)` shell (home / action /
  messages / profile), pushed screens (chat, friends, trust, streaks, game,
  profile sub-screens, legal, admin landing).
- `src/theme` — tokens (light + night) and ThemeContext (night is opt-in only).
- `src/api` — axios client (JWT bearer, 401-with-token → logout) + base URL config.
- `src/context` — Auth (JWT in SecureStore) and Toast.
- `src/components` — UI kit (`ui/`), home feed cards (`home/`), assistant, etc.
- `src/lib` — pure logic (jwt, needs, roles, streaks, peekaboo, password) — unit-tested.
- `__tests__` — jest-expo suites (`npm test`).

## Deferred to the release phase (needs spending / store accounts)

Apple Developer ($99/yr incl. TestFlight) · Play Console ($25 + 12-tester,
14-day closed test) · EAS builds · Google sign-in (client IDs + backend
redirect) · push notifications · photo upload · final icon artwork.

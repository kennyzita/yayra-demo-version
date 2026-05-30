# Converting Yayracare to iOS / Android

> This document outlines three viable paths, ranked by effort and trade-offs.

---

## Option 1 — Progressive Web App (PWA) — Lowest Effort

### What it is
A PWA is your existing Next.js web app with a thin layer of configuration that makes it installable on iOS and Android home screens without going through the App Store.

### What you add
| File / Config | Purpose |
|---------------|---------|
| `public/manifest.json` | App name, icon, theme colour, start URL |
| `public/sw.js` | Service worker for offline caching |
| `<link rel="manifest">` in `layout.tsx` | Links the manifest |
| HTTPS (already required for Supabase) | Required for PWA install prompt |

### Capabilities you gain
- "Add to Home Screen" install on iOS and Android
- App icon on home screen, splash screen
- Runs full-screen (no browser chrome)
- Offline support for previously visited pages (via service worker cache)
- Push notifications (Android; iOS 16.4+ only)

### Limitations
- **App Store distribution not possible** — users must install via browser
- No access to native device APIs (camera, biometrics, NFC, Bluetooth)
- iOS has stricter PWA limitations (no background sync, limited push support before iOS 17)
- Session storage / cookies behave differently in standalone mode on iOS

### Effort
~2–3 days of work. No new framework, no new codebase.

### When to choose this
You want mobile-friendly access quickly without app store distribution.

---

## Option 2 — Capacitor (Wrap Existing Web App) — Medium Effort

### What it is
[Capacitor](https://capacitorjs.com/) by Ionic wraps your existing Next.js web app in a native WebView shell and compiles it as a real iOS `.ipa` / Android `.apk`. The web code runs inside the native app.

### How it works
```
Next.js app (built as static export or server)
        ↓
Capacitor shell (native iOS / Android project)
        ↓
App Store / Google Play
```

### What you add / change

| Task | Effort |
|------|--------|
| `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` | 1 hr |
| `npx cap init` — configure app ID and name | 30 min |
| Switch Next.js to `output: 'export'` (static HTML) | 1–2 days (requires removing server-side API routes) |
| `npx cap add ios && npx cap add android` | 1 hr |
| Xcode (Mac required) to build iOS; Android Studio for Android | Setup: 1–2 days |
| App Store / Google Play developer account ($99/yr Apple; $25 once Google) | Admin task |
| App Store review process (Apple: 1–7 days; Google: 1–3 days) | |

### The critical constraint: API routes
Next.js API routes (`/api/*`) **cannot run inside a Capacitor app** because there is no Node.js server. Your options:
1. **Deploy the Next.js app to Vercel** (already done or planned) and have the Capacitor shell call the remote API. The app is essentially a "native shell around your hosted web app." This is the simplest path.
2. **Move all API logic to Supabase Edge Functions** — more work but fully serverless.

Option (1) means the app requires internet connectivity, which is acceptable for a care management tool.

### Native features you can add with Capacitor plugins
| Feature | Plugin |
|---------|--------|
| Push notifications | `@capacitor/push-notifications` |
| Camera (document scanning) | `@capacitor/camera` |
| Biometric login (Face ID / Touch ID) | `@capacitor-community/biometric-auth` |
| File system access | `@capacitor/filesystem` |
| Haptic feedback | `@capacitor/haptics` |
| Status bar styling | `@capacitor/status-bar` |

### Limitations
- UI is still a WebView — does not feel as native as a React Native app
- Performance is web-level, not native-level
- Requires a Mac to build and submit the iOS app

### Effort
2–4 weeks of development. Most of the time is DevOps (Xcode setup, code signing, App Store submission), not code changes.

### When to choose this
You want App Store distribution with minimal rewriting. The app doesn't need heavy animations or complex native UI.

---

## Option 3 — React Native (Full Native App) — Highest Effort

### What it is
A fully native mobile app rewritten in React Native (or Expo). All UI components are rewritten as native views. The business logic (Supabase calls, auth, data fetching) can be largely reused.

### What you reuse from the existing app
| Reusable | Not Reusable |
|----------|-------------|
| Supabase client setup | All JSX/TSX component UI code |
| Data fetching logic (queries) | All inline `style={{ }}` CSS-in-JS |
| Auth flow (Supabase Auth + SSR) | Next.js routing (replaced by React Navigation) |
| API route logic (move to Supabase Edge Functions) | All HTML elements (`div`, `input`, etc.) |
| Business logic utilities | `next/link`, `next/navigation`, etc. |

### Recommended stack
```
Expo (managed workflow) + React Native
  + @supabase/supabase-js (same as web)
  + React Navigation (replaces Next.js routing)
  + NativeWind (Tailwind CSS for React Native)
  + React Native Paper or Tamagui (UI component library)
```

### Key rewrites required

| Current (Next.js) | React Native equivalent |
|-------------------|------------------------|
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` |
| `<a href>` | `<Link>` (React Navigation) |
| CSS `display: flex` | Native flexbox (default in RN) |
| `next/router` | React Navigation stack/tab navigators |
| Server-side API routes | Supabase Edge Functions or direct client queries |
| File upload (FormData) | `expo-document-picker` + `supabase.storage` |
| `sessionStorage` | `SecureStore` (`expo-secure-store`) |

### Scope estimate

| Section | Effort |
|---------|--------|
| Auth (login, register, reset) | 3–5 days |
| Admin dashboard | 3–4 days |
| Staff dashboard | 2–3 days |
| Scheduling (calendar) | 5–7 days |
| Timesheets | 3–4 days |
| Case notes | 3–4 days |
| Documents + file upload | 3–5 days |
| Applications | 4–5 days |
| Training / onboarding | 2–3 days |
| Navigation + auth guards | 2–3 days |
| Push notifications | 2–3 days |
| Testing + App Store submission | 5–10 days |
| **Total estimate** | **~10–14 weeks** |

### When to choose this
You want the best mobile UX, native feel, camera scanning for documents, biometric login, and plan to make mobile the primary interface.

---

## Comparison Summary

| | PWA | Capacitor | React Native |
|--|-----|-----------|--------------|
| Effort | Low (2–3 days) | Medium (2–4 weeks) | High (10–14 weeks) |
| App Store distribution | No | Yes | Yes |
| Native device APIs | No | Via plugins | Full access |
| Performance | Web | Web (WebView) | Near-native |
| Reuse existing code | 100% | ~90% | ~30% (logic only) |
| iOS support | Limited PWA | Full | Full |
| Offline support | Partial (cache) | Partial | Full (with SQLite) |
| Mac required for iOS | No | Yes | Yes |
| Cost (stores) | Free | $99/yr + $25 once | $99/yr + $25 once |

---

## Recommended Path for This App

**Start with Option 2 (Capacitor).**

Reasoning:
- The app is data-driven and form-heavy — not a game or animation-heavy app. WebView performance is perfectly acceptable.
- 90% of your Next.js code is directly reusable without rewriting UI.
- You get App Store distribution (important for enterprise/regulated health tools).
- With Capacitor you can progressively add native plugins (biometrics, push notifications, camera for document scanning) without rebuilding from scratch.
- If you later decide you want a fully native experience, you can migrate incrementally.

**Immediate next step:**
1. Deploy the Next.js app to Vercel (the Capacitor shell calls the hosted app)
2. Run `npx cap init` and add `ios` + `android` targets
3. Build the static output and sync to Capacitor
4. Test in Xcode simulator and Android emulator
5. Submit to App Store with a healthcare app description and privacy policy

---

## HIPAA Note for Mobile

Regardless of which path you choose, a mobile app handling PHI requires:
- **Data in transit:** HTTPS (already enforced) — ensure it applies to all API calls from the app
- **Data at rest:** Use `expo-secure-store` (React Native) or `SecureStorage` (Capacitor plugin) instead of `AsyncStorage` or `localStorage` for any PHI stored locally
- **Biometric lock:** Consider requiring biometric/PIN on app resume after background
- **Screenshot prevention:** iOS and Android can block screenshots in sensitive views
- **Remote wipe:** Supabase session revocation effectively logs out on next request
- **Business Associate Agreement (BAA):** Ensure your hosting provider (Vercel), Supabase, and Resend all offer BAAs

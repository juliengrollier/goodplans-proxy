# Good Plans NYC

Standalone PWA — installable on iOS/Android home screen. Reads NYC newsletters from your Gmail label, extracts events via Anthropic API (in Google Apps Script), displays them with personalised scoring.

## Architecture

```
Gmail "Good Plans NYC" label
  ↓ daily 7am
Apps Script (Google's servers)
  ↓ uses your Anthropic API key
Extracted events JSON (cached in Script Properties)
  ↓ direct HTTPS fetch (no claude.ai, no rate limits)
This app (in your browser)
  ↓ localStorage
You
```

## Local development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy to Vercel

```bash
# Option 1: Vercel CLI
npm install -g vercel
vercel

# Option 2: GitHub + Vercel dashboard
git init && git add . && git commit -m "Initial"
# push to a GitHub repo
# then at vercel.com/new → Import the repo → Deploy
```

Vercel auto-detects Vite. No env vars needed. Build command: `npm run build`, output: `dist`.

## Once deployed

1. Visit your Vercel URL on your phone
2. iOS Safari: Share → Add to Home Screen
3. Android Chrome: tap "Install app" prompt
4. App opens in standalone mode, no browser UI, works offline

## Apps Script setup

If you haven't already set up the Apps Script side:

1. Go to script.google.com → New Project
2. Paste `goodplans-appsscript-v5.js` (from the artifact outputs)
3. Project Settings → Script Properties → Add `ANTHROPIC_KEY = sk-ant-api03-...`
4. Save, then Deploy → New deployment → Web app → Execute as: Me, Anyone with link
5. Copy the deployment URL into the Sync tab of the app
6. Run `setupDailyTrigger()` once to install the daily auto-sync
7. Run `runDailySync()` once manually to seed the cache

## Tech stack

- React 18 + Vite
- vite-plugin-pwa (service worker, manifest, offline)
- localStorage for persistence
- No backend (Apps Script is the backend)
- ~225KB bundled, ~70KB gzipped

## Files

- `src/App.jsx` — the entire app (~1000 lines)
- `src/main.jsx` — React entry point
- `index.html` — HTML shell with PWA meta tags
- `public/` — icons, favicon
- `vite.config.js` — Vite + PWA plugin config

# StreamBeat

A full-stack video platform — upload, watch, organize, and share videos — with a Spotify-style dark interface. Supports native uploads (with automatic multi-resolution transcoding) alongside importing videos straight from YouTube (official embed, metadata only — never re-hosted).

## Features

**Auth & account**
- Email/password registration with email verification, password reset (via email)
- Two-factor authentication (TOTP + one-time backup codes)
- "Continue with Google/GitHub" OAuth sign-in (optional, only shown once configured)
- Session management — see and revoke individual signed-in devices from Settings
- **Multi-account switching** — sign into more than one account in the same browser and switch between them instantly, no re-entering a password
- Light/dark/system theme

**Video**
- Upload (`.mp4`/`.webm`/`.ogg`, up to 500MB) with automatic background transcoding to multiple resolutions
- Import from YouTube: a single video by URL, an entire channel's uploads, or a direct video-file URL
- Visibility per video: public, unlisted, or private
- Captions (WebVTT), chapters (parsed from timestamps in the description), theater mode, playback speed/resolution controls
- Timestamped personal notes while watching
- Likes, comments (with the video owner able to moderate comments on their own uploads)

**Organization & discovery**
- Categories — a real, DB-backed, user-extensible list (create a new one inline from the upload/import forms, not a fixed hardcoded set)
- Tags, free-text search, duration filters
- Collections (playlists) — nested folders, collaborators (viewer/editor roles), and a public/private toggle; a public playlist shows up on its owner's channel page and is viewable by anyone, with a YouTube-style sidebar on the Watch page
- Trending — ranked by *recent* view velocity (last 7 days), not just lifetime view count
- Personalized recommendations based on watch history

**Social**
- Channel pages (videos, public playlists, subscriber count, recent activity)
- Subscriptions
- Profile photo upload
- Notifications (subscribe/comment/like)

**Creator tools**
- Per-video and per-channel analytics (views over time, category breakdown)
- Bulk actions on your own videos (delete, tag, add to collection) from your channel page

**Other**
- Admin-editable Help/FAQ section
- SEO: dynamic sitemap.xml/robots.txt, and server-rendered Open Graph previews so a shared video link actually shows its title/thumbnail on WhatsApp/Slack/Discord/Twitter
- Installable PWA

## Stack

- **Client**: React (Vite), Redux Toolkit, React Router
- **Server**: Node.js, Express, MongoDB (Mongoose)
- **Auth**: JWT access tokens (in-memory) + per-account httpOnly refresh cookies, bcrypt password hashing
- **Optional integrations** (the app works without any of these — each just enables one feature):
  - YouTube Data API v3 — importing videos/channels
  - Google/GitHub OAuth — social sign-in
  - Brevo (or SMTP) — verification/reset emails
  - Any S3-compatible storage (Supabase Storage, Cloudflare R2, Backblaze B2, MinIO...) — persistent video/thumbnail storage across redeploys
  - ffmpeg/ffprobe — video transcoding and duration probing

## Project layout

```
client/   React app
server/   Express API
```

## Prerequisites

- Node.js 18+
- A MongoDB instance — either:
  - Local: install MongoDB Community Server and run `mongod`, or
  - Free-tier [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a connection string)
- ffmpeg + ffprobe on your PATH (for video transcoding/duration probing) — e.g. `winget install Gyan.FFmpeg` on Windows, `brew install ffmpeg` on macOS, or your distro's package manager on Linux

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` — at minimum:
- `MONGO_URI` — your local or Atlas connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate strong random values, e.g.:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- `CLIENT_ORIGIN` — leave as `http://localhost:5173` for local dev

Everything else in `.env.example` is optional and individually documented there — see [Optional integrations](#optional-integrations) below for the features each one unlocks.

```bash
npm run dev
```

Server starts on `http://localhost:5000`. Check `http://localhost:5000/api/health` returns `{"status":"ok"}`.

### 2. Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Client starts on `http://localhost:5173`.

## Optional integrations

None of these are required to run the app — skip any you don't need.

**Import from YouTube** — get a key at [console.cloud.google.com](https://console.cloud.google.com/): enable "YouTube Data API v3", then Credentials → Create Credentials → API key. Set `YOUTUBE_API_KEY`.

**Verification/reset emails** — set `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` ([brevo.com](https://www.brevo.com), free tier, no card required — verify a sender email in their dashboard first). Prefer this over the `SMTP_*` fallback: many hosts (including Render's free tier) block outbound SMTP ports, silently breaking email — Brevo sends over plain HTTPS. Without either configured, reset/verification links are logged to the server console in development instead of emailed.

**Google/GitHub sign-in** — set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and/or `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`. Each provider's OAuth app must have its callback URL set to `<SERVER_ORIGIN>/api/auth/google/callback` (or `/github/callback`) — see [Deployment](#deployment) for why `SERVER_ORIGIN` matters.

**Persistent cloud storage for uploads** — set `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_NAME` (works with Supabase Storage, Cloudflare R2, Backblaze B2, MinIO, or anything else S3-compatible). Without this, uploads stay on local disk (`STORAGE_DIR`, or `server/src/storage` by default) — fine for local dev, but most PaaS free tiers wipe local disk on every redeploy.

## Using the app

1. Register an account, then log in. Optionally set up 2FA or link Google/GitHub from Settings.
2. Go to **Upload**, pick a video file, an optional thumbnail, and a category (or create a new one inline), then submit — or use **Import** to pull a video/channel in from YouTube.
3. Watch it from the Home feed (Trending, Recommended, Recently uploaded, or filter by category/duration), or find it on a Channel page.
4. Organize videos into Collections (playlists) — make one public to share it, or keep it private.
5. Comment, like, subscribe to channels, and check **Help** for FAQs about the app itself.

## Deployment

The server can serve the built client directly from the same origin (`server/src/app.js` serves `client/dist` and falls back to it for any non-`/api` route) — the simplest way to deploy both together as one service, avoiding CORS and keeping the refresh cookie same-site. Build the client (`npm run build` in `client/`) before deploying the server.

**`CLIENT_ORIGIN` and `SERVER_ORIGIN` must be set to the app's real public URL in production, not `localhost`.** In the combined single-service setup above, they're the same URL. Getting this wrong doesn't crash anything — it silently breaks emailed links, the sitemap, social link previews, and (if `SERVER_ORIGIN` specifically) OAuth login, since nothing throws an error until someone actually clicks the broken thing. The server logs a loud warning at boot if either looks misconfigured in production, so check the logs after deploying.

## Security notes

- Passwords are hashed with bcrypt; never stored or logged in plain text.
- Access tokens live in memory only (never localStorage); each account's refresh token is its own httpOnly, sameSite=strict cookie, invisible to JavaScript.
- Uploaded files are renamed to random UUIDs on disk/storage and validated against a MIME + extension whitelist — the original filename and user input never influence a filesystem path.
- Rate limiting is applied per-endpoint-category (auth, uploads, email actions, YouTube API calls, etc.); Helmet security headers and a locked-down CORS origin are applied globally.
- Private/unlisted videos and private collections are enforced server-side on every read path, not just hidden in the UI.
- Set `NODE_ENV=production` before any real deployment — this suppresses stack traces from API error responses. Also put the app behind HTTPS in production (not required for local dev).

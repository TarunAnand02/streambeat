# StreamBeat

A video-sharing platform (upload, watch, comment, like, browse by category — YouTube-style) with a Spotify-style dark interface. You can also import videos from YouTube (metadata + official embed) alongside your own uploads.

## Stack

- **Client**: React (Vite), Redux Toolkit, React Router
- **Server**: Node.js, Express, MongoDB (Mongoose)
- **Auth**: JWT access tokens (in-memory) + httpOnly refresh cookie, bcrypt password hashing

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

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:
- `MONGO_URI` — your local or Atlas connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate strong random values, e.g.:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- `CLIENT_ORIGIN` — leave as `http://localhost:5173` for local dev
- `YOUTUBE_API_KEY` — optional, only needed for the "Import from YouTube" feature. Get one at [console.cloud.google.com](https://console.cloud.google.com/): enable "YouTube Data API v3", then create an API key (Credentials → Create Credentials → API key, "Public data" access type). The rest of the app works fine without this set.

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

## Using the app

1. Register an account, then log in.
2. Go to **Upload**, pick an `.mp4`/`.webm`/`.ogg` file (max 500MB), an optional thumbnail, and a category, then submit. Or use **Import from YouTube** to pull in a video by URL (plays via YouTube's official embed, not re-hosted).
3. Watch it from the Home feed, filter by category using the chips/browse cards, or find it on your Channel page.
4. Comment, like, search, and check the **Help** page for FAQs about the app itself.

## Security notes

- Passwords are hashed with bcrypt; never stored or logged in plain text.
- Access tokens live in memory only (never localStorage); the longer-lived refresh token is an httpOnly, sameSite=strict cookie invisible to JavaScript.
- Uploaded files are renamed to random UUIDs on disk and validated against a MIME + extension whitelist — the original filename and user input never influence a filesystem path.
- Rate limiting is applied to auth and upload endpoints; Helmet security headers and a locked-down CORS origin are applied globally.
- Set `NODE_ENV=production` before any real deployment — this suppresses stack traces from API error responses. Also put the app behind HTTPS in production (not required for local dev).
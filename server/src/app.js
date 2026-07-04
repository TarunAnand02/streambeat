import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import analyticsRoutes from './routes/analytics.routes.js';
import authRoutes from './routes/auth.routes.js';
import collectionRoutes from './routes/collection.routes.js';
import commentRoutes from './routes/comment.routes.js';
import helpRoutes from './routes/help.routes.js';
import historyRoutes from './routes/history.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Render (and most PaaS hosts) put the app behind a reverse proxy, which
// sets X-Forwarded-For. Express doesn't trust that header by default, so
// express-rate-limit can't safely resolve the real client IP and refuses to
// run. Trusting exactly one hop matches this kind of single-proxy setup —
// safe here since only Render's own proxy can reach this process directly.
if (env.isProd) {
  app.set('trust proxy', 1);
}

// When cloud storage is configured, video/thumbnail <img>/<video> src
// attributes point (via a 302 redirect) at that provider's own domain —
// derive it from STORAGE_ENDPOINT so the CSP below automatically allows
// whichever provider is configured (Supabase, R2, etc.) without a code
// change every time.
const storageOrigin = env.storage.endpoint ? new URL(env.storage.endpoint).origin : null;

// The client and API are served from different origins (different ports in
// dev, likely different subdomains in production), and the client needs to
// load video/thumbnail media directly via <video>/<img> src URLs — so the
// default same-origin Cross-Origin-Resource-Policy would silently block
// every media request in the browser (CORS alone does not cover this).
//
// Helmet's default CSP is also default-src 'self', which blocks the YouTube
// IFrame embed entirely (its <script src> and the iframe itself) — harmless
// in local dev since the client runs on Vite's own server there (no CSP
// applied to that page at all), but it silently breaks YouTube-sourced
// videos the moment the client is served by this same Express app (e.g. the
// combined single-service production deployment). Same issue for cloud
// storage: img-src/media-src must also allow the storage provider's domain,
// since thumbnails/videos load directly from there, not through this server.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-src': ["'self'", 'https://www.youtube.com'],
        'script-src': ["'self'", 'https://www.youtube.com'],
        'img-src': ["'self'", 'data:', 'https://i.ytimg.com', ...(storageOrigin ? [storageOrigin] : [])],
        // blob: is needed for reading a locally-selected file's duration
        // client-side before upload (an off-DOM <video> loads a blob: URL
        // created from the File object) — not related to cloud storage.
        'media-src': ["'self'", 'blob:', ...(storageOrigin ? [storageOrigin] : [])],
      },
    },
  })
);
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
// gzip/brotli-negotiated compression for JSON responses and the served
// client bundle — video/thumbnail bytes are already-compressed binary
// formats (and served via manual Range-aware streaming), so skip those
// explicitly rather than relying only on mime-type sniffing.
app.use(
  compression({
    filter: (req, res) => {
      if (req.path.endsWith('/stream') || req.path.endsWith('/thumbnail')) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/help', helpRoutes);

// Combined single-service deployment: if a client build sits alongside the
// server (see server/README-deploy or the root render.yaml), serve it
// directly so client+API share one origin — this avoids CORS entirely and
// keeps the httpOnly refresh cookie same-site. In normal local dev the
// client build doesn't exist here (Vite's own dev server is used instead),
// so this block is simply skipped.
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (env.isProd && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

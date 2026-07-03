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
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// The client and API are served from different origins (different ports in
// dev, likely different subdomains in production), and the client needs to
// load video/thumbnail media directly via <video>/<img> src URLs — so the
// default same-origin Cross-Origin-Resource-Policy would silently block
// every media request in the browser (CORS alone does not cover this).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
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

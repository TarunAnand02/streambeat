import dotenv from 'dotenv';

dotenv.config();

const required = [
  'MONGO_URI',
  'CLIENT_ORIGIN',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  isProd: (process.env.NODE_ENV || 'development').toLowerCase() === 'production',
  // Optional, comma-separated DNS servers (e.g. "8.8.8.8,1.1.1.1"). Some
  // networks/OS resolver configs cause Node's DNS client to fail SRV lookups
  // for mongodb+srv:// URIs even though the OS resolver works fine — set
  // this to override only if you hit ECONNREFUSED from querySrv on connect.
  dnsServers: process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
    : null,
  // Optional — only the /youtube-preview and /import routes need this. The
  // rest of the app must keep working when it's unset.
  youtubeApiKey: process.env.YOUTUBE_API_KEY || null,
  // Optional SMTP config for sending password-reset emails (e.g. a free
  // Gmail account with an App Password works fine). When unset, the
  // forgot-password endpoint still works in development — it logs the
  // reset link to the server console instead of emailing it — but requires
  // this to be configured to actually deliver email in production.
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
  },
  // Optional S3-compatible cloud storage config — works with Supabase
  // Storage, Cloudflare R2, Backblaze B2, MinIO, etc. When unset, uploads
  // stay on local disk exactly as before — nothing about local storage
  // changes. Needed on hosts like Render's free tier where local disk is
  // wiped on every redeploy.
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || null,
    region: process.env.STORAGE_REGION || 'us-east-1',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || null,
    bucket: process.env.STORAGE_BUCKET_NAME || null,
  },
  // Optional — override only if ffmpeg/ffprobe aren't on PATH.
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  // Optional OAuth ("Continue with Google/GitHub") — each provider is
  // independently optional; the login/register pages simply don't show that
  // button until both its id and secret are set. Redirect URIs are derived
  // from the server's own base URL rather than needing a separate env var.
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || null,
      clientSecret: process.env.GITHUB_CLIENT_SECRET || null,
    },
  },
  serverOrigin: process.env.SERVER_ORIGIN || `http://localhost:${Number(process.env.PORT) || 5000}`,
};

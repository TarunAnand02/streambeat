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
  isProd: (process.env.NODE_ENV || 'development') === 'production',
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
  // Optional Cloudflare R2 (S3-compatible) config. When unset, uploads stay
  // on local disk exactly as before — nothing about local storage changes.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || null,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || null,
    bucket: process.env.R2_BUCKET_NAME || null,
  },
  // Optional — override only if ffmpeg/ffprobe aren't on PATH.
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
};

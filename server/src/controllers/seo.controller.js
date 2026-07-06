import { Video } from '../models/Video.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRobotsTxt = (req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /settings',
      'Disallow: /upload',
      'Disallow: /import',
      'Disallow: /analytics',
      'Disallow: /history',
      'Disallow: /subscriptions',
      '',
      `Sitemap: ${env.clientOrigin}/sitemap.xml`,
    ].join('\n')
  );
};

const STATIC_PAGES = ['', 'help'];

export const getSitemap = asyncHandler(async (req, res) => {
  const videos = await Video.find({ visibility: 'public' })
    .select('_id updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5000) // sitemap-index territory beyond this; fine at current scale
    .lean();

  const staticEntries = STATIC_PAGES.map((p) => `  <url><loc>${env.clientOrigin}/${p}</loc></url>`).join('\n');
  const videoEntries = videos
    .map(
      (v) =>
        `  <url><loc>${env.clientOrigin}/watch/${v._id}</loc><lastmod>${v.updatedAt.toISOString()}</lastmod></url>`
    )
    .join('\n');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticEntries}\n${videoEntries}\n</urlset>`
  );
});

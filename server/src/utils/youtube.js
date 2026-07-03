import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
];

export function extractVideoId(url) {
  for (const pattern of URL_PATTERNS) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }
  return null;
}

// Converts an ISO 8601 duration like "PT4M13S" to whole seconds.
export function parseIsoDuration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
}

const CHANNEL_URL_PATTERNS = [
  { type: 'id', pattern: /youtube\.com\/channel\/(UC[\w-]{22})/ },
  { type: 'handle', pattern: /youtube\.com\/@([\w.-]+)/ },
  { type: 'user', pattern: /youtube\.com\/user\/([\w-]+)/ },
  { type: 'custom', pattern: /youtube\.com\/c\/([\w-]+)/ },
];

// Parses the various channel URL shapes YouTube has used over the years.
// Bare "@handle" (no full URL) is also accepted for convenience.
export function extractChannelIdentifier(input) {
  const trimmed = (input || '').trim();
  for (const { type, pattern } of CHANNEL_URL_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) return { type, value: match[1] };
  }
  if (/^@[\w.-]+$/.test(trimmed)) {
    return { type: 'handle', value: trimmed.slice(1) };
  }
  return null;
}

async function youtubeApiGet(path, params) {
  if (!env.youtubeApiKey) {
    throw new ApiError(500, 'YouTube import is not configured on this server');
  }
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  url.searchParams.set('key', env.youtubeApiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(502, 'Failed to reach the YouTube API');
  }
  return response.json();
}

function normalizeChannelItem(item) {
  const thumbnail =
    item.snippet.thumbnails?.high || item.snippet.thumbnails?.medium || item.snippet.thumbnails?.default;
  return {
    channelId: item.id,
    title: item.snippet.title,
    thumbnailUrl: thumbnail?.url || null,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null,
  };
}

// Resolves any of the supported identifier shapes down to a concrete channel
// (id, title, thumbnail, and the "uploads" playlist that lists all its videos).
export async function resolveChannel(identifier) {
  const part = 'snippet,contentDetails';
  let data;

  if (identifier.type === 'id') {
    data = await youtubeApiGet('channels', { part, id: identifier.value });
  } else if (identifier.type === 'handle') {
    data = await youtubeApiGet('channels', { part, forHandle: identifier.value });
  } else if (identifier.type === 'user') {
    data = await youtubeApiGet('channels', { part, forUsername: identifier.value });
  } else {
    // Legacy /c/CustomName vanity URLs have no direct API lookup — best-effort
    // resolve via search and confirm with a channels.list call.
    const searchData = await youtubeApiGet('search', {
      part: 'snippet',
      q: identifier.value,
      type: 'channel',
      maxResults: 1,
    });
    const candidateId = searchData.items?.[0]?.snippet?.channelId;
    if (!candidateId) throw new ApiError(404, 'Channel not found');
    data = await youtubeApiGet('channels', { part, id: candidateId });
  }

  const item = data.items?.[0];
  if (!item) throw new ApiError(404, 'Channel not found');
  return normalizeChannelItem(item);
}

export async function fetchChannelVideos(uploadsPlaylistId, pageToken) {
  const playlistData = await youtubeApiGet('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: 24,
    pageToken,
  });

  const videoIds = playlistData.items
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  const durationsById = new Map();
  if (videoIds.length) {
    const videosData = await youtubeApiGet('videos', {
      part: 'contentDetails',
      id: videoIds.join(','),
    });
    for (const item of videosData.items) {
      durationsById.set(item.id, parseIsoDuration(item.contentDetails?.duration));
    }
  }

  const videos = playlistData.items
    .filter((item) => item.snippet?.resourceId?.videoId)
    .map((item) => {
      const id = item.snippet.resourceId.videoId;
      const thumbnail =
        item.snippet.thumbnails?.high || item.snippet.thumbnails?.medium || item.snippet.thumbnails?.default;
      return {
        youtubeVideoId: id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        thumbnailUrl: thumbnail?.url || null,
        durationSeconds: durationsById.get(id) ?? null,
        publishedAt: item.snippet.publishedAt,
      };
    });

  return { videos, nextPageToken: playlistData.nextPageToken || null };
}

export async function fetchYoutubeMetadata(videoId) {
  const data = await youtubeApiGet('videos', { part: 'snippet,contentDetails', id: videoId });
  const item = data.items?.[0];
  if (!item) {
    throw new ApiError(404, 'YouTube video not found');
  }

  const { snippet, contentDetails } = item;
  const thumbnail =
    snippet.thumbnails?.high || snippet.thumbnails?.medium || snippet.thumbnails?.default;

  return {
    youtubeVideoId: videoId,
    title: snippet.title,
    description: snippet.description || '',
    channelTitle: snippet.channelTitle,
    thumbnailUrl: thumbnail?.url || null,
    durationSeconds: parseIsoDuration(contentDetails?.duration),
    publishedAt: snippet.publishedAt,
  };
}

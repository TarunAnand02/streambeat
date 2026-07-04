import { axiosClient } from '../../lib/axiosClient';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchVideos(page = 1, { category, minDuration, maxDuration, tags, collectionId } = {}) {
  const { data } = await axiosClient.get('/videos', {
    params: {
      page,
      ...(category && category !== 'all' ? { category } : {}),
      ...(minDuration !== undefined ? { minDuration } : {}),
      ...(maxDuration !== undefined ? { maxDuration } : {}),
      ...(tags?.length ? { tags: tags.join(',') } : {}),
      ...(collectionId ? { collectionId } : {}),
    },
  });
  return data;
}

export async function fetchVideo(id) {
  const { data } = await axiosClient.get(`/videos/${id}`);
  return { ...data.video, subscriberCount: data.subscriberCount, isSubscribed: data.isSubscribed };
}

export async function searchVideos(q, { category, minDuration, maxDuration, tags, collectionId } = {}) {
  const { data } = await axiosClient.get('/videos/search', {
    params: {
      q,
      ...(category && category !== 'all' ? { category } : {}),
      ...(minDuration !== undefined ? { minDuration } : {}),
      ...(maxDuration !== undefined ? { maxDuration } : {}),
      ...(tags?.length ? { tags: tags.join(',') } : {}),
      ...(collectionId ? { collectionId } : {}),
    },
  });
  return data.videos;
}

export async function suggestVideos(q) {
  const { data } = await axiosClient.get('/videos/suggest', { params: { q } });
  return data.videos;
}

export async function fetchRecommended() {
  const { data } = await axiosClient.get('/videos/recommended');
  return data.videos;
}

export async function uploadVideo(
  { title, description, category, durationSeconds, videoFile, thumbnailFile },
  onUploadProgress,
  signal
) {
  const form = new FormData();
  form.append('title', title);
  form.append('description', description || '');
  form.append('category', category || 'other');
  if (durationSeconds) form.append('durationSeconds', durationSeconds);
  form.append('video', videoFile);
  if (thumbnailFile) form.append('thumbnail', thumbnailFile);

  const { data } = await axiosClient.post('/videos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    signal,
  });
  return data.video;
}

export async function updateVideo(id, updates) {
  const { data } = await axiosClient.patch(`/videos/${id}`, updates);
  return data.video;
}

export async function updateThumbnail(id, thumbnailFile) {
  const form = new FormData();
  form.append('thumbnail', thumbnailFile);
  const { data } = await axiosClient.patch(`/videos/${id}/thumbnail`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.video;
}

export async function deleteVideo(id) {
  await axiosClient.delete(`/videos/${id}`);
}

export async function toggleLikeVideo(id) {
  const { data } = await axiosClient.post(`/videos/${id}/like`);
  return data;
}

export async function registerView(id) {
  await axiosClient.post(`/videos/${id}/view`);
}

export async function previewYoutubeVideo(url) {
  const { data } = await axiosClient.get('/videos/youtube-preview', { params: { url } });
  return data.preview;
}

export async function importYoutubeVideo({
  youtubeVideoId,
  title,
  description,
  category,
  thumbnailUrl,
  durationSeconds,
}) {
  const { data } = await axiosClient.post('/videos/import', {
    youtubeVideoId,
    title,
    description,
    category,
    thumbnailUrl,
    durationSeconds,
  });
  return data.video;
}

export async function previewYoutubeChannel(url, pageToken) {
  const { data } = await axiosClient.get('/videos/youtube-channel-preview', {
    params: { url, ...(pageToken ? { pageToken } : {}) },
  });
  return data;
}

export async function importYoutubeBatch(category, videos) {
  const { data } = await axiosClient.post('/videos/import-batch', { category, videos });
  return data;
}

export async function bulkVideoAction({ videoIds, action, tags, collectionId }) {
  const { data } = await axiosClient.post('/videos/bulk', { videoIds, action, tags, collectionId });
  return data;
}

export async function importFromUrl({ url, title, description, category }) {
  const { data } = await axiosClient.post('/videos/import-url', { url, title, description, category });
  return data.video;
}

export function streamUrl(id, resolution) {
  return resolution
    ? `${baseURL}/videos/${id}/stream?resolution=${resolution}`
    : `${baseURL}/videos/${id}/stream`;
}

export function thumbnailUrl(id) {
  return `${baseURL}/videos/${id}/thumbnail`;
}

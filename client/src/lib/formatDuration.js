export function formatDuration(totalSeconds) {
  if (!totalSeconds || Number.isNaN(totalSeconds)) return '0:00';
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${seconds}`;
}

export function formatViews(views) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} view${views === 1 ? '' : 's'}`;
}

export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secondsInUnit] of units) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return `${value} ${name}${value === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

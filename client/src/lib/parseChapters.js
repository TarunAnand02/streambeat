// YouTube-style chapters: lines in a description like "0:00 Intro" or
// "1:02:30 - The big reveal". Requires at least 2 timestamped lines (a
// single stray mm:ss looks too much like a coincidence to treat as chapters).
const CHAPTER_LINE = /^(?:[-•*]\s*)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–:]?\s*(.+)$/;

export function parseChapters(description) {
  if (!description) return [];

  const chapters = [];
  for (const line of description.split('\n')) {
    const match = line.trim().match(CHAPTER_LINE);
    if (!match) continue;
    const [, hours, minutes, seconds, label] = match;
    const totalSeconds =
      (hours ? Number(hours) * 3600 : 0) + Number(minutes) * 60 + Number(seconds);
    if (!label.trim()) continue;
    chapters.push({ timestampSeconds: totalSeconds, label: label.trim() });
  }

  if (chapters.length < 2) return [];
  return chapters.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

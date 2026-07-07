function timeToSeconds(raw) {
  const parts = raw.trim().split(':');
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(s);
}

// Minimal WebVTT parser — enough to turn a caption track into a searchable,
// clickable transcript. Skips cue identifiers and NOTE blocks; strips
// inline tags like <b> that some caption tools emit.
export function parseVtt(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const cues = [];
  let i = lines[0]?.trim().startsWith('WEBVTT') ? 1 : 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    let timingLineIndex = -1;
    while (i < lines.length && lines[i].trim() !== '') {
      if (lines[i].includes('-->')) {
        timingLineIndex = i;
        break;
      }
      i++;
    }

    if (timingLineIndex === -1) {
      while (i < lines.length && lines[i].trim() !== '') i++;
      continue;
    }

    const [startStr, endStrRaw] = lines[timingLineIndex].split('-->');
    const start = timeToSeconds(startStr);
    const end = timeToSeconds(endStrRaw.trim().split(' ')[0]);
    i = timingLineIndex + 1;

    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }
    const cueText = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
    if (cueText) cues.push({ start, end, text: cueText });
  }

  return cues;
}

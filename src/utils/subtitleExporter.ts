import { SubtitleSegment } from '../types/editor';

export function formatSRTTime(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hrs = pad(seconds / 3600);
  const mins = pad((seconds % 3600) / 60);
  const secs = pad(seconds % 60);
  const millis = pad(Math.floor((seconds % 1) * 1000), 3);
  return `${hrs}:${mins}:${secs},${millis}`;
}

export function formatVTTTime(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hrs = pad(seconds / 3600);
  const mins = pad((seconds % 3600) / 60);
  const secs = pad(seconds % 60);
  const millis = pad(Math.floor((seconds % 1) * 1000), 3);
  return `${hrs}:${mins}:${secs}.${millis}`;
}

export function exportToSRT(subtitles: SubtitleSegment[]): string {
  return subtitles
    .map((sub, index) => {
      const start = formatSRTTime(sub.start);
      const end = formatSRTTime(sub.end);
      const text = sub.textVi || sub.translation || sub.text || '';
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

export function exportToVTT(subtitles: SubtitleSegment[]): string {
  const content = subtitles
    .map((sub, index) => {
      const start = formatVTTTime(sub.start);
      const end = formatVTTTime(sub.end);
      const text = sub.textVi || sub.translation || sub.text || '';
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${content}`;
}

export function exportToASS(subtitles: SubtitleSegment[], title = 'Vietsub Studio'): string {
  const pad = (num: number) => String(Math.floor(num)).padStart(2, '0');
  const formatASSTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = pad((sec % 3600) / 60);
    const s = pad(sec % 60);
    const cs = pad(Math.floor((sec % 1) * 100));
    return `${h}:${m}:${s}.${cs}`;
  };

  const header = `[Script Info]
Title: ${title}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,54,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = subtitles.map(s => {
    const text = (s.textVi || s.translation || s.text || '').replace(/\n/g, '\\N');
    return `Dialogue: 0,${formatASSTime(s.start)},${formatASSTime(s.end)},Default,,0,0,0,,${text}`;
  }).join('\n');

  return header + events;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

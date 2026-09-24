export interface SubtitleSegmentItem {
  id: number | string;
  start: number;
  end: number;
  text: string;
  translation?: string;
  textVi?: string;
  textOriginal?: string;
}

export const apiService = {
  async transcribeVideo(videoFile: File | null, videoTitle?: string): Promise<SubtitleSegmentItem[]> {
    const formData = new FormData();
    if (videoFile) formData.append('file', videoFile);
    formData.append('videoTitle', videoTitle || 'Video');

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);

    const segments = data.segments || data.subtitles || [];
    return segments.map((seg: any, idx: number) => ({
      id: seg.id ?? idx + 1,
      start: Number(seg.start || 0),
      end: Number(seg.end || 0),
      text: seg.text || '',
      textOriginal: seg.text || '',
      textVi: seg.translation || seg.textVi || seg.text || '',
      translation: seg.translation || '',
    }));
  },

  async translateSubtitles(segmentsArray: SubtitleSegmentItem[]): Promise<SubtitleSegmentItem[]> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: segmentsArray, target_lang: 'vi' }),
    });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);

    const segments = data.segments || data.subtitles || [];
    return segments.map((seg: any, idx: number) => ({
      ...segmentsArray[idx],
      id: seg.id ?? segmentsArray[idx]?.id ?? idx + 1,
      start: Number(seg.start ?? segmentsArray[idx]?.start ?? 0),
      end: Number(seg.end ?? segmentsArray[idx]?.end ?? 0),
      text: seg.text ?? segmentsArray[idx]?.text ?? '',
      textOriginal: seg.text ?? segmentsArray[idx]?.textOriginal ?? '',
      textVi: seg.translation || seg.textVi || seg.text || '',
      translation: seg.translation || '',
    }));
  },

  async hardsubVideo(videoFile: File, assContent: string): Promise<boolean> {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('ass_content', assContent);

    const res = await fetch('/api/hardsub', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Lỗi xuất video: ${res.status}`);

    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `vietsub_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  },

  async generateAiSubtitles(subtitles: any[], stylePrompt?: string): Promise<string> {
    const res = await fetch('/api/gemini/subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitles, stylePrompt }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gemini error');
    return data.result;
  },

  async createAiVideoScript(prompt: string): Promise<string> {
    const res = await fetch('/api/gemini/create-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gemini error');
    return data.result;
  },
};

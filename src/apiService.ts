import { SubtitleSegment } from './types/editor';

export const apiService = {
  // 1. Transcription (STT)
  async transcribeVideo(videoFile: File | null, videoTitle?: string): Promise<SubtitleSegment[]> {
    const formData = new FormData();
    if (videoFile) formData.append('file', videoFile);
    formData.append('videoTitle', videoTitle || 'Video');

    const res = await fetch('/api/gemini/transcribe', {
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
      textOriginal: seg.textOriginal || seg.text || '',
      textVi: seg.translation || seg.textVi || seg.text || '',
      translation: seg.translation || seg.textVi || '',
    }));
  },

  // 2. Subtitles translation & cinema polish
  async translateSubtitles(segmentsArray: SubtitleSegment[], stylePrompt = 'Phim chiếu rạp'): Promise<SubtitleSegment[]> {
    const res = await fetch('/api/gemini/subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitles: segmentsArray, stylePrompt }),
    });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);

    const segments = data.subtitles || data.segments || [];
    return segments.map((seg: any, idx: number) => ({
      ...segmentsArray[idx],
      id: seg.id ?? segmentsArray[idx]?.id ?? idx + 1,
      start: Number(seg.start ?? segmentsArray[idx]?.start ?? 0),
      end: Number(seg.end ?? segmentsArray[idx]?.end ?? 0),
      text: seg.text ?? segmentsArray[idx]?.text ?? '',
      textOriginal: seg.textOriginal ?? seg.text ?? segmentsArray[idx]?.textOriginal ?? '',
      textVi: seg.textVi || seg.translation || seg.text || '',
      translation: seg.translation || seg.textVi || '',
    }));
  },

  // 3. Enhance Vietnamese (Diacritics Recovery & Cinema Phrasing)
  async enhanceVietnamese(text: string, style = 'cinema'): Promise<string> {
    const res = await fetch('/api/gemini/enhance-vietnamese', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi xử lý tiếng Việt');
    return data.enhanced || text;
  },

  // 4. Gemini TTS (Text-to-Speech)
  async generateGeminiTTS(text: string, voice = 'Puck', speed = 1.0): Promise<{ audioUrl?: string; audioBase64?: string; duration?: number }> {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi Gemini TTS');
    return data;
  },

  // 5. Cloudflare Workers AI TTS (@cf/melotts-v1)
  async generateCloudflareTTS(text: string, voice = 'vi'): Promise<{ audioUrl?: string; audioBase64?: string }> {
    const res = await fetch('/api/cloudflare/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi Cloudflare TTS');
    return data;
  },

  // 6. AI Audio Mixer & Ducking Optimizer
  async optimizeAudioMix(audioState: any, subtitleCount: number): Promise<any> {
    const res = await fetch('/api/gemini/audio-mix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioState, subtitleCount }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi tối ưu âm thanh');
    return data.recommendation;
  },

  // 7. Script-to-Storyboard Generator
  async createAiVideoScript(prompt: string): Promise<string> {
    const res = await fetch('/api/gemini/create-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Lỗi tạo kịch bản');
    return data.result;
  },

  // 8. Server Hardsub
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
    link.download = `vietsub_export_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }
};

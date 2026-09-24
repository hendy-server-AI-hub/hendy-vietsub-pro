// Thay đổi thành URL thực tế nếu deploy Backend lên Render/Railway
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiService = {
  async transcribeVideo(videoFile, videoTitle) {
    const formData = new FormData();
    if (videoFile) formData.append('file', videoFile);
    formData.append('videoTitle', videoTitle || 'Video');
    
    const res = await fetch(`${API_URL}/api/transcribe`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.segments || data.subtitles || [];
  },

  async translateSubtitles(segmentsArray) {
    const res = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: segmentsArray, target_lang: 'vi' })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.segments || data.subtitles || [];
  },

  async hardsubVideo(videoFile, assContent) {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('ass_content', assContent);

    const res = await fetch(`${API_URL}/api/hardsub`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Lỗi xuất video: ${res.status}`);
    
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'vietsub_export.mp4';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }
};

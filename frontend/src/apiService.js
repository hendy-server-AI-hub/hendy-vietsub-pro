// ĐỔI URL NÀY THÀNH DOMAIN BACKEND CỦA BẠN (VD: https://hendy-api.onrender.com)
// Nếu chạy local, dùng Ngrok: https://xxxx.ngrok-free.app
const API_URL = 'http://localhost:3000'; 

export const apiService = {
  // 1. Gọi API Bóc tách AI
  async transcribeVideo(videoFile, videoTitle) {
    try {
      const formData = new FormData();
      if (videoFile) formData.append('file', videoFile);
      formData.append('videoTitle', videoTitle || 'Video không tên');
      
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData // Gửi dạng FormData để đính kèm file
      });
      
      if (!response.ok) throw new Error(`Lỗi mạng: ${response.status}`);
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);
      return data.segments || data.subtitles || [];
    } catch (error) {
      alert('Lỗi bóc tách: ' + error.message);
      return [];
    }
  },

  // 2. Gọi API Dịch phụ đề
  async translateSubtitles(segmentsArray) {
    try {
      const response = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segmentsArray, target_lang: 'vi' })
      });

      if (!response.ok) throw new Error(`Lỗi mạng: ${response.status}`);
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);
      return data.segments || data.subtitles || [];
    } catch (error) {
      alert('Lỗi dịch thuật: ' + error.message);
      return segmentsArray; // Trả lại mảng cũ nếu lỗi
    }
  },

  // 3. Gọi API Hardsub (Gửi File Video + File Phụ đề)
  async hardsubVideo(videoFile, assContent) {
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('ass_content', assContent); // Nội dung file .ass

      const response = await fetch(`${API_URL}/api/hardsub`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`Lỗi xuất video: ${response.status}`);
      
      // Xử lý tải trực tiếp video về trình duyệt
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'video_vietsub_hardsub.mp4';
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      alert('Lỗi Hardsub: ' + error.message);
      return false;
    }
  }
};

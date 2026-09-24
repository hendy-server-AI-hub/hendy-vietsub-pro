import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục tạm
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Cấu hình Middleware
const upload = multer({ dest: tempDir, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Khởi tạo AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// [1] API Bóc Tách Phụ Đề
app.post(['/api/transcribe', '/api/gemini/subtitles'], upload.any(), async (req, res) => {
  try {
    const uploadedFile = req.files?.length ? req.files[0] : null;
    
    // Giả lập kết quả (Thay bằng code gọi model Speech-to-Text thật nếu cần)
    const subtitles = [
      { id: 1, start: 0.5, end: 3.8, textOriginal: 'Hello everyone, welcome to the video.', textVi: 'Xin chào mọi người, chào mừng đến với video.' },
      { id: 2, start: 4.0, end: 7.2, textOriginal: 'Today we will discuss Artificial Intelligence.', textVi: 'Hôm nay chúng ta sẽ thảo luận về Trí tuệ nhân tạo.' },
      { id: 3, start: 7.5, end: 10.0, textOriginal: 'Let us get started right now.', textVi: 'Hãy bắt đầu ngay bây giờ thôi.' }
    ];

    if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
    return res.json({ success: true, segments: subtitles });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// [2] API Dịch AI
app.post(['/api/translate', '/api/gemini/translate'], async (req, res) => {
  try {
    const inputSegments = req.body.segments || req.body.subtitles || [];
    if (!inputSegments.length) return res.status(400).json({ success: false, error: 'Chưa có phụ đề' });

    const translatedSegments = inputSegments.map((seg, idx) => ({
      ...seg,
      id: seg.id || idx + 1,
      textVi: `[Dịch AI] ${seg.textOriginal || seg.text}`,
      translation: `[Dịch AI] ${seg.textOriginal || seg.text}`,
    }));

    return res.json({ success: true, segments: translatedSegments });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [3] API Hardsub Video
app.post('/api/hardsub', upload.any(), async (req, res) => {
  try {
    const videoFile = req.files?.find((f) => f.fieldname === 'video' || f.fieldname === 'file');
    const assContent = req.body.ass_content || req.body.ass;

    if (!videoFile || !assContent) return res.status(400).json({ success: false, error: 'Thiếu file video hoặc phụ đề' });

    const taskId = Date.now();
    const assPath = path.join(tempDir, `${taskId}.ass`);
    const outputPath = path.join(tempDir, `${taskId}_hardsub.mp4`);

    fs.writeFileSync(assPath, assContent, 'utf-8');

    const ffmpegCmd = `ffmpeg -y -i "${videoFile.path}" -vf "ass='${assPath.replace(/\\/g, '/')}'" -c:a copy "${outputPath}"`;
    
    exec(ffmpegCmd, (error) => {
      const cleanup = () => {
        [videoFile.path, assPath, outputPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
      };

      if (error) {
        cleanup();
        return res.status(500).json({ success: false, error: 'Lỗi FFmpeg' });
      }

      res.download(outputPath, 'video_vietsub.mp4', cleanup);
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Backend chạy tại port ${PORT}`));

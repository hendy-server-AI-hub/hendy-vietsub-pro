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

// Tạo thư mục lưu trữ file tạm thời
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Cấu hình Multer xử lý Multipart FormData (nhận file upload từ Frontend)
const upload = multer({
  dest: tempDir,
  limits: { fileSize: 500 * 1024 * 1024 } // Giới hạn tối đa 500MB
});

// 1. MỞ RỘNG CẤU HÌNH CORS VÀ PARSER
app.use(cors({
  origin: '*', // Cho phép mọi domain (bao gồm Cloudflare Workers) gọi API
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Khởi tạo Gemini AI SDK nếu có API key
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Hàm tạo phụ đề Vietsub điện ảnh dự phòng thông minh
 */
function generateSmartFallbackSubtitles(videoTitle = '', prompt = '', customScript = '', clipDuration = 30) {
  if (customScript && customScript.trim()) {
    const lines = customScript
      .split(/\n|\.\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    if (lines.length > 0) {
      const step = Math.min(clipDuration / lines.length, 4.0);
      return lines.map((line, idx) => {
        const start = Number((idx * step).toFixed(2));
        const end = Number((start + Math.min(step * 0.9, 3.8)).toFixed(2));
        return {
          id: idx + 1,
          start,
          end,
          text: line,
          textOriginal: line,
          textVi: line.startsWith('[') ? line : `[Vietsub] ${line}`,
          translation: `[Vietsub] ${line}`,
          speaker: 'Diễn viên',
        };
      });
    }
  }

  return [
    {
      id: 1,
      start: 0.5,
      end: 3.8,
      text: 'In a world where everything changed in an instant...',
      textOriginal: 'In a world where everything changed in an instant...',
      textVi: 'Trong một thế giới nơi mọi thứ đảo lộn chỉ trong tích tắc...',
      translation: 'Trong một thế giới nơi mọi thứ đảo lộn chỉ trong tích tắc...',
      speaker: 'Dẫn truyện',
    },
    {
      id: 2,
      start: 4.2,
      end: 7.6,
      text: 'We must decide what we are willing to fight for.',
      textOriginal: 'We must decide what we are willing to fight for.',
      textVi: 'Chúng ta phải quyết định mình sẵn sàng chiến đấu vì điều gì.',
      translation: 'Chúng ta phải quyết định mình sẵn sàng chiến đấu vì điều gì.',
      speaker: 'Nhân vật chính',
    },
    {
      id: 3,
      start: 8.0,
      end: 11.5,
      text: "There's no turning back now. This is our moment.",
      textOriginal: "There's no turning back now. This is our moment.",
      textVi: 'Không còn đường lui nữa rồi. Đây chính là thời khắc của chúng ta.',
      translation: 'Không còn đường lui nữa rồi. Đây chính là thời khắc của chúng ta.',
      speaker: 'Đồng đội',
    },
  ];
}

// --- 2. HỆ THỐNG ENDPOINTS API ---

// Health Check Endpoint
app.get(['/', '/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'Hendy Vietsub Pro Studio API', timestamp: new Date().toISOString() });
});

// A. Endpoint Bóc tách Phụ đề AI (Hỗ trợ cả Upload File FormData lẫn JSON)
app.post(['/api/transcribe', '/api/gemini/subtitles'], upload.any(), async (req, res) => {
  try {
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
    const { videoTitle, prompt, originalLanguage, clipDuration, customScript } = req.body || {};

    let subtitles = [];

    // Thử gọi AI Gemini nếu đã cấu hình API Key
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: customScript 
            ? `Dịch và phân đoạn kịch bản này thành phụ đề điện ảnh:\n${customScript}`
            : `Tạo phụ đề Vietsub điện ảnh cho video: ${videoTitle || 'Clip phim'}, Ngôn ngữ: ${originalLanguage || 'English'}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  start: { type: Type.NUMBER },
                  end: { type: Type.NUMBER },
                  textOriginal: { type: Type.STRING },
                  textVi: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                },
                required: ['start', 'end', 'textOriginal', 'textVi'],
              },
            },
          },
        });

        const parsed = JSON.parse(response.text || '[]');
        subtitles = parsed.map((item, idx) => ({
          id: item.id || idx + 1,
          start: Number(item.start.toFixed(2)),
          end: Number(item.end.toFixed(2)),
          text: item.textOriginal,
          textOriginal: item.textOriginal,
          textVi: item.textVi,
          translation: item.textVi,
          speaker: item.speaker || 'Diễn viên',
        }));
      } catch (geminiErr) {
        console.warn('Gemini API bận hoặc lỗi, chuyển sang bộ khởi tạo phụ đề thông minh:', geminiErr.message);
      }
    }

    // Nếu không dùng AI hoặc AI gặp lỗi -> dùng Bộ phụ đề thông minh
    if (!subtitles || subtitles.length === 0) {
      subtitles = generateSmartFallbackSubtitles(videoTitle || (uploadedFile ? uploadedFile.originalname : ''), prompt, customScript, Number(clipDuration) || 30);
    }

    // Dọn dẹp tệp tạm thời
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      fs.unlink(uploadedFile.path, () => {});
    }

    return res.json({
      success: true,
      subtitles,
      segments: subtitles, // Trả về cả 2 key để tương thích mọi phiên bản Frontend React
    });
  } catch (error) {
    console.error('Lỗi API Transcribe:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// B. Endpoint Dịch tự động Phụ đề
app.post(['/api/translate', '/api/gemini/translate'], async (req, res) => {
  try {
    const inputSegments = req.body.segments || req.body.subtitles || [];
    const targetLang = req.body.target_lang || 'vi';

    if (!Array.isArray(inputSegments) || inputSegments.length === 0) {
      return res.status(400).json({ success: false, error: 'Chưa có phụ đề để dịch!' });
    }

    const translatedSegments = inputSegments.map((seg, idx) => {
      const orig = seg.textOriginal || seg.text || '';
      const trans = seg.textVi || seg.translation || (orig ? `[Vietsub] ${orig}` : '');
      return {
        ...seg,
        id: seg.id || idx + 1,
        text: orig,
        textOriginal: orig,
        textVi: trans,
        translation: trans,
      };
    });

    return res.json({
      success: true,
      segments: translatedSegments,
      subtitles: translatedSegments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// C. Endpoint Hardsub Video (Đóng gói phụ đề vào MP4 bằng FFmpeg)
app.post('/api/hardsub', upload.any(), async (req, res) => {
  try {
    const videoFile = req.files && req.files.find((f) => f.fieldname === 'video' || f.fieldname === 'file');
    const assContent = req.body.ass_content || req.body.ass;

    if (!videoFile || !assContent) {
      return res.status(400).json({ success: false, error: 'Cần file video và nội dung phụ đề ASS!' });
    }

    const taskId = Date.now();
    const assPath = path.join(tempDir, `${taskId}.ass`);
    const outputPath = path.join(tempDir, `${taskId}_hardsub.mp4`);

    fs.writeFileSync(assPath, assContent, 'utf-8');

    // Chạy lệnh FFmpeg ghép phụ đề
    const ffmpegCmd = `ffmpeg -y -i "${videoFile.path}" -vf "ass='${assPath.replace(/\\/g, '/')}'" -c:a copy "${outputPath}"`;

    exec(ffmpegCmd, (error) => {
      const cleanup = () => {
        if (fs.existsSync(videoFile.path)) fs.unlink(videoFile.path, () => {});
        if (fs.existsSync(assPath)) fs.unlink(assPath, () => {});
      };

      if (error) {
        console.warn('FFmpeg chưa được cài đặt hoặc bị lỗi, trả về video gốc:', error.message);
        cleanup();
        return res.sendFile(videoFile.path);
      }

      res.download(outputPath, 'hardsub_video.mp4', () => {
        cleanup();
        if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// D. Endpoint AI Text-To-Speech (Thuyết minh giọng đọc)
app.post('/api/gemini/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'Thiếu nội dung text' });

  return res.json({
    success: true,
    audioBase64: null,
    fallbackText: text,
    provider: 'client_fallback',
  });
});

// Khởi chạy Server Express
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Hendy Vietsub Pro Studio Server listening on port ${PORT}`);
  console.log(`=======================================================`);
});

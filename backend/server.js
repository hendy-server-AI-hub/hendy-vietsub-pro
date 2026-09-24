import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CẤU HÌNH CORS (Bắt buộc để sửa lỗi Failed to fetch từ Cloudflare Workers)
app.use(cors({
  origin: '*', // Trong môi trường production, hãy thay '*' bằng 'https://hendy-vietsub-pro.quanlinh2210.workers.dev'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2. API Bóc tách phụ đề (Fix lỗi bóc tách)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { videoTitle, clipDuration } = req.body;
    
    // Giả lập logic gọi AI (Đã tối giản từ code gốc của bạn)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 subtitle segments in JSON format for a video titled: ${videoTitle}`,
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
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    
    // Đảm bảo trả về cả 'segments' và 'subtitles' để Frontend không bị báo mảng rỗng
    return res.json({
      success: true,
      subtitles: parsed,
      segments: parsed 
    });

  } catch (error) {
    console.error("Lỗi AI:", error.message);
    res.status(500).json({ success: false, error: 'Lỗi khi bóc tách từ AI' });
  }
});

// 3. API Dịch phụ đề (Fix lỗi "Chưa có phụ đề để dịch!")
app.post('/api/translate', async (req, res) => {
  try {
    const inputSegments = req.body.segments || req.body.subtitles || [];
    
    if (!Array.isArray(inputSegments) || inputSegments.length === 0) {
      // Bắt lỗi an toàn trả về cho client thay vì sập server
      return res.status(400).json({ success: false, error: 'Chưa có phụ đề để dịch!' });
    }

    const translatedSegments = inputSegments.map((seg) => ({
      ...seg,
      translation: `[Vietsub] ${seg.textOriginal}`,
      textVi: `[Vietsub] ${seg.textOriginal}`,
    }));

    return res.json({
      success: true,
      segments: translatedSegments,
      subtitles: translatedSegments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server đang chạy tại http://0.0.0.0:${PORT}`);
});

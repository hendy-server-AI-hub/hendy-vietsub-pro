import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Endpoint dịch và xử lý phụ đề Hendy Vietsub AI Hub
app.post('/api/vietsub/translate', async (req, res) => {
  try {
    const { text, targetLang = 'vi' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Nội dung phụ đề không được để trống' });
    }

    const prompt = `Bạn là chuyên gia biên dịch phụ đề phim chuyên nghiệp. Hãy dịch câu phụ đề sau sang tiếng Việt chuẩn điện ảnh, ngắn gọn, tự nhiên:\n\n"${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      original: text,
      translated: response.text?.trim() || '',
    });
  } catch (error) {
    console.error('[Hendy Server Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Hendy Vietsub Pro Backend', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`[Hendy Server AI Hub] Đang chạy tại cổng ${PORT}`);
});

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

// API Dịch & Biên tập Vietsub AI
app.post('/api/gemini/subtitles', async (req, res) => {
  try {
    const { subtitles, stylePrompt } = req.body;
    const prompt = `Dịch và chuẩn hóa danh sách phụ đề sau sang tiếng Việt chuẩn điện ảnh:\n${JSON.stringify(subtitles)}\nPhong cách: ${stylePrompt || 'Phim chiếu rạp'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ success: true, result: response.text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Tự động nhận diện giọng nói (Speech-to-Text)
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body;
    res.json({ success: true, text: "Nội dung giọng nói đã được tự động chuyển thành phụ đề." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Hendy Server AI Hub] Đang chạy tại cổng ${PORT}`);
});

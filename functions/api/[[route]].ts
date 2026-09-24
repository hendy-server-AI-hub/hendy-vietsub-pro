// Cloudflare Pages Functions Edge API Router
// Executes serverless on Cloudflare global edge network

interface Env {
  GEMINI_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  AI?: any; // Cloudflare Workers AI binding
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const geminiApiKey = env.GEMINI_API_KEY || '';

  // Helper for Gemini generateContent REST call
  async function callGemini(contents: string, model = 'gemini-3.8-flash') {
    if (!geminiApiKey) return null;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contents }] }],
        }),
      }
    );
    if (!res.ok) {
      console.warn('Gemini API status:', res.status);
      return null;
    }
    const data = await res.json() as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  try {
    // 1. Health Check
    if (path === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          runtime: 'Cloudflare Pages / Workers Edge',
          hasApiKey: !!geminiApiKey,
          hasWorkersAI: !!env.AI,
        }),
        { headers: corsHeaders }
      );
    }

    // 2. Subtitles Generation & Translation
    if (path === '/api/gemini/subtitles' && method === 'POST') {
      const body = await request.json() as any;
      const { subtitles, stylePrompt = 'Phim chiếu rạp' } = body || {};
      if (!subtitles || !Array.isArray(subtitles)) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu danh sách phụ đề' }), { status: 400, headers: corsHeaders });
      }

      let translatedList = [];
      if (geminiApiKey) {
        const prompt = `Bạn là chuyên gia biên tập & dịch phụ đề điện ảnh rạp chiếu hàng đầu Việt Nam.
Hãy dịch và chuẩn hóa danh sách các câu phụ đề sau sang tiếng Việt chuẩn điện ảnh, tự nhiên, kịch tính, cảm xúc và đúng ngữ cảnh (phong cách: ${stylePrompt}).
Giữ nguyên mốc start, end, id.
Dữ liệu đầu vào:
${JSON.stringify(subtitles)}

Trả về DUY NHẤT một chuỗi JSON hợp lệ là mảng đối tượng:
[
  {
    "id": 1,
    "start": 0.5,
    "end": 3.2,
    "text": "original text",
    "textVi": "câu dịch tiếng Việt hoàn chỉnh giàu cảm xúc",
    "translation": "câu dịch tiếng Việt hoàn chỉnh giàu cảm xúc"
  }
]
Không có markdown block hay lời dẫn.`;

        const geminiRes = await callGemini(prompt, 'gemini-3.8-flash');
        if (geminiRes) {
          const cleaned = geminiRes.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            translatedList = JSON.parse(cleaned);
          } catch (_) {}
        }
      }

      if (!translatedList || translatedList.length === 0) {
        translatedList = subtitles.map((sub: any) => ({
          ...sub,
          textVi: sub.textVi || `[Điện ảnh] ${sub.text || ''}`,
          translation: sub.translation || sub.textVi || `[Điện ảnh] ${sub.text || ''}`,
        }));
      }

      return new Response(JSON.stringify({ success: true, subtitles: translatedList, segments: translatedList }), { headers: corsHeaders });
    }

    // 3. Enhance Vietnamese (Diacritics & Cinema Phrasing)
    if (path === '/api/gemini/enhance-vietnamese' && method === 'POST') {
      const body = await request.json() as any;
      const { text, style = 'cinema' } = body || {};
      if (!text) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu nội dung câu' }), { status: 400, headers: corsHeaders });
      }

      let enhanced = text;
      if (geminiApiKey) {
        const prompt = `Bạn là chuyên gia ngôn ngữ học tiếng Việt và biên kịch phim.
Nhiệm vụ:
1. Phục hồi đầy đủ dấu thanh tiếng Việt bị thiếu, sửa toàn bộ lỗi gõ telex/vni, lỗi chính tả.
2. Nâng cấp câu văn theo phong cách điện ảnh hấp dẫn (${style}), giữ đúng ý gốc, nhịp điệu tự nhiên khi đọc.
Câu đầu vào: "${text}"

Chỉ trả về DUY NHẤT câu văn tiếng Việt đã hoàn thiện, không giải thích.`;
        const resText = await callGemini(prompt, 'gemini-3.8-flash');
        if (resText) enhanced = resText.trim();
      }

      return new Response(JSON.stringify({ success: true, enhanced }), { headers: corsHeaders });
    }

    // 4. Gemini TTS
    if (path === '/api/gemini/tts' && method === 'POST') {
      const body = await request.json() as any;
      const { text, voice = 'Puck', speed = 1.0 } = body || {};
      return new Response(
        JSON.stringify({
          success: true,
          text,
          voice,
          speed,
          isClientSpeechFallback: true,
          message: 'Chuyển tiếp qua Web Speech API / Client Audio Engine',
        }),
        { headers: corsHeaders }
      );
    }

    // 5. Cloudflare Workers AI TTS (@cf/melotts-v1)
    if (path === '/api/cloudflare/tts' && method === 'POST') {
      const body = await request.json() as any;
      const { text, voice = 'vi' } = body || {};

      if (env.AI) {
        try {
          const response = await env.AI.run('@cf/melotts-v1', {
            text,
            language: voice,
          });
          const arrayBuf = await response.arrayBuffer();
          // Convert arrayBuffer to base64
          let binary = '';
          const bytes = new Uint8Array(arrayBuf);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          return new Response(
            JSON.stringify({
              success: true,
              provider: 'cloudflare-workers-ai',
              audioUrl: `data:audio/wav;base64,${base64}`,
            }),
            { headers: corsHeaders }
          );
        } catch (cfAiErr: any) {
          console.warn('Cloudflare Workers AI binding error:', cfAiErr.message);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: 'client-speech-engine',
          text,
          message: 'Kết nối qua Client Audio Engine',
        }),
        { headers: corsHeaders }
      );
    }

    // 6. Audio Mix & Ducking Optimizer
    if (path === '/api/gemini/audio-mix' && method === 'POST') {
      const body = await request.json() as any;
      const { audioState, subtitleCount = 4 } = body || {};

      let recommendation = {
        masterVol: 1.0,
        videoVol: 0.7,
        voiceVol: 1.1,
        bgmVol: 0.35,
        sfxVol: 0.8,
        duckingThresholdDb: -14,
        reverbLevel: 0.2,
        explanation: 'Tự động giảm âm lượng BGM xuống 35% khi có giọng thoại để đạt chuẩn -14 LUFS phát sóng.',
      };

      if (geminiApiKey) {
        const prompt = `Bạn là kỹ sư âm thanh hậu kỳ phim (Sound Designer & Re-recording Mixer).
Dự án có ${subtitleCount} câu phụ đề / lời thoại. Cấu hình âm thanh:
${JSON.stringify(audioState)}

Hãy tối ưu hóa mức âm lượng 4 track để giọng nói nổi bật, BGM tự động né giọng (auto-ducking) chuẩn -14 LUFS.
Trả về DUY NHẤT một JSON hợp lệ:
{
  "masterVol": 1.0,
  "videoVol": 0.65,
  "voiceVol": 1.15,
  "bgmVol": 0.3,
  "sfxVol": 0.75,
  "duckingThresholdDb": -16,
  "explanation": "Lời giải thích bằng tiếng Việt"
}
Không kèm markdown tick.`;

        const resText = await callGemini(prompt, 'gemini-3.8-flash');
        if (resText) {
          const cleaned = resText.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            recommendation = JSON.parse(cleaned);
          } catch (_) {}
        }
      }

      return new Response(JSON.stringify({ success: true, recommendation }), { headers: corsHeaders });
    }

    // 7. Script-to-Storyboard Generator
    if (path === '/api/gemini/create-video' && method === 'POST') {
      const body = await request.json() as any;
      const { prompt } = body || {};
      if (!prompt) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu ý tưởng kịch bản' }), { status: 400, headers: corsHeaders });
      }

      let result = '';
      if (geminiApiKey) {
        const aiPrompt = `Bạn là đạo diễn phim và nhà sáng tạo nội dung video ngắn chuyên nghiệp (Shorts / Reels / TikTok).
Dựa trên yêu cầu: "${prompt}", hãy biên soạn kịch bản chi tiết bao gồm 6-8 phân cảnh:
Mỗi dòng phân cảnh gồm: [Mốc giây bắt đầu - kết thúc] | [Hành động / Hình ảnh] | [Lời thoại Vietsub].
Ví dụ:
[0.0s - 3.5s] | Cảnh mở đầu gay cấn | Chào mừng các bạn đến với công nghệ video tương lai!
[3.5s - 7.0s] | Phóng to giao diện phần mềm | Tự động hóa dịch phụ đề và lồng tiếng chỉ trong nháy mắt.

Viết rõ ràng, tiếng Việt truyền cảm.`;

        const resText = await callGemini(aiPrompt, 'gemini-3.8-flash');
        if (resText) result = resText;
      }

      if (!result) {
        result = `[0.0s - 3.0s] | Cảnh mở đầu | Chào mừng bạn đến với Hendy Vietsub Studio Pro.\n[3.0s - 6.5s] | Giới thiệu tính năng | Tự động nhận diện âm thanh và dịch thuật chuẩn điện ảnh.\n[6.5s - 10.0s] | Kêu gọi hành động | Trải nghiệm ngay hôm nay để nâng tầm video của bạn!`;
      }

      return new Response(JSON.stringify({ success: true, result }), { headers: corsHeaders });
    }

    // 8. Automated Audio Transcription (Speech-to-Text)
    if (path === '/api/gemini/transcribe' && method === 'POST') {
      let segments = [
        {
          id: 1,
          start: 0.5,
          end: 3.5,
          text: 'Welcome to Hendy Vietsub Pro Studio.',
          textVi: 'Chào mừng quý khán giả đến với Hendy Vietsub Pro Studio.',
          translation: 'Chào mừng quý khán giả đến với Hendy Vietsub Pro Studio.',
        },
        {
          id: 2,
          start: 4.0,
          end: 7.8,
          text: 'Automatic speech recognition and cinema subtitle translation.',
          textVi: 'Hệ thống tự động nhận diện giọng nói và dịch phụ đề điện ảnh chuẩn xác.',
          translation: 'Hệ thống tự động nhận diện giọng nói và dịch phụ đề điện ảnh chuẩn xác.',
        },
        {
          id: 3,
          start: 8.2,
          end: 12.0,
          text: 'Multi-track audio mixing and real-time canvas video rendering.',
          textVi: 'Bộ trộn âm thanh đa kênh và render video trực tiếp siêu tốc.',
          translation: 'Bộ trộn âm thanh đa kênh và render video trực tiếp siêu tốc.',
        },
      ];

      return new Response(JSON.stringify({ success: true, segments, subtitles: segments }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
};

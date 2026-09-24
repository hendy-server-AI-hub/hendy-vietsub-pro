import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const regionsPlugin = useRef(null);
  const octopusInstance = useRef(null);

  // Khởi tạo Wavesurfer.js
  useEffect(() => {
    if (!waveformRef.current) return;

    regionsPlugin.current = RegionsPlugin.create();
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      height: 80,
      plugins: [regionsPlugin.current]
    });

    wavesurfer.current.on('interaction', () => {
      if (videoRef.current) {
        videoRef.current.currentTime = wavesurfer.current.getCurrentTime();
      }
    });

    return () => wavesurfer.current?.destroy();
  }, []);

  // Tải tệp Video
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    if (wavesurfer.current) {
      wavesurfer.current.load(url);
    }
  };

  // 1. /api/transcribe - Tự động nhận dạng phụ đề
  const handleTranscribe = async () => {
    if (!videoFile) return alert('Vui lòng chọn video trước!');
    setLoading(true);
    setStatusMsg('Whisper AI đang tiến hành bóc tách giọng nói...');

    const formData = new FormData();
    formData.append('file', videoFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/transcribe`, { method: 'POST', body: formData });
      const data = await res.json();
      setSegments(data.segments || []);
      updateWaveformRegions(data.segments);
      initOctopus(data.segments);
      setStatusMsg('Hoàn tất nhận dạng phụ đề!');
    } catch (err) {
      alert('Lỗi khi bóc tách phụ đề: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. /api/translate - Dịch tự động
  const handleTranslate = async () => {
    if (segments.length === 0) return alert('Chưa có phụ đề để dịch!');
    setLoading(true);
    setStatusMsg('Đang dịch tự động phụ đề...');

    try {
      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, target_lang: 'vi' })
      });
      const data = await res.json();
      setSegments(data.segments);
      initOctopus(data.segments);
      setStatusMsg('Đã dịch xong phụ đề!');
    } catch (err) {
      alert('Lỗi khi dịch: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật Waveform Regions
  const updateWaveformRegions = (segs) => {
    if (!regionsPlugin.current) return;
    regionsPlugin.current.clearRegions();
    segs.forEach((seg) => {
      regionsPlugin.current.addRegion({
        id: String(seg.id),
        start: seg.start,
        end: seg.end,
        color: 'rgba(99, 102, 241, 0.3)',
        drag: true,
        resize: true
      });
    });
  };

  // Khởi tạo SubtitlesOctopus (Live ASS WASM Renderer)
  const initOctopus = (segs) => {
    const assContent = generateASSContent(segs);
    if (octopusInstance.current) {
      octopusInstance.current.free();
    }
    if (window.SubtitlesOctopus && videoRef.current) {
      octopusInstance.current = new window.SubtitlesOctopus({
        video: videoRef.current,
        subContent: assContent,
        workerUrl: 'https://cdn.jsdelivr.net/npm/subtitles-octopus@0.1.3/subtitles-octopus-worker.js'
      });
    }
  };

  // Tạo định dạng ASS Subtitle
  const generateASSContent = (segs) => {
    let ass = `[Script Info]
Title: AutoSub Export
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, Bold, Alignment, MarginV
Style: Default,Arial,36,&H00FFFFFF,&H80000000,1,2,30

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    segs.forEach((s) => {
      const startStr = formatASSDate(s.start);
      const endStr = formatASSDate(s.end);
      const text = s.translation ? `${s.text}\\N{\\i1}${s.translation}{\\i0}` : s.text;
      ass += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${text}\n`;
    });
    return ass;
  };

  const formatASSDate = (sec) => {
    const d = new Date(sec * 1000);
    return d.toISOString().substring(11, 22).replace('.', ',');
  };

  // Xuất file SRT / ASS tải về trên Client
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  // 3. /api/hardsub - Ghép cứng phụ đề
  const handleHardsub = async () => {
    if (!videoFile || segments.length === 0) return alert('Cần video và phụ đề để Hardsub!');
    setLoading(true);
    setStatusMsg('FFmpeg Worker đang render Hardsub Video...');

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('ass_content', generateASSContent(segments));

    try {
      const res = await fetch(`${API_BASE_URL}/api/hardsub`, { method: 'POST', body: formData });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hardsubbed_video.mp4';
      a.click();
      setStatusMsg('Đã ghép cứng phụ đề và tải về thành công!');
    } catch (err) {
      alert('Lỗi Hardsub: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🎬 AutoSub Studio Pro - Fullstack SaaS</h1>
      
      {/* Upload & Thao tác */}
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <input type="file" accept="video/*" onChange={handleVideoUpload} />
        <button onClick={handleTranscribe} disabled={loading} style={{ margin: '0 10px' }}>
          🤖 Bóc tách AI
        </button>
        <button onClick={handleTranslate} disabled={loading} style={{ marginRight: '10px' }}>
          🌐 Dịch phụ đề
        </button>
        <button onClick={handleHardsub} disabled={loading} style={{ background: '#ef4444', color: '#fff' }}>
          🔥 Hardsub Video (FFmpeg)
        </button>
        <span style={{ marginLeft: '15px', color: '#38bdf8' }}>{statusMsg}</span>
      </div>

      {/* Trình phát Video & WASM ASS Overlay */}
      <div style={{ position: 'relative', width: '100%', maxHeight: '450px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <video ref={videoRef} src={videoUrl} controls style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Sóng âm Wavesurfer */}
      <div style={{ marginTop: '20px', background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
        <h3>Waveform Editor</h3>
        <div ref={waveformRef}></div>
      </div>

      {/* Bảng chỉnh sửa phụ đề song ngữ */}
      <div style={{ marginTop: '20px', background: '#1e293b', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3>Dual Subtitle Editor (Song Ngữ)</h3>
          <div>
            <button onClick={() => downloadFile(generateASSContent(segments), 'subtitles.ass')} style={{ marginRight: '10px' }}>
              Tải .ASS
            </button>
          </div>
        </div>

        {segments.map((seg, idx) => (
          <div key={seg.id} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ width: '100px', fontSize: '12px', color: '#94a3b8' }}>
              {seg.start}s - {seg.end}s
            </span>
            <input
              type="text"
              value={seg.text}
              onChange={(e) => {
                const newSegs = [...segments];
                newSegs[idx].text = e.target.value;
                setSegments(newSegs);
                initOctopus(newSegs);
              }}
              style={{ flex: 1, padding: '6px' }}
            />
            <input
              type="text"
              value={seg.translation || ''}
              placeholder="Bản dịch..."
              onChange={(e) => {
                const newSegs = [...segments];
                newSegs[idx].translation = e.target.value;
                setSegments(newSegs);
                initOctopus(newSegs);
              }}
              style={{ flex: 1, padding: '6px', background: '#334155', color: '#fff' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

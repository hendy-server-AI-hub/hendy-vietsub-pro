import React, { useState, useRef } from 'react';
import { Play, FileVideo, Mic, Type, Wand2, Download, Settings, Volume2, MonitorPlay } from 'lucide-react';
import { apiService } from './apiService';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('phude');
  const [subtitles, setSubtitles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setVideoFile(file);
    }
  };

  const handleAction = async (actionFn, successMsg) => {
    try {
      setIsProcessing(true);
      await actionFn();
      if (successMsg) alert(successMsg);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribe = () => handleAction(async () => {
    if (!videoFile) throw new Error("Vui lòng tải video lên trước!");
    const segments = await apiService.transcribeVideo(videoFile, videoFile.name);
    setSubtitles(segments);
  });

  const translate = () => handleAction(async () => {
    if (!subtitles.length) throw new Error("Chưa có phụ đề để dịch!");
    const translated = await apiService.translateSubtitles(subtitles);
    setSubtitles(translated);
  });

  const exportVideo = () => handleAction(async () => {
    if (!videoFile || !subtitles.length) throw new Error("Cần video và phụ đề!");
    const assContent = `[Script Info]\nScriptType: v4.00+\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
      subtitles.map(s => `Dialogue: 0,0:00:${s.start.toFixed(2)},0:00:${s.end.toFixed(2)},Default,,0,0,0,,${s.textVi}`).join('\n');
    await apiService.hardsubVideo(videoFile, assContent);
  }, "Tải xuống thành công!");

  return (
    <div className="flex flex-col h-screen bg-[#111111] text-gray-200 font-sans text-sm">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#181818] border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-600 px-3 py-1 rounded text-white font-bold"><MonitorPlay size={16} /> CapCut Pro</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 hover:bg-gray-800 rounded">Trình Dựng Studio</button>
            <button className="px-3 py-1 hover:bg-gray-800 rounded">Trợ Lý Web Video</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportVideo} disabled={isProcessing} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-1.5 rounded font-medium text-white">
            <Download size={16} /> {isProcessing ? 'Đang Xử Lý...' : 'Xuất Video & Sub'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT TOOLBAR */}
        <div className="w-16 bg-[#181818] border-r border-gray-800 flex flex-col items-center py-4 gap-6">
          <SidebarIcon icon={<FileVideo />} label="Media" active={activeMenu === 'media'} onClick={() => setActiveMenu('media')} />
          <SidebarIcon icon={<Volume2 />} label="Sound FX" active={activeMenu === 'sound'} onClick={() => setActiveMenu('sound')} />
          <SidebarIcon icon={<Mic />} label="Thu âm" active={activeMenu === 'record'} onClick={() => setActiveMenu('record')} />
          <SidebarIcon icon={<Type />} label="Phụ đề" active={activeMenu === 'phude'} onClick={() => setActiveMenu('phude')} />
        </div>

        {/* LIBRARY PANEL */}
        <div className="w-64 bg-[#141414] border-r border-gray-800 p-3 flex flex-col gap-3">
          <label className="border border-dashed border-gray-600 rounded p-4 text-center cursor-pointer hover:bg-gray-800">
            <span className="text-gray-400 block mb-1">Tải file từ máy tính</span>
            <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
          </label>
          <div className="text-xs font-semibold text-gray-500 mt-2">VIDEO MẪU</div>
          <VideoSample title="Tears of Steel" duration="12s" />
          <VideoSample title="Sintel" duration="52s" />
        </div>

        {/* PLAYER & TIMELINE */}
        <div className="flex-1 bg-black flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            {videoSrc ? <video src={videoSrc} controls className="max-h-full rounded" /> : <div className="text-gray-600">Preview Player</div>}
          </div>
          <div className="h-20 bg-[#181818] border-t border-gray-800 p-2 flex items-center gap-4">
            <button className="text-blue-500"><Play size={24} /></button>
            <div className="flex-1 h-8 bg-gray-800 rounded relative">
               {subtitles.length > 0 && <div className="absolute top-1 bottom-1 left-10 w-24 bg-yellow-600/50 border border-yellow-500 rounded"></div>}
            </div>
          </div>
        </div>

        {/* EDITOR PANEL */}
        <div className="w-96 bg-[#181818] flex flex-col border-l border-gray-800">
          <div className="flex bg-[#141414] text-xs">
            <button className="flex-1 py-2 border-b-2 border-yellow-500 text-yellow-500 font-bold">Vietsub</button>
            <button className="flex-1 py-2 text-gray-400">Clip</button>
          </div>
          
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <button onClick={translate} disabled={isProcessing} className="flex items-center gap-1 bg-gray-800 px-3 py-1.5 rounded text-xs">
                <Wand2 size={14} className="text-purple-400"/> Dịch AI
              </button>
            </div>

            {/* SUBTITLE LIST */}
            <div className="flex-1 bg-[#111] rounded border border-gray-800 p-2 flex flex-col gap-2">
              {subtitles.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 text-xs">Bấm bóc tách để tạo phụ đề.</div>
              ) : (
                subtitles.map((sub, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] p-2 rounded border border-gray-700 flex gap-2">
                    <div className="text-cyan-600 text-xs font-mono">{idx + 1}</div>
                    <div className="flex-1 flex flex-col gap-1">
                      <input type="text" value={sub.textVi} onChange={(e) => {
                        const newSubs = [...subtitles];
                        newSubs[idx].textVi = e.target.value;
                        setSubtitles(newSubs);
                      }} className="bg-transparent border-none outline-none text-yellow-500 text-sm font-semibold" />
                      <div className="text-gray-400 text-xs italic">{sub.textOriginal}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AI TOOLS */}
            <div className="border-t border-gray-800 pt-3">
              <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">Công Cụ AI</h3>
              <button onClick={transcribe} disabled={isProcessing} className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-900 p-2 rounded text-left">
                <div className="text-red-400 font-bold text-xs mb-1">🎙 Chuyển âm thanh thành chữ</div>
                <div className="text-[10px] text-gray-500 mb-2">Tự động lắng nghe và tạo phụ đề tức thì.</div>
                <div className="text-center bg-red-600 text-white text-xs py-1 rounded font-bold">
                  {isProcessing ? 'ĐANG BÓC TÁCH...' : 'Mở Auto-Transcription'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarIcon({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center gap-1 cursor-pointer ${active ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
      {icon} <span className="text-[10px]">{label}</span>
    </div>
  );
}

function VideoSample({ title, duration }) {
  return (
    <div className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-800 cursor-pointer">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center"><Play size={12} className="text-gray-400"/></div>
        <div className="flex flex-col"><span className="text-xs">{title}</span><span className="text-[10px] text-gray-500">{duration}</span></div>
      </div>
      <Settings size={14} className="text-gray-500"/>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { 
  Play, Pause, FileVideo, Mic, Type, Wand2, Download, 
  Settings, Volume2, MonitorPlay, Plus, Scissors, 
  Trash2, Undo, Redo, ZoomIn, ZoomOut, UploadCloud
} from 'lucide-react';
import { apiService } from './apiService'; // Giữ nguyên file apiService.js cũ

export default function VietsubEditorPro() {
  const [activeMenu, setActiveMenu] = useState('phude');
  const [activeTab, setActiveTab] = useState('vietsub');
  const [subtitles, setSubtitles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  
  const videoRef = useRef(null);

  // Xử lý File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setVideoFile(file);
    }
  };

  // Các hàm Gọi API (Tái sử dụng)
  const executeAction = async (actionFn, successMsg) => {
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

  const handleTranscribe = () => executeAction(async () => {
    if (!videoFile) throw new Error("Vui lòng tải video lên trước!");
    const segments = await apiService.transcribeVideo(videoFile, videoFile.name);
    setSubtitles(segments);
  });

  const handleTranslate = () => executeAction(async () => {
    if (!subtitles.length) throw new Error("Chưa có phụ đề để dịch!");
    const translated = await apiService.translateSubtitles(subtitles);
    setSubtitles(translated);
  });

  const handleExport = () => executeAction(async () => {
    if (!videoFile || !subtitles.length) throw new Error("Cần video và phụ đề!");
    const assContent = `[Script Info]\nScriptType: v4.00+\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
      subtitles.map(s => `Dialogue: 0,0:00:${s.start.toFixed(2)},0:00:${s.end.toFixed(2)},Default,,0,0,0,,${s.textVi}`).join('\n');
    await apiService.hardsubVideo(videoFile, assContent);
  }, "Xuất video thành công!");

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-300 font-sans text-sm overflow-hidden">
      
      {/* 1. HEADER (Thanh điều hướng trên cùng) */}
      <header className="h-14 flex items-center justify-between px-4 bg-[#141414] border-b border-black">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide">
            <MonitorPlay size={20} className="text-blue-500" />
            HENDY<span className="text-blue-500">STUDIO</span>
          </div>
          <nav className="flex gap-1 bg-[#0a0a0a] p-1 rounded-md border border-gray-800/60">
            <button className="px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-medium shadow-sm">Dựng Video</button>
            <button className="px-4 py-1.5 hover:bg-gray-800/50 hover:text-white rounded text-xs transition-colors">Tạo Phụ Đề AI</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-gray-800 pr-4">
            <button className="p-2 hover:bg-gray-800 rounded-full transition-colors"><Settings size={18} /></button>
          </div>
          <button 
            onClick={handleExport} 
            disabled={isProcessing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-5 py-2 rounded-md font-semibold text-white shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
          >
            <Download size={16} /> 
            {isProcessing ? 'Đang Render...' : 'Xuất Video'}
          </button>
        </div>
      </header>

      {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Thanh công cụ dọc (Sidebar Trái) */}
        <div className="w-16 bg-[#141414] border-r border-black flex flex-col items-center py-4 gap-2 z-10 shadow-xl">
          <NavIcon icon={<FileVideo />} label="Media" active={activeMenu === 'media'} onClick={() => setActiveMenu('media')} />
          <NavIcon icon={<Volume2 />} label="Âm thanh" active={activeMenu === 'sound'} onClick={() => setActiveMenu('sound')} />
          <NavIcon icon={<Type />} label="Văn bản" active={activeMenu === 'text'} onClick={() => setActiveMenu('text')} />
          <NavIcon icon={<Wand2 />} label="Phụ đề AI" active={activeMenu === 'phude'} onClick={() => setActiveMenu('phude')} />
        </div>

        {/* Quản lý Tài nguyên (Media Bin) */}
        <div className="w-72 bg-[#0f0f0f] border-r border-black flex flex-col">
          <div className="p-3 border-b border-gray-800/50 font-semibold text-gray-200">Kho Tài Nguyên</div>
          <div className="p-4 flex-1 overflow-y-auto">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-900/10 rounded-xl cursor-pointer transition-all mb-6 group">
              <UploadCloud size={28} className="text-gray-500 group-hover:text-blue-500 mb-2" />
              <span className="text-gray-400 group-hover:text-blue-400 font-medium">Nhấp để tải video lên</span>
              <span className="text-xs text-gray-600 mt-1">Hỗ trợ MP4, MOV, WEBM</span>
              <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
            </label>
            
            <div className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">Video Đã Tải Lên</div>
            {videoFile ? (
              <div className="flex items-center gap-3 bg-[#1a1a1a] p-2 rounded-lg border border-gray-800">
                <div className="w-12 h-12 bg-black rounded flex items-center justify-center overflow-hidden">
                  <Play size={16} className="text-blue-500"/>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-gray-200 truncate">{videoFile.name}</span>
                  <span className="text-xs text-gray-500">Sẵn sàng dựng</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 italic text-center mt-4">Chưa có file nào trong dự án</div>
            )}
          </div>
        </div>

        {/* Khu vực Trung tâm (Player + Timeline) */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Trình Phát Video (Player) */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            {videoSrc ? (
              <video ref={videoRef} src={videoSrc} controls className="max-w-full max-h-full object-contain shadow-2xl" />
            ) : (
              <div className="flex flex-col items-center text-gray-700">
                <MonitorPlay size={48} className="mb-4 opacity-20" />
                <p>Màn hình Preview</p>
              </div>
            )}
          </div>

          {/* TIMELINE (Bảng điều khiển thời gian) */}
          <div className="h-64 bg-[#141414] border-t border-black flex flex-col">
            {/* Thanh công cụ Timeline */}
            <div className="h-10 border-b border-gray-800/50 flex items-center justify-between px-4 bg-[#1a1a1a]">
              <div className="flex items-center gap-4 text-gray-400">
                <button className="hover:text-white"><Undo size={16}/></button>
                <button className="hover:text-white"><Redo size={16}/></button>
                <div className="w-px h-4 bg-gray-700"></div>
                <button className="hover:text-white"><Scissors size={16}/></button>
                <button className="hover:text-white"><Trash2 size={16}/></button>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut size={16} className="text-gray-500" />
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-gray-500 rounded-full"></div>
                </div>
                <ZoomIn size={16} className="text-gray-500" />
              </div>
            </div>
            
            {/* Tracks (Các lớp layer) */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 relative bg-[#0f0f0f]">
              {/* Thước đo thời gian (Ruler) */}
              <div className="h-6 border-b border-gray-800 flex items-end px-2 gap-10 text-[10px] text-gray-600 select-none mb-2">
                <span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span>
              </div>
              
              {/* Track Video */}
              <div className="flex items-center mb-2">
                <div className="w-16 flex-shrink-0 text-xs text-gray-500 font-medium">Video</div>
                <div className="flex-1 h-12 bg-gray-800/50 rounded-md border border-gray-700 relative overflow-hidden">
                  {videoSrc && <div className="absolute inset-y-0 left-0 w-full bg-blue-900/40 border border-blue-700 rounded-sm"></div>}
                </div>
              </div>

              {/* Track Phụ đề */}
              <div className="flex items-center">
                <div className="w-16 flex-shrink-0 text-xs text-gray-500 font-medium">Phụ đề</div>
                <div className="flex-1 h-10 bg-gray-800/30 rounded-md border border-gray-800 relative">
                  {subtitles.map((sub, idx) => {
                    const left = `${sub.start * 2}%`; // Giả lập scale time
                    const width = `${(sub.end - sub.start) * 2}%`;
                    return (
                      <div key={idx} style={{ left, width }} className="absolute inset-y-1 bg-yellow-600/80 hover:bg-yellow-500 border border-yellow-400 rounded cursor-pointer flex items-center px-1 overflow-hidden transition-colors shadow-sm">
                        <span className="text-[10px] text-black font-bold truncate">{sub.textVi}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Playhead (Thanh chạy) */}
              <div className="absolute top-0 bottom-0 left-[10%] w-[1px] bg-red-500 z-10 shadow-[0_0_4px_rgba(239,68,68,0.8)]">
                <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1.5 -ml-1.5 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BẢNG ĐIỀU KHIỂN BÊN PHẢI (Subtitle Inspector / AI Tools) */}
        <div className="w-[380px] bg-[#141414] border-l border-black flex flex-col z-10 shadow-2xl">
          
          {/* Tabs */}
          <div className="flex bg-[#0f0f0f] border-b border-gray-800 pt-2 px-2 gap-1 text-sm font-medium">
            <Tab label="Phụ đề AI" active={activeTab === 'vietsub'} onClick={() => setActiveTab('vietsub')} />
            <Tab label="Lồng tiếng" active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} />
            <Tab label="Hiệu ứng" active={activeTab === 'fx'} onClick={() => setActiveTab('fx')} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Bộ Nút AI */}
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-800/50 bg-[#111]">
              <button 
                onClick={handleTranscribe} 
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-lg transition-all"
              >
                <Wand2 size={20} className="text-red-400 mb-1" />
                <span className="text-xs font-semibold text-red-200">Tạo Phụ Đề (Auto)</span>
              </button>
              
              <button 
                onClick={handleTranslate} 
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-3 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg transition-all"
              >
                <Type size={20} className="text-purple-400 mb-1" />
                <span className="text-xs font-semibold text-purple-200">Dịch Đa Ngôn Ngữ</span>
              </button>
            </div>

            {/* Danh sách block phụ đề */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0a0a0a]">
              {subtitles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <Type size={40} className="opacity-20" />
                  <p className="text-xs text-center px-6">Trống. Hãy bấm "Tạo Phụ Đề" để AI bắt đầu phân tích giọng nói.</p>
                </div>
              ) : (
                subtitles.map((sub, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] rounded-lg border border-gray-800 hover:border-gray-600 p-3 transition-colors group relative shadow-sm">
                    {/* Header Block: Thời gian & Công cụ */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded font-mono">#{idx + 1}</span>
                        <span className="text-[10px] font-mono text-cyan-600/80">
                          {sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s
                        </span>
                      </div>
                      <button className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {/* Input Phụ đề */}
                    <div className="space-y-2">
                      <textarea 
                        defaultValue={sub.textVi} 
                        className="w-full bg-transparent border-b border-gray-700 hover:border-gray-500 focus:border-yellow-500 outline-none text-yellow-500 text-sm font-semibold resize-none h-12 transition-colors"
                      />
                      <textarea 
                        defaultValue={sub.textOriginal} 
                        className="w-full bg-transparent border-none outline-none text-gray-500 text-xs italic resize-none h-8"
                        readOnly
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Nút Thêm Thủ công */}
            <div className="p-3 bg-[#111] border-t border-gray-800">
              <button className="w-full py-2 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors">
                <Plus size={14} /> Thêm câu phụ đề thủ công
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Components Phụ Trợ ---

function NavIcon({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick} 
      className={`w-12 h-14 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-all duration-200
      ${active ? 'bg-blue-600/10 text-blue-500' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
    >
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[9px] font-medium tracking-wide">{label}</span>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-t-lg transition-colors ${active ? 'bg-[#141414] text-white border-t-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
    >
      {label}
    </button>
  );
}

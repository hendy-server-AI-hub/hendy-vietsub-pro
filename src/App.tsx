import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, FileVideo, Mic, Type, Wand2, Download, 
  Settings, Volume2, MonitorPlay, Plus, Scissors, 
  Trash2, Undo, Redo, ZoomIn, ZoomOut, UploadCloud,
  Sparkles, Check, AlertCircle, RefreshCw, Bookmark,
  Layers, Clock, HelpCircle, Film
} from 'lucide-react';
import { apiService, SubtitleSegmentItem } from './apiService';
import ExportModal from './components/ExportModal';
import AutoTranscriptionModal from './components/AutoTranscriptionModal';
import AiVideoCreationModal from './components/AiVideoCreationModal';
import { generateBookmarkletCode } from './utils/bookmarklet';

export default function VietsubEditorPro() {
  const [activeMenu, setActiveMenu] = useState<'phude' | 'media' | 'sound' | 'text' | 'bookmarklet'>('phude');
  const [activeTab, setActiveTab] = useState<'vietsub' | 'voice' | 'fx'>('vietsub');
  const [subtitles, setSubtitles] = useState<SubtitleSegmentItem[]>([
    {
      id: 1,
      start: 0.5,
      end: 3.5,
      text: "Welcome to Hendy Vietsub Pro Studio.",
      textOriginal: "Welcome to Hendy Vietsub Pro Studio.",
      textVi: "Chào mừng đến với Hendy Vietsub Pro Studio.",
      translation: "Chào mừng đến với Hendy Vietsub Pro Studio."
    },
    {
      id: 2,
      start: 4.0,
      end: 7.8,
      text: "Automatic AI-powered subtitle generation and cinematic translation.",
      textOriginal: "Automatic AI-powered subtitle generation and cinematic translation.",
      textVi: "Tự động tạo phụ đề AI và biên dịch phong cách điện ảnh.",
      translation: "Tự động tạo phụ đề AI và biên dịch phong cách điện ảnh."
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<number | string | null>(1);
  const [stylePrompt, setStylePrompt] = useState('Phim chiếu rạp điện ảnh');

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFile(file);
      showToast(`Đã tải video "${file.name}" vào dự án`, 'success');
    }
  };

  // Synchronize playback time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 15);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  // Find currently active subtitle
  const activeSubtitle = subtitles.find(
    sub => currentTime >= sub.start && currentTime <= sub.end
  );

  // Subtitle CRUD
  const handleUpdateSub = (id: number | string, field: 'textVi' | 'start' | 'end', value: any) => {
    setSubtitles(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleAddSubtitle = () => {
    const newStart = Number(currentTime.toFixed(1));
    const newEnd = Number((newStart + 2.5).toFixed(1));
    const newId = Date.now();
    const newSub: SubtitleSegmentItem = {
      id: newId,
      start: newStart,
      end: newEnd,
      text: "New subtitle segment",
      textOriginal: "New subtitle segment",
      textVi: "Dòng phụ đề mới",
      translation: "Dòng phụ đề mới"
    };
    setSubtitles(prev => [...prev, newSub].sort((a, b) => a.start - b.start));
    setSelectedSubId(newId);
    showToast("Đã thêm một câu phụ đề mới tại " + newStart + "s", 'info');
  };

  const handleDeleteSub = (id: number | string) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    showToast("Đã xóa câu phụ đề", 'info');
  };

  // Actions
  const handleTranscribe = async () => {
    try {
      setIsProcessing(true);
      showToast("Đang nhận diện giọng nói và tự động tạo timestamp...", 'info');
      const segments = await apiService.transcribeVideo(videoFile, videoFile?.name || 'My Video');
      if (segments && segments.length > 0) {
        setSubtitles(segments);
        if (segments[0].end > duration) {
          setDuration(segments[segments.length - 1].end + 2);
        }
        showToast(`Tạo thành công ${segments.length} câu phụ đề tự động!`, 'success');
      } else {
        showToast("Không tìm thấy âm thanh hoặc giọng nói để tách.", 'info');
      }
    } catch (err: any) {
      showToast(`Lỗi nhận diện âm thanh: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!subtitles.length) {
      showToast("Chưa có phụ đề nào để dịch! Hãy tải video hoặc thêm câu phụ đề.", 'error');
      return;
    }
    try {
      setIsProcessing(true);
      showToast("Gemini AI đang dịch & chuẩn hóa phụ đề tiếng Việt điện ảnh...", 'info');
      const translated = await apiService.translateSubtitles(subtitles);
      setSubtitles(translated);
      showToast("Đã dịch xong toàn bộ phụ đề với văn phong chuẩn điện ảnh!", 'success');
    } catch (err: any) {
      showToast(`Lỗi dịch: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHardsub = async () => {
    if (!videoFile) {
      showToast("Vui lòng tải tệp video lên trước khi xuất!", 'error');
      return;
    }
    if (!subtitles.length) {
      showToast("Chưa có danh sách phụ đề nào để khắc vào video!", 'error');
      return;
    }

    try {
      setIsProcessing(true);
      showToast("Đang render phụ đề vào video...", 'info');
      const assContent = `[Script Info]\nTitle: Vietsub Export\nScriptType: v4.00+\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
        subtitles.map(s => {
          const text = (s.textVi || s.translation || s.text || '').replace(/\n/g, '\\N');
          return `Dialogue: 0,0:00:${s.start.toFixed(2)},0:00:${s.end.toFixed(2)},Default,,0,0,0,,${text}`;
        }).join('\n');
      
      await apiService.hardsubVideo(videoFile, assContent);
      showToast("Xuất video thành công!", 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất video: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScriptGenerated = (scriptText: string) => {
    showToast("Đã áp dụng kịch bản AI vào dự án!", 'success');
    // Parse script text into subtitle blocks if lines have formatting
    const lines = scriptText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      let currentTimeAcc = 0.5;
      const parsedSubs: SubtitleSegmentItem[] = lines.slice(0, 15).map((line, idx) => {
        const start = Number(currentTimeAcc.toFixed(1));
        const end = Number((currentTimeAcc + 3.0).toFixed(1));
        currentTimeAcc += 3.5;
        return {
          id: idx + 1,
          start,
          end,
          text: line.trim(),
          textOriginal: line.trim(),
          textVi: line.trim(),
          translation: line.trim()
        };
      });
      setSubtitles(parsedSubs);
      if (currentTimeAcc > duration) {
        setDuration(currentTimeAcc + 2);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-300 font-sans text-sm overflow-hidden select-none">
      
      {/* TOAST NOTIFICATION */}
      {statusMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60 shadow-emerald-950/50' 
            : statusMessage.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-700/60 shadow-red-950/50'
            : 'bg-slate-900/90 text-cyan-200 border-cyan-800/60 shadow-slate-950/50'
        }`}>
          {statusMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
          {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. HEADER (Thanh điều hướng trên cùng) */}
      <header className="h-14 flex items-center justify-between px-4 bg-[#141414] border-b border-neutral-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide">
            <MonitorPlay size={20} className="text-blue-500" />
            <span>HENDY<span className="text-blue-500">VIETSUB</span> PRO</span>
            <span className="ml-2 text-[10px] font-mono uppercase bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800">Studio</span>
          </div>

          <nav className="flex gap-1 bg-[#0a0a0a] p-1 rounded-md border border-neutral-800">
            <button 
              onClick={() => setActiveMenu('phude')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeMenu === 'phude' ? 'bg-neutral-800 text-white shadow-sm' : 'hover:bg-neutral-800/50 text-neutral-400'
              }`}
            >
              Dựng Video & Phụ Đề
            </button>
            <button 
              onClick={() => setIsScriptModalOpen(true)}
              className="px-3 py-1 hover:bg-neutral-800/50 text-neutral-400 hover:text-white rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-amber-400" />
              Tạo Kịch Bản AI
            </button>
            <button 
              onClick={() => setActiveMenu('bookmarklet')}
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                activeMenu === 'bookmarklet' ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800/50 text-neutral-400'
              }`}
            >
              <Bookmark size={12} />
              Bookmarklet
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/60 animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              Đang xử lý AI...
            </div>
          )}

          <button 
            onClick={() => setIsExportOpen(true)} 
            disabled={isProcessing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 rounded-md font-semibold text-white shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 text-xs"
          >
            <Download size={14} /> 
            Xuất Bản & Render
          </button>
        </div>
      </header>

      {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Thanh công cụ dọc (Sidebar Trái) */}
        <div className="w-16 bg-[#141414] border-r border-neutral-800 flex flex-col items-center py-4 gap-2 z-10">
          <NavIcon icon={<FileVideo />} label="Media" active={activeMenu === 'media'} onClick={() => setActiveMenu('media')} />
          <NavIcon icon={<Wand2 />} label="Phụ đề AI" active={activeMenu === 'phude'} onClick={() => setActiveMenu('phude')} />
          <NavIcon icon={<Volume2 />} label="Âm thanh" active={activeMenu === 'sound'} onClick={() => setActiveMenu('sound')} />
          <NavIcon icon={<Type />} label="Văn bản" active={activeMenu === 'text'} onClick={() => setActiveMenu('text')} />
          <NavIcon icon={<Bookmark />} label="Tiện ích" active={activeMenu === 'bookmarklet'} onClick={() => setActiveMenu('bookmarklet')} />
        </div>

        {/* Cột Media Bin hoặc Bookmarklet Info */}
        <div className="w-72 bg-[#0f0f0f] border-r border-neutral-800 flex flex-col">
          {activeMenu === 'bookmarklet' ? (
            <div className="p-4 flex flex-col h-full overflow-y-auto text-xs">
              <h3 className="font-bold text-gray-100 text-sm mb-2 flex items-center gap-2">
                <Bookmark size={16} className="text-blue-400" /> Bookmarklet Overlay
              </h3>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Kéo nút bên dưới vào thanh Bookmark của trình duyệt để dịch phụ đề trực tiếp trên YouTube, Netflix hoặc phim trực tuyến:
              </p>

              <a
                href={generateBookmarkletCode(window.location.origin)}
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Kéo liên kết này lên thanh Dấu trang của trình duyệt!", 'info');
                }}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-center block mb-4 shadow transition"
              >
                ⭐ Hendy Vietsub Overlay
              </a>

              <div className="bg-neutral-900 border border-neutral-800 rounded p-3 text-neutral-400">
                <p className="font-semibold text-neutral-300 mb-1">Hướng dẫn:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>Bật thanh dấu trang (Ctrl+Shift+B).</li>
                  <li>Kéo nút xanh vào thanh dấu trang.</li>
                  <li>Mở trang video bất kỳ và bấm vào bookmark để hiển thị phụ đề nổi.</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-neutral-800 font-semibold text-gray-200 flex items-center justify-between">
                <span>Kho Tài Nguyên</span>
                <span className="text-xs text-neutral-500 font-mono">1 tệp</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-neutral-700 hover:border-blue-500 hover:bg-blue-900/10 rounded-xl cursor-pointer transition-all mb-5 group text-center p-2">
                  <UploadCloud size={28} className="text-neutral-500 group-hover:text-blue-500 mb-2 transition" />
                  <span className="text-neutral-300 group-hover:text-blue-400 font-medium text-xs">Nhấp để tải video lên</span>
                  <span className="text-[10px] text-neutral-500 mt-1">MP4, MOV, WEBM, MKV</span>
                  <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileUpload} />
                </label>
                
                <div className="text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-wider">Tệp trong dự án</div>
                {videoFile ? (
                  <div className="flex items-center gap-3 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                    <div className="w-10 h-10 bg-black rounded flex items-center justify-center flex-shrink-0 text-blue-400">
                      <Film size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-gray-200 font-medium truncate">{videoFile.name}</span>
                      <span className="text-[10px] text-emerald-400">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Sẵn sàng</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 italic text-center py-6 border border-neutral-900 rounded-lg">
                    Chưa tải video lên. Bạn có thể chỉnh sửa phụ đề trực tiếp hoặc tải video lên để xem trước.
                  </div>
                )}

                <div className="mt-6 border-t border-neutral-800/80 pt-4">
                  <div className="text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-wider">Cấu hình Vietsub</div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Phong cách dịch thuật:</label>
                  <select 
                    value={stylePrompt} 
                    onChange={(e) => setStylePrompt(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded p-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Phim chiếu rạp điện ảnh">Phim chiếu rạp (Điện ảnh, kịch tính)</option>
                    <option value="Tự nhiên đời thường">Tự nhiên đời thường (Giao tiếp)</option>
                    <option value="Hài hước hóm hỉnh">Hài hước hóm hỉnh (Gen Z & Meme)</option>
                    <option value="Tài liệu học thuật">Tài liệu học thuật (Chuẩn xác, trang trọng)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Khu vực Trung tâm (Player + Timeline) */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Trình Phát Video (Player) */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            {videoSrc ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  src={videoSrc} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                  className="max-w-full max-h-[calc(100vh-320px)] object-contain shadow-2xl cursor-pointer" 
                />
                
                {/* Overlay hiển thị phụ đề trực tiếp trên Player */}
                {activeSubtitle && (
                  <div className="absolute bottom-6 inset-x-4 flex justify-center pointer-events-none">
                    <div className="bg-black/75 backdrop-blur-sm border border-neutral-700/50 px-4 py-2 rounded-lg text-center shadow-2xl max-w-2xl">
                      <div className="text-yellow-400 font-bold text-base tracking-wide drop-shadow-md">
                        {activeSubtitle.textVi || activeSubtitle.translation}
                      </div>
                      {activeSubtitle.textOriginal && (
                        <div className="text-neutral-400 text-xs italic mt-0.5 opacity-80">
                          {activeSubtitle.textOriginal}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-600 gap-3">
                <div className="w-20 h-20 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-center">
                  <MonitorPlay size={36} className="text-neutral-600" />
                </div>
                <div className="text-center">
                  <p className="text-neutral-300 font-medium">Màn hình xem trước video</p>
                  <p className="text-xs text-neutral-500 mt-1">Tải video từ bảng điều khiển bên trái để bắt đầu</p>
                </div>
              </div>
            )}
          </div>

          {/* TIMELINE (Bảng điều khiển thời gian) */}
          <div className="h-60 bg-[#141414] border-t border-neutral-800 flex flex-col">
            {/* Thanh công cụ Timeline */}
            <div className="h-10 border-b border-neutral-800 flex items-center justify-between px-4 bg-[#181818]">
              <div className="flex items-center gap-3 text-neutral-400">
                <button 
                  onClick={togglePlay}
                  className="p-1 hover:text-white bg-neutral-800 rounded transition"
                  title={isPlaying ? "Tạm dừng" : "Phát"}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="text-xs font-mono text-neutral-300">
                  {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                </div>
                <div className="w-px h-4 bg-neutral-700 mx-1"></div>
                <button onClick={handleAddSubtitle} className="hover:text-white flex items-center gap-1 text-xs">
                  <Plus size={14} /> Thêm sub tại playhead
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-neutral-500 font-mono">Zoom timeline</span>
                <ZoomOut size={14} className="text-neutral-500 cursor-pointer" />
                <div className="w-20 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-blue-500 rounded-full"></div>
                </div>
                <ZoomIn size={14} className="text-neutral-500 cursor-pointer" />
              </div>
            </div>
            
            {/* Tracks (Các lớp layer) */}
            <div 
              className="flex-1 overflow-x-auto overflow-y-hidden p-2 relative bg-[#0d0d0d]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                seekTo(ratio * duration);
              }}
            >
              {/* Thước đo thời gian (Ruler) */}
              <div className="h-5 border-b border-neutral-800/80 flex items-end px-2 gap-12 text-[9px] text-neutral-500 select-none mb-1 font-mono">
                <span>00:00</span>
                <span>00:03</span>
                <span>00:06</span>
                <span>00:09</span>
                <span>00:12</span>
                <span>00:15</span>
                <span>00:18</span>
                <span>00:21</span>
              </div>
              
              {/* Track Video */}
              <div className="flex items-center mb-2">
                <div className="w-14 flex-shrink-0 text-[11px] text-neutral-500 font-medium">Video</div>
                <div className="flex-1 h-9 bg-neutral-900 rounded border border-neutral-800 relative overflow-hidden">
                  {videoSrc && (
                    <div className="absolute inset-y-0 left-0 w-full bg-blue-900/30 border border-blue-600/40 rounded flex items-center px-3 text-[10px] text-blue-300 font-mono truncate">
                      {videoFile?.name || "Video Track"}
                    </div>
                  )}
                </div>
              </div>

              {/* Track Phụ đề */}
              <div className="flex items-center">
                <div className="w-14 flex-shrink-0 text-[11px] text-yellow-500 font-medium">Vietsub</div>
                <div className="flex-1 h-10 bg-neutral-900/60 rounded border border-neutral-800/80 relative overflow-hidden">
                  {subtitles.map((sub) => {
                    const maxDur = Math.max(duration, 1);
                    const left = `${Math.min(100, Math.max(0, (sub.start / maxDur) * 100))}%`;
                    const width = `${Math.min(100, Math.max(2, ((sub.end - sub.start) / maxDur) * 100))}%`;
                    const isSelected = selectedSubId === sub.id;

                    return (
                      <div 
                        key={sub.id} 
                        style={{ left, width }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubId(sub.id);
                          seekTo(sub.start);
                        }}
                        className={`absolute inset-y-1 rounded cursor-pointer flex items-center px-1.5 overflow-hidden transition-all shadow-sm ${
                          isSelected 
                            ? 'bg-yellow-500 border border-white text-black font-semibold ring-2 ring-yellow-400/50' 
                            : 'bg-yellow-600/80 hover:bg-yellow-500 border border-yellow-400 text-black'
                        }`}
                      >
                        <span className="text-[10px] truncate select-none">{sub.textVi || sub.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Playhead (Thanh chạy) */}
              <div 
                style={{ left: `${Math.min(100, Math.max(0, (currentTime / Math.max(duration, 1)) * 100))}%` }}
                className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-10 pointer-events-none shadow-[0_0_6px_rgba(239,68,68,0.9)]"
              >
                <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1.5 -ml-[5px] rounded-xs shadow"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BẢNG ĐIỀU KHIỂN BÊN PHẢI (Subtitle Inspector / AI Tools) */}
        <div className="w-[380px] bg-[#141414] border-l border-neutral-800 flex flex-col z-10 shadow-2xl">
          
          {/* Tabs */}
          <div className="flex bg-[#0f0f0f] border-b border-neutral-800 pt-2 px-2 gap-1 text-xs font-medium">
            <Tab label="Phụ đề AI" active={activeTab === 'vietsub'} onClick={() => setActiveTab('vietsub')} />
            <Tab label="Lồng tiếng" active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} />
            <Tab label="Hiệu ứng chữ" active={activeTab === 'fx'} onClick={() => setActiveTab('fx')} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Bộ Nút AI */}
            <div className="p-3 grid grid-cols-2 gap-2 border-b border-neutral-800 bg-[#121212]">
              <button 
                onClick={handleTranscribe} 
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-lg transition-all text-center group disabled:opacity-50"
              >
                <Wand2 size={18} className="text-red-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-red-200">Tạo Phụ Đề Tự Động</span>
                <span className="text-[10px] text-red-400/80">Speech-to-Text AI</span>
              </button>
              
              <button 
                onClick={handleTranslate} 
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-2.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 rounded-lg transition-all text-center group disabled:opacity-50"
              >
                <Type size={18} className="text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-purple-200">Dịch Chuẩn Điện Ảnh</span>
                <span className="text-[10px] text-purple-400/80">Gemini 2.5 Flash</span>
              </button>
            </div>

            {/* Danh sách block phụ đề */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#0a0a0a]">
              {subtitles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-3 py-10">
                  <Type size={36} className="opacity-20" />
                  <p className="text-xs text-center px-6">Chưa có câu phụ đề nào. Nhấp vào "Tạo Phụ Đề Tự Động" hoặc "Thêm câu phụ đề".</p>
                </div>
              ) : (
                subtitles.map((sub, idx) => {
                  const isSelected = selectedSubId === sub.id;
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => {
                        setSelectedSubId(sub.id);
                        seekTo(sub.start);
                      }}
                      className={`rounded-lg border p-3 transition-all relative ${
                        isSelected 
                          ? 'bg-[#1e1e1e] border-blue-500 ring-1 ring-blue-500/30 shadow-md' 
                          : 'bg-[#161616] border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Header Block: Thời gian & Công cụ */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-neutral-800 text-neutral-400 text-[10px] px-1.5 py-0.5 rounded font-mono">#{idx + 1}</span>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                            <input 
                              type="number"
                              step="0.1"
                              value={sub.start}
                              onChange={(e) => handleUpdateSub(sub.id, 'start', parseFloat(e.target.value) || 0)}
                              className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1 text-center text-cyan-300 focus:outline-none focus:border-cyan-500"
                            />
                            <span>→</span>
                            <input 
                              type="number"
                              step="0.1"
                              value={sub.end}
                              onChange={(e) => handleUpdateSub(sub.id, 'end', parseFloat(e.target.value) || 0)}
                              className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1 text-center text-cyan-300 focus:outline-none focus:border-cyan-500"
                            />
                            <span>s</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              seekTo(sub.start);
                            }}
                            className="p-1 hover:text-white text-neutral-400"
                            title="Nhảy tới mốc thời gian"
                          >
                            <Play size={12} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSub(sub.id);
                            }}
                            className="p-1 hover:text-red-400 text-neutral-500"
                            title="Xóa câu này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Input Phụ đề Tiếng Việt */}
                      <div className="space-y-1.5">
                        <textarea 
                          value={sub.textVi || ''} 
                          onChange={(e) => handleUpdateSub(sub.id, 'textVi', e.target.value)}
                          placeholder="Nhập nội dung phụ đề tiếng Việt..."
                          className="w-full bg-neutral-950/70 border border-neutral-800/80 rounded p-2 focus:border-yellow-500 outline-none text-yellow-400 text-xs font-medium resize-none h-14 transition-colors"
                        />
                        {sub.textOriginal && (
                          <div className="text-[11px] text-neutral-400 italic px-1 truncate" title={sub.textOriginal}>
                            Gốc: {sub.textOriginal}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Nút Thêm Thủ công */}
            <div className="p-3 bg-[#121212] border-t border-neutral-800">
              <button 
                onClick={handleAddSubtitle}
                className="w-full py-2 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md text-xs font-medium transition-colors"
              >
                <Plus size={14} /> Thêm câu phụ đề thủ công
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODALS */}
      <ExportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        subtitles={subtitles}
        onHardsub={handleHardsub}
        isProcessing={isProcessing}
      />

      <AutoTranscriptionModal 
        isOpen={isTranscribeModalOpen}
        onClose={() => setIsTranscribeModalOpen(false)}
        onTranscribed={(txt) => {
          showToast(txt, 'success');
          handleTranscribe();
        }}
      />

      <AiVideoCreationModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        onGenerated={handleScriptGenerated}
      />
    </div>
  );
}

// --- Components Phụ Trợ ---

function NavIcon({ icon, label, active, onClick }: { icon: React.ReactElement; label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick} 
      className={`w-12 h-14 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-all duration-200 ${
        active 
          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' 
          : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
      }`}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[9px] font-medium tracking-wide">{label}</span>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-t text-xs transition-colors ${
        active 
          ? 'bg-[#141414] text-white font-medium border-t-2 border-blue-500' 
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40'
      }`}
    >
      {label}
    </button>
  );
}

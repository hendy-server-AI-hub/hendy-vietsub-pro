import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Check, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  SubtitleSegment, SubtitleStyle, AspectRatioType, 
  AudioTrackSettings 
} from './types/editor';
import { apiService } from './apiService';
import { audioEngine } from './utils/audioEngine';

// Components
import Header from './components/Header';
import AssetSidebar from './components/AssetSidebar';
import CanvasPreview from './components/CanvasPreview';
import Timeline from './components/Timeline';
import InspectorPanel from './components/InspectorPanel';
import MultiChannelAudioMixer from './components/MultiChannelAudioMixer';
import ExportModal from './components/ExportModal';
import AiVideoCreationModal from './components/AiVideoCreationModal';
import ExtensionsModal from './components/ExtensionsModal';
import { usePWAInstall } from './utils/usePWAInstall';

export default function VietsubEditorPro() {
  const { getOsLabel, handleInstallClick } = usePWAInstall();

  // 1. Project Metadata
  const [projectTitle, setProjectTitle] = useState('Dự án Vietsub Điện Ảnh 01');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>('1080p');

  // 2. Video & Playback State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [videoVolume, setVideoVolume] = useState(1.0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 3. Subtitles & Styling State
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([
    {
      id: 1,
      start: 0.5,
      end: 3.5,
      text: "Welcome to Hendy Vietsub Pro Studio.",
      textOriginal: "Welcome to Hendy Vietsub Pro Studio.",
      textVi: "Chào mừng bạn đến với Hendy Vietsub Pro Studio.",
      translation: "Chào mừng bạn đến với Hendy Vietsub Pro Studio."
    },
    {
      id: 2,
      start: 4.0,
      end: 8.0,
      text: "Automated cinematic AI translation and multi-channel audio mixing.",
      textOriginal: "Automated cinematic AI translation and multi-channel audio mixing.",
      textVi: "Dịch thuật phụ đề điện ảnh AI và bộ trộn âm thanh đa kênh.",
      translation: "Dịch thuật phụ đề điện ảnh AI và bộ trộn âm thanh đa kênh."
    },
    {
      id: 3,
      start: 8.5,
      end: 13.0,
      text: "Real-time HTML5 Canvas composition and instant video export.",
      textOriginal: "Real-time HTML5 Canvas composition and instant video export.",
      textVi: "Hòa âm & khắc phụ đề Canvas trực tiếp ngay trong trình duyệt.",
      translation: "Hòa âm & khắc phụ đề Canvas trực tiếp ngay trong trình duyệt."
    }
  ]);

  const [selectedSubId, setSelectedSubId] = useState<number | string | null>(1);
  const [hasVoiceoverTrack, setHasVoiceoverTrack] = useState(true);

  const [globalStyle, setGlobalStyle] = useState<SubtitleStyle>({
    fontFamily: 'Inter, sans-serif',
    fontSize: 38,
    textColor: '#FACC15', // Bright yellow
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 8,
    bgColor: 'transparent',
    positionY: 'bottom',
    animation: 'none',
  });

  // 4. Multi-Channel Audio Matrix Settings
  const [audioSettings, setAudioSettings] = useState<AudioTrackSettings>({
    videoAudio: { volume: 0.8, muted: false, solo: false, pan: 0 },
    voiceover: { volume: 1.1, muted: false, solo: false, duckingSensitivity: 0.7, voiceId: 'Puck' },
    bgm: { volume: 0.4, muted: false, solo: false, autoDuck: true, loop: true },
    sfx: { volume: 0.75, muted: false, solo: false, reverb: false },
    master: { volume: 1.0, muted: false, limiter: true }
  });

  // 5. Undo / Redo History
  const [history, setHistory] = useState<SubtitleSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 6. UI Modals & Panels
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Update subtitles with history tracking
  const updateSubtitlesWithHistory = (newSubs: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => {
    setSubtitles(prev => {
      const resolved = typeof newSubs === 'function' ? newSubs(prev) : newSubs;
      setHistory(h => [...h.slice(0, historyIndex + 1), prev]);
      setHistoryIndex(i => i + 1);
      return resolved;
    });
  };

  const handleUndo = () => {
    if (historyIndex >= 0) {
      const prevSubs = history[historyIndex];
      setSubtitles(prevSubs);
      setHistoryIndex(historyIndex - 1);
      showToast('Đã hoàn tác (Undo)', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextSubs = history[historyIndex + 1];
      setSubtitles(nextSubs);
      setHistoryIndex(historyIndex + 1);
      showToast('Đã làm lại (Redo)', 'info');
    }
  };

  // Playback Dispatcher
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (time: number) => {
    const clamped = Math.max(0, Math.min(duration, time));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  };

  // Sync native video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoSrc]);

  // Sync speed & volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoSpeed;
      videoRef.current.volume = Math.max(0, Math.min(1, videoVolume));
    }
  }, [videoSpeed, videoVolume]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplitSubtitleAtPlayhead();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedSubId) {
          e.preventDefault();
          handleDeleteSubtitle(selectedSubId);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(currentTime - (e.shiftKey ? 1.0 : 1 / 30));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(currentTime + (e.shiftKey ? 1.0 : 1 / 30));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, selectedSubId, historyIndex, history]);

  // File Upload Handler
  const handleFileUpload = (file: File) => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFile(file);
    setProjectTitle(file.name.replace(/\.[^/.]+$/, ''));
    showToast(`Đã nạp tệp "${file.name}" vào dự án`, 'success');
  };

  // Subtitle Actions
  const handleUpdateSub = (id: number | string, updates: Partial<SubtitleSegment>) => {
    updateSubtitlesWithHistory(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, ...updates };
      }
      return s;
    }));
  };

  const handleUpdateSubtitleRange = (id: number | string, start: number, end: number) => {
    updateSubtitlesWithHistory(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, start, end };
      }
      return s;
    }).sort((a, b) => a.start - b.start));
  };

  const handleAddSubtitleAtPlayhead = () => {
    const newStart = Math.round(currentTime * 10) / 10;
    const newEnd = Math.round((newStart + 3.0) * 10) / 10;
    const newId = Date.now();
    const newSub: SubtitleSegment = {
      id: newId,
      start: newStart,
      end: newEnd,
      text: "New subtitle line",
      textOriginal: "New subtitle line",
      textVi: "Dòng phụ đề mới",
      translation: "Dòng phụ đề mới"
    };

    updateSubtitlesWithHistory(prev => [...prev, newSub].sort((a, b) => a.start - b.start));
    setSelectedSubId(newId);
    showToast(`Đã thêm phụ đề mới tại ${newStart}s`, 'info');
  };

  const handleSplitSubtitleAtPlayhead = () => {
    const activeSub = subtitles.find(s => currentTime > s.start + 0.2 && currentTime < s.end - 0.2);
    if (!activeSub) {
      showToast('Đặt playhead ở giữa một câu phụ đề để cắt đôi', 'info');
      return;
    }

    const splitTime = Math.round(currentTime * 10) / 10;
    const originalEnd = activeSub.end;
    const newId = Date.now();

    updateSubtitlesWithHistory(prev => {
      return prev.flatMap(s => {
        if (s.id === activeSub.id) {
          const firstHalf: SubtitleSegment = {
            ...s,
            end: splitTime,
          };
          const secondHalf: SubtitleSegment = {
            ...s,
            id: newId,
            start: splitTime,
            end: originalEnd,
          };
          return [firstHalf, secondHalf];
        }
        return [s];
      }).sort((a, b) => a.start - b.start);
    });

    setSelectedSubId(newId);
    audioEngine.playPop();
    showToast('Đã cắt đôi câu phụ đề thành 2 phân đoạn', 'success');
  };

  const handleDeleteSubtitle = (id: number | string) => {
    updateSubtitlesWithHistory(prev => prev.filter(s => s.id !== id));
    if (selectedSubId === id) setSelectedSubId(null);
    showToast('Đã xóa câu phụ đề', 'info');
  };

  // AI Quick Actions
  const handleAutoVietsub = async () => {
    if (subtitles.length === 0) {
      showToast('Chưa có phụ đề nào để dịch! Hãy tải video hoặc thêm phụ đề.', 'error');
      return;
    }
    try {
      setIsProcessing(true);
      showToast('Gemini 3.8 Flash đang dịch & chuẩn hóa ngữ điệu điện ảnh...', 'info');
      const translated = await apiService.translateSubtitles(subtitles, 'Phim chiếu rạp');
      updateSubtitlesWithHistory(translated);
      showToast('Đã hoàn thiện Vietsub phong cách điện ảnh cho toàn bộ video!', 'success');
    } catch (err: any) {
      showToast(`Lỗi dịch: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoAudioMix = async () => {
    try {
      setIsProcessing(true);
      showToast('Gemini AI đang phân tích và tối ưu hóa ma trận âm thanh...', 'info');
      const rec = await apiService.optimizeAudioMix(audioSettings, subtitles.length);
      if (rec) {
        setAudioSettings(prev => ({
          ...prev,
          master: { ...prev.master, volume: rec.masterVol ?? 1.0 },
          videoAudio: { ...prev.videoAudio, volume: rec.videoVol ?? 0.65 },
          voiceover: { ...prev.voiceover, volume: rec.voiceVol ?? 1.15 },
          bgm: { ...prev.bgm, volume: rec.bgmVol ?? 0.3 },
          sfx: { ...prev.sfx, volume: rec.sfxVol ?? 0.75 },
        }));

        audioEngine.updateLevels({
          masterVol: rec.masterVol ?? 1.0,
          videoVol: rec.videoVol ?? 0.65,
          voiceVol: rec.voiceVol ?? 1.15,
          bgmVol: rec.bgmVol ?? 0.3,
          sfxVol: rec.sfxVol ?? 0.75,
        });

        showToast(rec.explanation || 'Đã cân bằng âm thanh chuẩn -14 LUFS!', 'success');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScriptGenerated = (scriptText: string) => {
    showToast('Đã áp dụng kịch bản phân cảnh AI vào Timeline!', 'success');
    const lines = scriptText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      let tAcc = 0.5;
      const parsedSubs: SubtitleSegment[] = lines.slice(0, 15).map((line, idx) => {
        const start = Math.round(tAcc * 10) / 10;
        const end = Math.round((tAcc + 3.2) * 10) / 10;
        tAcc += 3.6;
        const cleanLine = line.replace(/^\[.*?\]\s*\|\s*/, '').replace(/^[0-9]+[\.\:\)]\s*/, '').trim();
        return {
          id: idx + 1,
          start,
          end,
          text: cleanLine,
          textOriginal: cleanLine,
          textVi: cleanLine,
          translation: cleanLine
        };
      });
      updateSubtitlesWithHistory(parsedSubs);
      if (tAcc > duration) setDuration(tAcc + 2);
    }
  };

  const handleInsertSfx = (type: string, name: string) => {
    // Play sound and trigger feedback
    if (type === 'whoosh') audioEngine.playWhoosh();
    else if (type === 'impact') audioEngine.playImpactBoom();
    else if (type === 'pop') audioEngine.playPop();
    else if (type === 'chime') audioEngine.playChime();
    else if (type === 'beep') audioEngine.playDigitalBeep();

    showToast(`Đã chèn hiệu ứng âm thanh "${name}" tại ${currentTime.toFixed(1)}s`, 'success');
  };

  const selectedSub = subtitles.find(s => s.id === selectedSubId);

  return (
    <div className="app-container">
      {/* BAR BÊN TRÁI: Tính năng & Hệ thống */}
      <aside className="collapsible-sidebar sidebar-left">
        <div className="sidebar-content">
          {/* Brand header */}
          <div className="sidebar-item" style={{ cursor: 'default', borderBottom: '1px solid #262626', marginBottom: '8px', paddingBottom: '12px' }}>
            <span className="sb-icon">🎬</span>
            <span className="sb-text font-bold text-white tracking-wide">Hendy Vietsub</span>
          </div>

          {/* Mục Dịch Vietsub AI */}
          <div 
            className="sidebar-item" 
            title="Dịch Vietsub AI"
            onClick={handleAutoVietsub}
          >
            <span className="sb-icon">🌐</span>
            <span className="sb-text">Dịch Vietsub AI</span>
          </div>

          {/* Mục Tiện ích mở rộng */}
          <div 
            className="sidebar-item" 
            title="Tiện ích mở rộng"
            onClick={() => setIsExtensionsOpen(true)}
          >
            <span className="sb-icon">🧩</span>
            <span className="sb-text">Tiện ích mở rộng</span>
          </div>

          {/* Mục Kịch Bản Video AI */}
          <div 
            className="sidebar-item" 
            title="Kịch Bản Video AI"
            onClick={() => setIsScriptModalOpen(true)}
          >
            <span className="sb-icon">📜</span>
            <span className="sb-text">Kịch Bản Video AI</span>
          </div>

          {/* Mục Cài đặt App đẩy xuống đáy */}
          <div 
            className="sidebar-item setup-app" 
            title={`Cài app (${getOsLabel()})`}
            onClick={handleInstallClick}
          >
            <span className="sb-icon">📥</span>
            <span className="sb-text">Cài app ({getOsLabel()})</span>
          </div>
        </div>
      </aside>

      {/* VÙNG LÀM VIỆC CHÍNH (Giữ nguyên Player và Timeline của bạn) */}
      <main className="main-content">
        {/* Toast Notification Box */}
        {toast && (
          <div className={`fixed top-4 right-16 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-700/60 shadow-emerald-950/50' 
              : toast.type === 'error'
              ? 'bg-red-950/95 text-red-200 border-red-700/60 shadow-red-950/50'
              : 'bg-neutral-900/95 text-blue-200 border-blue-800/60 shadow-black/60'
          }`}>
            {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* 1. Header */}
        <Header
          projectTitle={projectTitle}
          onTitleChange={setProjectTitle}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          resolution={resolution}
          onResolutionChange={setResolution}
          isMixerOpen={isMixerOpen}
          onToggleMixer={() => setIsMixerOpen(!isMixerOpen)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenScriptModal={() => setIsScriptModalOpen(true)}
          onOpenExtensions={() => setIsExtensionsOpen(true)}
          onAutoVietsub={handleAutoVietsub}
          onAutoAudioMix={handleAutoAudioMix}
          isProcessing={isProcessing}
          canUndo={historyIndex >= 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* 2. Main Studio Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Asset Sidebar */}
          <AssetSidebar
            onFileUpload={handleFileUpload}
            videoFile={videoFile}
            subtitles={subtitles}
            onBatchVoiceoverGenerated={() => setHasVoiceoverTrack(true)}
            onInsertSfx={handleInsertSfx}
            onOpenScriptModal={() => setIsScriptModalOpen(true)}
            showToast={showToast}
          />

          {/* Center: Canvas Viewport */}
          <CanvasPreview
            videoSrc={videoSrc}
            videoRef={videoRef}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            aspectRatio={aspectRatio}
            subtitles={subtitles}
            globalStyle={globalStyle}
            selectedSubId={selectedSubId}
            onSelectSubtitle={setSelectedSubId}
          />

          {/* Right: Inspector Panel */}
          <InspectorPanel
            selectedSub={selectedSub}
            onUpdateSub={handleUpdateSub}
            onDeleteSub={handleDeleteSubtitle}
            globalStyle={globalStyle}
            onUpdateGlobalStyle={(u) => setGlobalStyle(s => ({ ...s, ...u }))}
            videoSpeed={videoSpeed}
            onSpeedChange={setVideoSpeed}
            videoVolume={videoVolume}
            onVolumeChange={setVideoVolume}
            onSeek={seekTo}
            showToast={showToast}
          />
        </div>

        {/* 3. Bottom: Multi-Track Timeline */}
        <Timeline
          duration={duration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSeek={seekTo}
          subtitles={subtitles}
          selectedSubId={selectedSubId}
          onSelectSubtitle={setSelectedSubId}
          onUpdateSubtitle={handleUpdateSubtitleRange}
          onAddSubtitleAtPlayhead={handleAddSubtitleAtPlayhead}
          onSplitSubtitleAtPlayhead={handleSplitSubtitleAtPlayhead}
          onDeleteSelectedSubtitle={() => selectedSubId && handleDeleteSubtitle(selectedSubId)}
          videoFileName={videoFile?.name}
          hasVoiceoverTrack={hasVoiceoverTrack}
        />
      </main>

      {/* BAR BÊN PHẢI: Xử lý âm thanh & Hậu kỳ */}
      <aside className="collapsible-sidebar sidebar-right">
        <div className="sidebar-content">
          {/* Header */}
          <div className="sidebar-item" style={{ cursor: 'default', borderBottom: '1px solid #262626', marginBottom: '8px', paddingBottom: '12px' }}>
            <span className="sb-icon">🎛️</span>
            <span className="sb-text font-bold text-white tracking-wide">Studio Mixer</span>
          </div>

          {/* Mục Bộ trộn âm thanh */}
          <div 
            className={`sidebar-item ${isMixerOpen ? 'active' : ''}`} 
            title="Bộ trộn âm thanh (Audio Mixer)"
            onClick={() => setIsMixerOpen(!isMixerOpen)}
          >
            <span className="sb-icon">🎚️</span>
            <span className="sb-text">Bộ trộn âm thanh</span>
          </div>

          {/* Mục Cân bằng âm thanh AI */}
          <div 
            className="sidebar-item" 
            title="Cân Bằng Âm Thanh AI (-14 LUFS)"
            onClick={handleAutoAudioMix}
          >
            <span className="sb-icon">🪄</span>
            <span className="sb-text">Cân Bằng Âm AI</span>
          </div>

          {/* Mục Xuất Bản Video ở đáy */}
          <div 
            className="sidebar-item setup-app" 
            title="Xuất Bản & Render Video"
            onClick={() => setIsExportOpen(true)}
          >
            <span className="sb-icon">💾</span>
            <span className="sb-text">Xuất Bản & Render</span>
          </div>
        </div>
      </aside>

      {/* 4. Multi-Channel Audio Matrix Modal */}
      <MultiChannelAudioMixer
        isOpen={isMixerOpen}
        onClose={() => setIsMixerOpen(false)}
        audioSettings={audioSettings}
        onUpdateAudioSettings={(u) => setAudioSettings(s => ({ ...s, ...u }))}
        subtitleCount={subtitles.length}
        showToast={showToast}
      />

      {/* 5. Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        subtitles={subtitles}
        videoRef={videoRef}
        globalStyle={globalStyle}
        aspectRatio={aspectRatio}
        duration={duration}
        showToast={showToast}
      />

      {/* 6. AI Storyboard / Script Creation Modal */}
      <AiVideoCreationModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        onGenerated={handleScriptGenerated}
      />

      {/* 7. Chrome Extensions, Direct Translate & Audio Recognition Modal */}
      <ExtensionsModal
        isOpen={isExtensionsOpen}
        onClose={() => setIsExtensionsOpen(false)}
        currentTime={currentTime}
        onAddSubtitleToTimeline={(textVi, textOrig) => {
          const newId = Date.now();
          const start = Math.round(currentTime * 10) / 10;
          const end = Math.min(duration, Math.round((start + 3.0) * 10) / 10);
          const newSub: SubtitleSegment = {
            id: newId,
            start,
            end,
            text: textOrig || textVi,
            textOriginal: textOrig || textVi,
            textVi: textVi,
            translation: textVi,
          };
          updateSubtitlesWithHistory((prev) => [...prev, newSub].sort((a, b) => a.start - b.start));
          setSelectedSubId(newId);
          showToast('Đã chèn phụ đề từ Extension vào Timeline!', 'success');
        }}
      />
    </div>
  );
}

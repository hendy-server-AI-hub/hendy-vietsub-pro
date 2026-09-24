import React from 'react';
import { 
  MonitorPlay, Download, Sliders, Sparkles, Undo2, Redo2, 
  Smartphone, Monitor, Square, Check, RefreshCw, Laptop, Apple, Puzzle
} from 'lucide-react';
import { AspectRatioType } from '../types/editor';
import { usePWAInstall } from '../utils/usePWAInstall';

interface HeaderProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  aspectRatio: AspectRatioType;
  onAspectRatioChange: (ratio: AspectRatioType) => void;
  resolution: '720p' | '1080p' | '4K';
  onResolutionChange: (res: '720p' | '1080p' | '4K') => void;
  isMixerOpen: boolean;
  onToggleMixer: () => void;
  onOpenExport: () => void;
  onOpenScriptModal: () => void;
  onOpenExtensions: () => void;
  onAutoVietsub: () => void;
  onAutoAudioMix: () => void;
  isProcessing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function Header({
  projectTitle,
  onTitleChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  isMixerOpen,
  onToggleMixer,
  onOpenExport,
  onOpenScriptModal,
  onOpenExtensions,
  onAutoVietsub,
  onAutoAudioMix,
  isProcessing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HeaderProps) {
  const { isInstallable, isInstalled, os, promptInstall } = usePWAInstall();

  const getOsLabel = () => {
    switch (os) {
      case 'windows': return 'Windows';
      case 'mac': return 'macOS';
      case 'linux': return 'Linux';
      case 'ios': return 'iOS';
      case 'android': return 'Android';
      default: return 'Desktop';
    }
  };

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'manual-ios') {
      alert("Trên Safari iOS: Nhấn biểu tượng 'Chia sẻ' ở dưới cùng rồi chọn 'Thêm vào Màn hình chính' (Add to Home Screen).");
    }
  };

  return (
    <header className="h-14 bg-[#141414] border-b border-neutral-800 px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-white font-bold text-base tracking-wider">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MonitorPlay size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight text-sm font-black tracking-wide">
              HENDY<span className="text-blue-500">STUDIO</span>
            </span>
            <span className="text-[9px] font-mono text-neutral-400 font-normal">PRO CROSS-PLATFORM</span>
          </div>
        </div>

        <div className="h-5 w-px bg-neutral-800"></div>

        {/* Editable Title */}
        <input 
          type="text" 
          value={projectTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-transparent hover:bg-neutral-900 focus:bg-neutral-900 border border-transparent hover:border-neutral-800 focus:border-blue-500 rounded px-2.5 py-1 text-xs text-neutral-200 font-medium outline-none transition max-w-[180px] truncate"
          title="Nhấp để đổi tên dự án"
        />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-neutral-900/60 p-0.5 rounded border border-neutral-800">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className="p-1 hover:text-white disabled:opacity-30 text-neutral-400 rounded hover:bg-neutral-800 transition" 
            title={os === 'mac' ? "Hoàn tác (Cmd+Z)" : "Hoàn tác (Ctrl+Z)"}
          >
            <Undo2 size={13} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            className="p-1 hover:text-white disabled:opacity-30 text-neutral-400 rounded hover:bg-neutral-800 transition" 
            title={os === 'mac' ? "Làm lại (Cmd+Y)" : "Làm lại (Ctrl+Y)"}
          >
            <Redo2 size={13} />
          </button>
        </div>
      </div>

      {/* Aspect Ratio & Format Controls */}
      <div className="flex items-center gap-2">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-md p-0.5 text-[11px]">
          <button
            onClick={() => onAspectRatioChange('16:9')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
              aspectRatio === '16:9' ? 'bg-neutral-800 text-white font-medium shadow' : 'text-neutral-400 hover:text-white'
            }`}
            title="16:9 Landscape (YouTube, Ngang)"
          >
            <Monitor size={12} />
            <span>16:9</span>
          </button>

          <button
            onClick={() => onAspectRatioChange('9:16')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
              aspectRatio === '9:16' ? 'bg-neutral-800 text-white font-medium shadow' : 'text-neutral-400 hover:text-white'
            }`}
            title="9:16 Vertical (Shorts, TikTok, Dọc)"
          >
            <Smartphone size={12} />
            <span>9:16</span>
          </button>

          <button
            onClick={() => onAspectRatioChange('1:1')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition ${
              aspectRatio === '1:1' ? 'bg-neutral-800 text-white font-medium shadow' : 'text-neutral-400 hover:text-white'
            }`}
            title="1:1 Square (Vuông)"
          >
            <Square size={11} />
            <span>1:1</span>
          </button>
        </div>

        {/* Resolution Selector */}
        <select
          value={resolution}
          onChange={(e) => onResolutionChange(e.target.value as any)}
          className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500"
        >
          <option value="720p">720p HD</option>
          <option value="1080p">1080p Full HD</option>
          <option value="4K">4K Cinema</option>
        </select>
      </div>

      {/* Action Buttons & Install App for all OS */}
      <div className="flex items-center gap-2">
        {/* Cross-Platform PWA Native App Install Button */}
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-blue-500/50 text-neutral-300 hover:text-white text-xs transition"
            title={`Cài đặt ứng dụng Hendy Studio cho ${getOsLabel()}`}
          >
            <Laptop size={13} className="text-blue-400" />
            <span className="font-medium">Cài app ({getOsLabel()})</span>
          </button>
        )}

        {/* Extensions & Chrome Store Modal */}
        <button
          onClick={onOpenExtensions}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-purple-500/50 text-neutral-300 hover:text-white text-xs transition"
          title="Tiện ích mở rộng Chrome & Dịch trực tiếp"
        >
          <Puzzle size={13} className="text-purple-400" />
          <span>Extensions</span>
        </button>

        {/* Quick AI Subtitle */}
        <button
          onClick={onAutoVietsub}
          disabled={isProcessing}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition disabled:opacity-50"
          title="Tự động dịch chuẩn điện ảnh bằng Gemini AI"
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>Dịch Vietsub AI</span>
        </button>

        {/* Script generator */}
        <button
          onClick={onOpenScriptModal}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition"
        >
          <span>Kịch Bản AI</span>
        </button>

        {/* Multi-Channel Audio Mixer toggle */}
        <button
          onClick={onToggleMixer}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition ${
            isMixerOpen 
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' 
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
          }`}
          title="Bật/Tắt bàn trộn âm thanh 4 kênh & VU Meters"
        >
          <Sliders size={13} />
          <span>Audio Mixer</span>
        </button>

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800/60 animate-pulse font-mono">
            <RefreshCw size={12} className="animate-spin" />
            <span>AI Processing...</span>
          </div>
        )}

        {/* Export & Render Button */}
        <button
          onClick={onOpenExport}
          disabled={isProcessing}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-1.5 rounded-md shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
        >
          <Download size={13} />
          <span>Xuất Bản & Render</span>
        </button>
      </div>
    </header>
  );
}

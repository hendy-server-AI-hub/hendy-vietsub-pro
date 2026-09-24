import React, { useState } from 'react';
import { 
  Download, FileText, Film, X, Code2, 
  Laptop, Check, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import { SubtitleSegment, SubtitleStyle, AspectRatioType } from '../types/editor';
import { exportToSRT, exportToVTT, exportToASS, downloadFile } from '../utils/subtitleExporter';
import { videoRenderer } from '../utils/videoRenderer';
import { triggerAppDownload } from '../utils/appDownloader';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleSegment[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  globalStyle: SubtitleStyle;
  aspectRatio: AspectRatioType;
  duration: number;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ExportModal({
  isOpen,
  onClose,
  subtitles,
  videoRef,
  globalStyle,
  aspectRatio,
  duration,
  showToast,
}: ExportModalProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  if (!isOpen) return null;

  // SRT export
  const handleExportSRT = () => {
    const srtContent = exportToSRT(subtitles);
    downloadFile(srtContent, 'vietsub-hendy-pro.srt', 'text/plain');
    showToast('Đã xuất tệp phụ đề .SRT thành công!', 'success');
  };

  // VTT export
  const handleExportVTT = () => {
    const vttContent = exportToVTT(subtitles);
    downloadFile(vttContent, 'vietsub-hendy-pro.vtt', 'text/vtt');
    showToast('Đã xuất tệp phụ đề .VTT thành công!', 'success');
  };

  // ASS export
  const handleExportASS = () => {
    const assContent = exportToASS(subtitles);
    downloadFile(assContent, 'vietsub-hendy-pro.ass', 'text/plain');
    showToast('Đã xuất tệp Aegisub .ASS thành công!', 'success');
  };

  // Real-time Canvas Video Render directly in browser
  const handleRenderVideo = async () => {
    try {
      setIsRendering(true);
      setRenderProgress(0);
      showToast('Bắt đầu Render video & khắc phụ đề Canvas...', 'info');

      const blob = await videoRenderer.renderAndExport({
        videoElement: videoRef.current,
        subtitles,
        globalStyle,
        aspectRatio,
        duration: Math.max(duration, 5),
        onProgress: (p) => setRenderProgress(p),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hendy_vietsub_render_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Render video thành công và đã tải về máy!', 'success');
      onClose();
    } catch (err: any) {
      if (!err.message?.includes('hủy')) {
        showToast(`Lỗi render: ${err.message}`, 'error');
      }
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Xuất Bản Video & Tệp Phụ Đề</h3>
              <p className="text-xs text-neutral-400">Chọn định dạng xuất bản mong muốn</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>

        {/* Real-time Render Progress */}
        {isRendering ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center space-y-3">
            <Loader2 size={28} className="text-blue-500 animate-spin mx-auto" />
            <div className="text-sm font-bold text-white">Đang xử lý Video & Khắc Phụ Đề...</div>
            <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${renderProgress}%` }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-150"
              />
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
              <span>Khung hình & âm thanh Canvas</span>
              <span className="font-bold text-blue-400">{renderProgress}%</span>
            </div>
            <button
              onClick={() => videoRenderer.cancel()}
              className="mt-2 px-3 py-1 bg-neutral-800 hover:bg-red-950/60 hover:text-red-400 text-neutral-400 rounded text-xs transition"
            >
              Hủy Render
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* 1. Direct Canvas MP4/WebM Burn-in Render */}
            <button
              onClick={handleRenderVideo}
              className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-3.5 rounded-xl transition shadow-lg shadow-blue-900/30 group"
            >
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="text-sm font-bold">Render Video Hardcode Vietsub</div>
                  <div className="text-xs text-blue-200">Khắc phụ đề trực tiếp vào video (Canvas WebM/VP9 1080p)</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-blue-200" />
            </button>

            {/* 2. SRT */}
            <button
              onClick={handleExportSRT}
              className="flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 text-neutral-200 p-3 rounded-xl border border-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Tệp phụ đề chuẩn quốc tế (.SRT)</div>
                  <div className="text-[11px] text-neutral-400">Tương thích CapCut, Premiere, YouTube, VLC</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-neutral-400" />
            </button>

            {/* 3. VTT */}
            <button
              onClick={handleExportVTT}
              className="flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 text-neutral-200 p-3 rounded-xl border border-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Tệp WebVTT (.VTT)</div>
                  <div className="text-[11px] text-neutral-400">Phụ đề chuẩn web HTML5 video streaming</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-neutral-400" />
            </button>

            {/* 4. Aegisub ASS */}
            <button
              onClick={handleExportASS}
              className="flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 text-neutral-200 p-3 rounded-xl border border-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Tệp Aegisub (.ASS)</div>
                  <div className="text-[11px] text-neutral-400">Lưu giữ phông chữ, màu sắc và hiệu ứng vị trí</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-neutral-400" />
            </button>

            {/* 5. Desktop Native App Launchers for all Operating Systems */}
            <div className="bg-neutral-900/60 rounded-xl border border-neutral-800/80 p-3">
              <div className="text-[11px] font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span>Cài Đặt Ứng Dụng Cho Mọi Hệ Điều Hành:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                <button
                  onClick={() => {
                    const res = triggerAppDownload('pwa');
                    showToast(res.message, 'info');
                  }}
                  className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium text-center transition"
                  title="Cài đặt PWA Native App"
                >
                  ⚡ PWA App
                </button>
                <button
                  onClick={() => {
                    const res = triggerAppDownload('windows');
                    showToast(res.message, 'info');
                  }}
                  className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium text-center transition"
                  title="Tải launcher Windows (.bat)"
                >
                  🪟 Windows
                </button>
                <button
                  onClick={() => {
                    const res = triggerAppDownload('mac');
                    showToast(res.message, 'info');
                  }}
                  className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium text-center transition"
                  title="Tải launcher macOS (.command)"
                >
                  🍏 macOS
                </button>
                <button
                  onClick={() => {
                    const res = triggerAppDownload('linux');
                    showToast(res.message, 'info');
                  }}
                  className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium text-center transition"
                  title="Tải launcher Linux (.desktop)"
                >
                  🐧 Linux
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

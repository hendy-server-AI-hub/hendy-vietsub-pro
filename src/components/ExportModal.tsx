import React from 'react';
import { Download, FileText, Film, X } from 'lucide-react';
import { SubtitleSegment } from '../types/editor';
import { exportToSRT, downloadFile } from '../utils/subtitleExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleSegment[];
}

export default function ExportModal({ isOpen, onClose, subtitles }: ExportModalProps) {
  if (!isOpen) return null;

  const handleExportSRT = () => {
    const srtContent = exportToSRT(subtitles);
    downloadFile(srtContent, 'vietsub-capcut-pro.srt', 'text/plain');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" /> Xuất bản Video & Phụ đề
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExportSRT}
            className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-lg border border-slate-700 transition"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <div className="text-sm font-medium">Xuất tệp phụ đề (.SRT)</div>
                <div className="text-xs text-slate-400">Định dạng phụ đề tiêu chuẩn</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          <button className="flex items-center justify-between bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg transition font-medium">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              <span>Render MP4 Hardcode Vietsub</span>
            </div>
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

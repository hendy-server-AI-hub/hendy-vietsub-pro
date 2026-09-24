import React, { useState } from 'react';
import { 
  Sparkles, Type, Sliders, Volume2, Wand2, Mic, 
  Trash2, Plus, Play, Check, RefreshCw, Palette, AlignCenter
} from 'lucide-react';
import { SubtitleSegment, SubtitleStyle } from '../types/editor';
import { apiService } from '../apiService';
import { audioEngine } from '../utils/audioEngine';

interface InspectorPanelProps {
  selectedSub: SubtitleSegment | undefined;
  onUpdateSub: (id: number | string, updates: Partial<SubtitleSegment>) => void;
  onDeleteSub: (id: number | string) => void;
  globalStyle: SubtitleStyle;
  onUpdateGlobalStyle: (updates: Partial<SubtitleStyle>) => void;
  videoSpeed: number;
  onSpeedChange: (speed: number) => void;
  videoVolume: number;
  onVolumeChange: (vol: number) => void;
  onSeek: (time: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function InspectorPanel({
  selectedSub,
  onUpdateSub,
  onDeleteSub,
  globalStyle,
  onUpdateGlobalStyle,
  videoSpeed,
  onSpeedChange,
  videoVolume,
  onVolumeChange,
  onSeek,
  showToast,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'vietsub' | 'style' | 'clip'>('vietsub');
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  // Micro-nudge helper
  const nudgeTime = (field: 'start' | 'end', delta: number) => {
    if (!selectedSub) return;
    const newVal = Math.max(0, Math.round((selectedSub[field] + delta) * 100) / 100);
    onUpdateSub(selectedSub.id, { [field]: newVal });
  };

  // Enhance Vietnamese (Diacritics & Cinema phrasing)
  const handleEnhanceVietnamese = async () => {
    if (!selectedSub) return;
    const originalText = selectedSub.textVi || selectedSub.text || '';
    if (!originalText.trim()) return;

    try {
      setIsAiPolishing(true);
      showToast('Gemini đang phục hồi dấu thanh & trau chuốt câu từ...', 'info');
      const enhanced = await apiService.enhanceVietnamese(originalText, 'cinema');
      onUpdateSub(selectedSub.id, { textVi: enhanced });
      showToast('Đã trau chuốt câu phụ đề thành công!', 'success');
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsAiPolishing(false);
    }
  };

  // Speak this single subtitle
  const handlePlayVoiceover = async () => {
    if (!selectedSub) return;
    const textToSpeak = selectedSub.textVi || selectedSub.translation || selectedSub.text || '';
    if (!textToSpeak.trim()) return;

    try {
      setIsTtsPlaying(true);
      // Try Web Speech API client synthesis first for instant zero-latency feedback
      await audioEngine.speakClientSpeech(textToSpeak, 'vi-VN');
    } catch (e) {
      console.warn('TTS error:', e);
    } finally {
      setIsTtsPlaying(false);
    }
  };

  const fontOptions = [
    { label: 'Inter (Hiện đại)', value: 'Inter, sans-serif' },
    { label: 'Montserrat (Đậm đà)', value: 'Montserrat, sans-serif' },
    { label: 'Cinzel (Điện ảnh cổ điển)', value: 'Cinzel, serif' },
    { label: 'Be Vietnam Pro (Việt hóa đẹp)', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Impact (Meme & Nổi bật)', value: 'Impact, sans-serif' },
  ];

  const colorPresets = ['#FACC15', '#FFFFFF', '#38BDF8', '#4ADE80', '#F43F5E', '#A855F7'];

  return (
    <div className="w-[360px] bg-[#141414] border-l border-neutral-800 flex flex-col z-10 shadow-2xl select-none">
      {/* Tabs Header */}
      <div className="flex bg-[#0f0f0f] border-b border-neutral-800 pt-2 px-2 gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('vietsub')}
          className={`flex-1 py-1.5 rounded-t text-center transition ${
            activeTab === 'vietsub' ? 'bg-[#141414] text-white border-t-2 border-blue-500 font-semibold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Phụ Đề & AI
        </button>

        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-1.5 rounded-t text-center transition ${
            activeTab === 'style' ? 'bg-[#141414] text-white border-t-2 border-blue-500 font-semibold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Giao Diện Chữ
        </button>

        <button
          onClick={() => setActiveTab('clip')}
          className={`flex-1 py-1.5 rounded-t text-center transition ${
            activeTab === 'clip' ? 'bg-[#141414] text-white border-t-2 border-blue-500 font-semibold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Tốc Độ & Volume
        </button>
      </div>

      {/* Tab 1: Vietsub Inspector */}
      {activeTab === 'vietsub' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedSub ? (
            <>
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-neutral-800 text-blue-400 font-mono text-[10px] px-2 py-0.5 rounded">
                    Clip #{selectedSub.id}
                  </span>
                  <span className="text-neutral-400 text-xs">
                    Thời lượng: {Math.max(0, selectedSub.end - selectedSub.start).toFixed(2)}s
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSeek(selectedSub.start)}
                    className="p-1 hover:text-white text-neutral-400 rounded hover:bg-neutral-800"
                    title="Nhảy tới clip này"
                  >
                    <Play size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteSub(selectedSub.id)}
                    className="p-1 hover:text-red-400 text-neutral-500 rounded hover:bg-neutral-800"
                    title="Xóa câu này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Timestamp Nudgers */}
              <div className="grid grid-cols-2 gap-3 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 text-xs font-mono">
                <div>
                  <label className="text-neutral-400 block mb-1 text-[10px] uppercase tracking-wider">Bắt đầu (Start)</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => nudgeTime('start', -0.1)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300">-0.1s</button>
                    <span className="flex-1 text-center font-bold text-cyan-400">{selectedSub.start.toFixed(2)}s</span>
                    <button onClick={() => nudgeTime('start', 0.1)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300">+0.1s</button>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 text-[10px] uppercase tracking-wider">Kết thúc (End)</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => nudgeTime('end', -0.1)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300">-0.1s</button>
                    <span className="flex-1 text-center font-bold text-cyan-400">{selectedSub.end.toFixed(2)}s</span>
                    <button onClick={() => nudgeTime('end', 0.1)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300">+0.1s</button>
                  </div>
                </div>
              </div>

              {/* Vietnamese Text Box */}
              <div>
                <label className="text-neutral-300 text-xs font-semibold block mb-1.5 flex items-center justify-between">
                  <span>Lời dịch tiếng Việt (Vietsub)</span>
                  <span className="text-[10px] text-yellow-500 font-mono">Hiển thị màn hình</span>
                </label>
                <textarea
                  value={selectedSub.textVi || ''}
                  onChange={(e) => onUpdateSub(selectedSub.id, { textVi: e.target.value })}
                  placeholder="Nhập nội dung phụ đề tiếng Việt..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-500 text-yellow-400 font-medium text-xs rounded-lg p-2.5 outline-none resize-none h-20 transition"
                />
              </div>

              {/* Original Text Box */}
              <div>
                <label className="text-neutral-400 text-xs font-medium block mb-1">
                  Văn bản gốc (Original text)
                </label>
                <input
                  type="text"
                  value={selectedSub.textOriginal || selectedSub.text || ''}
                  onChange={(e) => onUpdateSub(selectedSub.id, { textOriginal: e.target.value })}
                  placeholder="Câu gốc trong video..."
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-neutral-400 text-xs rounded-lg p-2 outline-none"
                />
              </div>

              {/* Quick AI Actions for this Subtitle */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <button
                  onClick={handleEnhanceVietnamese}
                  disabled={isAiPolishing}
                  className="w-full py-2 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-800/60 text-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isAiPolishing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} className="text-amber-400" />}
                  <span>Phục Hồi Dấu & Nâng Cấp Điện Ảnh</span>
                </button>

                <button
                  onClick={handlePlayVoiceover}
                  disabled={isTtsPlaying}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <Mic size={13} className="text-purple-400" />
                  <span>{isTtsPlaying ? 'Đang đọc...' : 'Nghe thử Giọng Đọc AI'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-neutral-500 text-xs">
              <Type size={32} className="mx-auto mb-3 opacity-30" />
              <p>Chọn một câu phụ đề trên Timeline để chỉnh sửa mốc thời gian và câu từ.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Subtitle Styling Inspector */}
      {activeTab === 'style' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Font Family */}
          <div>
            <label className="text-neutral-300 font-medium block mb-1.5">Phông chữ (Font Family)</label>
            <select
              value={globalStyle.fontFamily}
              onChange={(e) => onUpdateGlobalStyle({ fontFamily: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 outline-none focus:border-blue-500"
            >
              {fontOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-neutral-300 font-medium">Cỡ chữ (Font Size)</label>
              <span className="font-mono text-neutral-400">{globalStyle.fontSize}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="72"
              value={globalStyle.fontSize}
              onChange={(e) => onUpdateGlobalStyle({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Text Color & Presets */}
          <div>
            <label className="text-neutral-300 font-medium block mb-1.5">Màu chữ chính</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={globalStyle.textColor}
                onChange={(e) => onUpdateGlobalStyle({ textColor: e.target.value })}
                className="w-8 h-8 rounded border border-neutral-700 cursor-pointer bg-transparent"
              />
              <span className="font-mono text-neutral-400 uppercase">{globalStyle.textColor}</span>
            </div>
            <div className="flex gap-2">
              {colorPresets.map(c => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  onClick={() => onUpdateGlobalStyle({ textColor: c })}
                  className="w-6 h-6 rounded-full border border-black/40 shadow-sm hover:scale-110 transition"
                />
              ))}
            </div>
          </div>

          {/* Stroke / Outline */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-neutral-300 font-medium">Độ dày viền (Stroke)</label>
              <span className="font-mono text-neutral-400">{globalStyle.strokeWidth}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              value={globalStyle.strokeWidth}
              onChange={(e) => onUpdateGlobalStyle({ strokeWidth: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-blue-500 mb-2"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={globalStyle.strokeColor}
                onChange={(e) => onUpdateGlobalStyle({ strokeColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 cursor-pointer bg-transparent"
              />
              <span className="text-neutral-400 text-[11px]">Màu viền chữ</span>
            </div>
          </div>

          {/* Shadow & Glow */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-neutral-300 font-medium">Độ nhòe bóng (Shadow Glow)</label>
              <span className="font-mono text-neutral-400">{globalStyle.shadowBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={globalStyle.shadowBlur}
              onChange={(e) => onUpdateGlobalStyle({ shadowBlur: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Background Box */}
          <div>
            <label className="text-neutral-300 font-medium block mb-1.5">Khung nền chữ (Background Box)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateGlobalStyle({ bgColor: 'transparent' })}
                className={`py-1.5 px-2 rounded border text-center transition ${
                  globalStyle.bgColor === 'transparent' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Không có khung
              </button>
              <button
                onClick={() => onUpdateGlobalStyle({ bgColor: 'rgba(0, 0, 0, 0.75)' })}
                className={`py-1.5 px-2 rounded border text-center transition ${
                  globalStyle.bgColor !== 'transparent' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Khung đen mờ 75%
              </button>
            </div>
          </div>

          {/* Position Y */}
          <div>
            <label className="text-neutral-300 font-medium block mb-1.5">Vị trí hiển thị (Position Y)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateGlobalStyle({ positionY: 'bottom' })}
                className={`py-1.5 rounded border text-center transition ${
                  globalStyle.positionY === 'bottom' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Dưới cùng
              </button>
              <button
                onClick={() => onUpdateGlobalStyle({ positionY: 'center' })}
                className={`py-1.5 rounded border text-center transition ${
                  globalStyle.positionY === 'center' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Chính giữa
              </button>
              <button
                onClick={() => onUpdateGlobalStyle({ positionY: 'top' })}
                className={`py-1.5 rounded border text-center transition ${
                  globalStyle.positionY === 'top' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Trên cùng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Clip & Playback Inspector */}
      {activeTab === 'clip' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Playback Speed */}
          <div>
            <label className="text-neutral-300 font-medium block mb-2">Tốc độ phát (Playback Speed)</label>
            <div className="grid grid-cols-3 gap-2">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onSpeedChange(rate)}
                  className={`py-2 rounded border font-mono transition ${
                    videoSpeed === rate ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Master Video Volume */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Volume2 size={14} className="text-blue-400" />
                <span>Âm lượng video gốc</span>
              </label>
              <span className="font-mono text-neutral-400">{Math.round(videoVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={videoVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

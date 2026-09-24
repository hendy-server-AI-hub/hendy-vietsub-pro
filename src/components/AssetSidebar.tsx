import React, { useState, useRef } from 'react';
import { 
  FileVideo, Volume2, Wand2, Mic, Film, Bookmark, 
  UploadCloud, Sparkles, Play, Plus, RefreshCw, Camera, 
  StopCircle, Check, Copy, Bell, Zap, Radio
} from 'lucide-react';
import { SubtitleSegment } from '../types/editor';
import { audioEngine } from '../utils/audioEngine';
import { apiService } from '../apiService';
import { generateBookmarkletCode } from '../utils/bookmarklet';

interface AssetSidebarProps {
  onFileUpload: (file: File) => void;
  videoFile: File | null;
  subtitles: SubtitleSegment[];
  onBatchVoiceoverGenerated: () => void;
  onInsertSfx: (type: string, name: string) => void;
  onOpenScriptModal: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AssetSidebar({
  onFileUpload,
  videoFile,
  subtitles,
  onBatchVoiceoverGenerated,
  onInsertSfx,
  onOpenScriptModal,
  showToast,
}: AssetSidebarProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'voiceover' | 'sfx' | 'record' | 'bookmarklet'>('media');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedStream, setRecordedStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isGeneratingAllTts, setIsGeneratingAllTts] = useState(false);

  // File upload input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // Built-in Demo Video Generator (Creates an instant demo video with canvas)
  const handleLoadDemoVideo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw cinematic canvas animation to stream
    let hue = 210;
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const demoFile = new File([blob], 'Cyberpunk_Trailer_Demo.webm', { type: 'video/webm' });
      onFileUpload(demoFile);
      showToast('Đã nạp video demo Cinematic vào dự án!', 'success');
    };

    rec.start();
    let frame = 0;
    const draw = () => {
      ctx.fillStyle = `hsl(${hue + frame * 0.5}, 60%, 15%)`;
      ctx.fillRect(0, 0, 1280, 720);

      // Draw grid
      ctx.strokeStyle = `hsla(${hue + frame}, 80%, 60%, 0.2)`;
      ctx.lineWidth = 2;
      for (let x = 0; x < 1280; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HENDY VIETSUB STUDIO DEMO', 640, 360);

      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Frame ${frame} • AI Studio Cinematic Sample`, 640, 420);

      frame++;
      if (frame < 120) {
        requestAnimationFrame(draw);
      } else {
        rec.stop();
      }
    };
    draw();
  };

  // Start in-browser webcam / mic recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setRecordedStream(stream);
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setRecordedStream(null);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `Webcam_Record_${Date.now()}.webm`, { type: 'video/webm' });
        onFileUpload(file);
        showToast('Đã lưu bản ghi hình vào dự án!', 'success');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      showToast('Bắt đầu quay video trực tiếp...', 'info');
    } catch (err: any) {
      showToast(`Không thể truy cập camera/micro: ${err.message}`, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Batch AI Voiceover for all subtitles
  const handleBatchVoiceover = async () => {
    if (subtitles.length === 0) {
      showToast('Chưa có phụ đề nào để tạo giọng đọc!', 'error');
      return;
    }
    try {
      setIsGeneratingAllTts(true);
      showToast('Đang tạo giọng đọc AI cho toàn bộ timeline...', 'info');

      for (const sub of subtitles) {
        const text = sub.textVi || sub.translation || sub.text;
        if (text) {
          // Speak or pre-cache
          await apiService.generateGeminiTTS(text, selectedVoice);
        }
      }

      onBatchVoiceoverGenerated();
      showToast(`Đã lồng tiếng thành công ${subtitles.length} câu phụ đề!`, 'success');
    } catch (err: any) {
      showToast(`Lỗi lồng tiếng: ${err.message}`, 'error');
    } finally {
      setIsGeneratingAllTts(false);
    }
  };

  return (
    <div className="w-72 bg-[#121212] border-r border-neutral-800 flex select-none">
      {/* Mini Icon Strip */}
      <div className="w-14 bg-[#0d0d0d] border-r border-neutral-800/80 flex flex-col items-center py-3 gap-2 flex-shrink-0">
        <NavIconButton
          icon={<FileVideo size={18} />}
          label="Media"
          active={activeTab === 'media'}
          onClick={() => setActiveTab('media')}
        />
        <NavIconButton
          icon={<Mic size={18} />}
          label="Lồng tiếng"
          active={activeTab === 'voiceover'}
          onClick={() => setActiveTab('voiceover')}
        />
        <NavIconButton
          icon={<Bell size={18} />}
          label="Sound FX"
          active={activeTab === 'sfx'}
          onClick={() => setActiveTab('sfx')}
        />
        <NavIconButton
          icon={<Camera size={18} />}
          label="Ghi hình"
          active={activeTab === 'record'}
          onClick={() => setActiveTab('record')}
        />
        <NavIconButton
          icon={<Bookmark size={18} />}
          label="Tiện ích"
          active={activeTab === 'bookmarklet'}
          onClick={() => setActiveTab('bookmarklet')}
        />
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 text-xs">
        {/* Tab 1: Media Bin */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-neutral-200">Kho Tài Nguyên</span>
              <span className="text-[10px] text-neutral-500 font-mono">Dự án</span>
            </div>

            {/* Upload Box */}
            <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-neutral-700 hover:border-blue-500 hover:bg-blue-900/10 rounded-xl cursor-pointer transition text-center p-2 group">
              <UploadCloud size={24} className="text-neutral-500 group-hover:text-blue-400 mb-1.5 transition" />
              <span className="text-neutral-300 group-hover:text-blue-400 font-medium text-[11px]">Nhấp tải video lên</span>
              <span className="text-[9px] text-neutral-500 mt-0.5">MP4, WEBM, MOV, MKV</span>
              <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleInputChange} />
            </label>

            {/* Load Instant Demo Sample */}
            <button
              onClick={handleLoadDemoVideo}
              className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition font-medium"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Nạp Video Demo Mẫu</span>
            </button>

            {/* Active Video File Card */}
            <div>
              <div className="text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-wider">Tệp trong Timeline</div>
              {videoFile ? (
                <div className="flex items-center gap-2.5 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Film size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-neutral-200 font-medium truncate text-[11px]">{videoFile.name}</div>
                    <div className="text-[10px] text-emerald-400">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Đã sẵn sàng</div>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-500 italic text-[11px] text-center py-4 border border-neutral-900 rounded-lg">
                  Chưa có video nào. Bạn có thể bấm "Nạp Video Demo Mẫu" để trải nghiệm ngay.
                </div>
              )}
            </div>

            {/* Script generator entry */}
            <div className="pt-2 border-t border-neutral-800">
              <button
                onClick={onOpenScriptModal}
                className="w-full py-2 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 hover:from-blue-900/50 hover:to-indigo-900/50 border border-blue-800/40 text-blue-300 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Tạo Kịch Bản Phim AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: AI Voiceover (TTS) */}
        {activeTab === 'voiceover' && (
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-2">
              <span className="font-bold text-neutral-200">Lồng Tiếng AI (TTS)</span>
              <p className="text-[10px] text-neutral-400 mt-0.5">Gemini 3.8 Flash TTS & Cloudflare MeloTTS</p>
            </div>

            <div>
              <label className="text-neutral-300 font-medium block mb-1">Giọng diễn viên AI</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg p-2 outline-none"
              >
                <option value="Puck">Nam Miền Bắc (Trầm ấm, Phim truyện)</option>
                <option value="Charon">Nam Miền Nam (Tự nhiên, Phóng sự)</option>
                <option value="Aoede">Nữ Miền Bắc (Truyền cảm, Review)</option>
                <option value="Fenrir">Cinematic Trailer (Kịch tính, Trailer)</option>
                <option value="Cloudflare-Vi">Cloudflare MeloTTS (Tiếng Việt)</option>
              </select>
            </div>

            <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-300">Đặc tính âm thanh:</div>
              <ul className="text-[10px] text-neutral-400 space-y-1 list-disc pl-4">
                <li>Tự động khớp mốc giây phụ đề.</li>
                <li>Tự động kích hoạt giảm âm lượng BGM (Auto-Ducking).</li>
                <li>Hỗ trợ chuyển tiếp Web Speech API khi offline.</li>
              </ul>
            </div>

            <button
              onClick={handleBatchVoiceover}
              disabled={isGeneratingAllTts}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              {isGeneratingAllTts ? <RefreshCw size={13} className="animate-spin" /> : <Mic size={14} />}
              <span>Lồng Tiếng Toàn Bộ Phụ Đề</span>
            </button>
          </div>
        )}

        {/* Tab 3: Sound FX Library */}
        {activeTab === 'sfx' && (
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-2">
              <span className="font-bold text-neutral-200">Hiệu Ứng Âm Thanh (SFX)</span>
              <p className="text-[10px] text-neutral-400 mt-0.5">Tổng hợp âm thanh thủ tục Web Audio API</p>
            </div>

            <div className="space-y-2">
              <SfxCard
                title="Cinematic Whoosh"
                desc="Chuyển cảnh điện ảnh mượt mà"
                onPlay={() => audioEngine.playWhoosh()}
                onInsert={() => onInsertSfx('whoosh', 'Cinematic Whoosh')}
              />

              <SfxCard
                title="Sub-Bass Impact Boom"
                desc="Cú đập kịch tính, nhấn mạnh tình tiết"
                onPlay={() => audioEngine.playImpactBoom()}
                onInsert={() => onInsertSfx('impact', 'Sub Impact Boom')}
              />

              <SfxCard
                title="Pop Transition"
                desc="Hiệu ứng pop-in xuất hiện chữ vui nhộn"
                onPlay={() => audioEngine.playPop()}
                onInsert={() => onInsertSfx('pop', 'Pop Sound')}
              />

              <SfxCard
                title="Chime Notification"
                desc="Giai điệu thông báo thanh lịch"
                onPlay={() => audioEngine.playChime()}
                onInsert={() => onInsertSfx('chime', 'Chime Bell')}
              />

              <SfxCard
                title="Digital Beep"
                desc="Âm thanh công nghệ, gõ chữ máy tính"
                onPlay={() => audioEngine.playDigitalBeep()}
                onInsert={() => onInsertSfx('beep', 'Digital Beep')}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Direct Recorder */}
        {activeTab === 'record' && (
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-2">
              <span className="font-bold text-neutral-200">Ghi Hình Trực Tiếp</span>
              <p className="text-[10px] text-neutral-400 mt-0.5">Quay Webcam & Thu âm Micro vào Timeline</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center mx-auto mb-3 text-red-400">
                <Camera size={20} />
              </div>
              <p className="text-neutral-300 font-medium mb-1">Ghi hình trực tiếp</p>
              <p className="text-[10px] text-neutral-500 mb-4">Sử dụng camera của máy tính để quay clip review hoặc lồng tiếng trực tiếp.</p>

              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 animate-pulse transition"
                >
                  <StopCircle size={14} />
                  <span>Dừng Quay & Nhập Vào Dự Án</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <Camera size={14} />
                  <span>Bắt Đầu Ghi Hình</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Bookmarklet */}
        {activeTab === 'bookmarklet' && (
          <div className="space-y-4 text-neutral-300">
            <div className="border-b border-neutral-800 pb-2">
              <span className="font-bold text-neutral-200">Bookmarklet Overlay</span>
              <p className="text-[10px] text-neutral-400 mt-0.5">Dịch phụ đề trực tuyến trên YouTube/Netflix</p>
            </div>

            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Kéo nút bên dưới vào thanh Bookmark của trình duyệt để hiển thị phụ đề nổi khi xem video:
            </p>

            <div
              className="mb-2"
              dangerouslySetInnerHTML={{
                __html: `<a href="${generateBookmarkletCode(typeof window !== 'undefined' ? window.location.origin : '')}" class="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-center block shadow transition cursor-grab select-none">⭐ Hendy Vietsub Overlay</a>`
              }}
            />

            <button
              type="button"
              onClick={() => {
                const code = generateBookmarkletCode(window.location.origin);
                navigator.clipboard.writeText(code);
                showToast("Đã sao chép mã Bookmarklet vào bộ nhớ tạm!", 'success');
              }}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 flex items-center justify-center gap-1.5 transition text-[11px]"
            >
              <Copy size={12} />
              <span>Sao chép mã Bookmarklet</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NavIconButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition ${
        active 
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' 
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
      }`}
      title={label}
    >
      {icon}
      <span className="text-[8px] font-medium tracking-tight truncate max-w-[36px]">{label}</span>
    </button>
  );
}

function SfxCard({ title, desc, onPlay, onInsert }: { title: string; desc: string; onPlay: () => void; onInsert: () => void }) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 p-2.5 rounded-lg flex items-center justify-between">
      <div className="min-w-0 flex-1 pr-2">
        <div className="font-semibold text-neutral-200 text-[11px] truncate">{title}</div>
        <div className="text-[9px] text-neutral-500 truncate">{desc}</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onPlay}
          className="p-1 hover:text-white text-neutral-400 hover:bg-neutral-800 rounded transition"
          title="Nghe thử"
        >
          <Play size={12} />
        </button>
        <button
          onClick={onInsert}
          className="p-1 hover:text-blue-400 text-neutral-400 hover:bg-neutral-800 rounded transition"
          title="Chèn vào Timeline"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

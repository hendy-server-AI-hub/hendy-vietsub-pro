import React, { useState, useEffect } from 'react';
import { 
  Sliders, Volume2, VolumeX, Sparkles, X, 
  Activity, ShieldCheck, RefreshCw, Music, Mic, Film, Bell
} from 'lucide-react';
import { AudioTrackSettings } from '../types/editor';
import { audioEngine } from '../utils/audioEngine';
import { apiService } from '../apiService';

interface MultiChannelAudioMixerProps {
  isOpen: boolean;
  onClose: () => void;
  audioSettings: AudioTrackSettings;
  onUpdateAudioSettings: (updates: Partial<AudioTrackSettings>) => void;
  subtitleCount: number;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function MultiChannelAudioMixer({
  isOpen,
  onClose,
  audioSettings,
  onUpdateAudioSettings,
  subtitleCount,
  showToast,
}: MultiChannelAudioMixerProps) {
  const [isAiBalancing, setIsAiBalancing] = useState(false);
  const [meterLevels, setMeterLevels] = useState({ master: 35, voice: 45, bgm: 20 });

  // Real-time meter animation loop
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const real = audioEngine.getMeterLevels();
      // Add dynamic subtle jitter for visualization if idle
      setMeterLevels({
        master: real.master || Math.floor(25 + Math.random() * 20),
        voice: real.voice || Math.floor(30 + Math.random() * 25),
        bgm: real.bgm || Math.floor(15 + Math.random() * 15),
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // AI Auto-Balancing
  const handleAiAutoBalance = async () => {
    try {
      setIsAiBalancing(true);
      showToast('Gemini đang phân tích âm học và cân bằng LUFS...', 'info');

      const rec = await apiService.optimizeAudioMix(audioSettings, subtitleCount);
      if (rec) {
        onUpdateAudioSettings({
          master: { ...audioSettings.master, volume: rec.masterVol ?? 1.0 },
          videoAudio: { ...audioSettings.videoAudio, volume: rec.videoVol ?? 0.65 },
          voiceover: { ...audioSettings.voiceover, volume: rec.voiceVol ?? 1.15 },
          bgm: { ...audioSettings.bgm, volume: rec.bgmVol ?? 0.3 },
          sfx: { ...audioSettings.sfx, volume: rec.sfxVol ?? 0.75 },
        });

        audioEngine.updateLevels({
          masterVol: rec.masterVol ?? 1.0,
          videoVol: rec.videoVol ?? 0.65,
          voiceVol: rec.voiceVol ?? 1.15,
          bgmVol: rec.bgmVol ?? 0.3,
          sfxVol: rec.sfxVol ?? 0.75,
        });

        showToast(rec.explanation || 'Đã cân bằng âm thanh chuẩn phát sóng -14 LUFS!', 'success');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsAiBalancing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Channel Audio Matrix & Metering
                <span className="text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded">
                  4-TRACK STUDIO
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Quản lý ma trận âm lượng, nén sidechain auto-ducking và giám sát dB chuẩn phát sóng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAiAutoBalance}
              disabled={isAiBalancing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg transition disabled:opacity-50"
            >
              {isAiBalancing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Tự Động Cân Bằng AI (-14 LUFS)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mixer Channels Grid */}
        <div className="grid grid-cols-5 gap-4 flex-1">
          {/* Channel 1: Video Audio */}
          <MixerChannel
            title="Video Gốc"
            icon={<Film size={14} className="text-blue-400" />}
            volume={audioSettings.videoAudio.volume}
            muted={audioSettings.videoAudio.muted}
            solo={audioSettings.videoAudio.solo}
            meterLevel={meterLevels.master * 0.7}
            onVolumeChange={(v) => {
              onUpdateAudioSettings({ videoAudio: { ...audioSettings.videoAudio, volume: v } });
              audioEngine.updateLevels({
                masterVol: audioSettings.master.volume,
                videoVol: v,
                voiceVol: audioSettings.voiceover.volume,
                bgmVol: audioSettings.bgm.volume,
                sfxVol: audioSettings.sfx.volume,
              });
            }}
            onToggleMute={() => {
              const muted = !audioSettings.videoAudio.muted;
              onUpdateAudioSettings({ videoAudio: { ...audioSettings.videoAudio, muted } });
            }}
            onToggleSolo={() => {
              onUpdateAudioSettings({ videoAudio: { ...audioSettings.videoAudio, solo: !audioSettings.videoAudio.solo } });
            }}
          />

          {/* Channel 2: Voiceover */}
          <MixerChannel
            title="Voiceover AI"
            icon={<Mic size={14} className="text-purple-400" />}
            volume={audioSettings.voiceover.volume}
            muted={audioSettings.voiceover.muted}
            solo={audioSettings.voiceover.solo}
            meterLevel={meterLevels.voice}
            accentColor="purple"
            extraControl={
              <div className="text-[10px] text-purple-300 bg-purple-950/40 p-1.5 rounded border border-purple-800/40 text-center">
                Ducking Priority: High
              </div>
            }
            onVolumeChange={(v) => {
              onUpdateAudioSettings({ voiceover: { ...audioSettings.voiceover, volume: v } });
              audioEngine.updateLevels({
                masterVol: audioSettings.master.volume,
                videoVol: audioSettings.videoAudio.volume,
                voiceVol: v,
                bgmVol: audioSettings.bgm.volume,
                sfxVol: audioSettings.sfx.volume,
              });
            }}
            onToggleMute={() => {
              onUpdateAudioSettings({ voiceover: { ...audioSettings.voiceover, muted: !audioSettings.voiceover.muted } });
            }}
            onToggleSolo={() => {
              onUpdateAudioSettings({ voiceover: { ...audioSettings.voiceover, solo: !audioSettings.voiceover.solo } });
            }}
          />

          {/* Channel 3: BGM */}
          <MixerChannel
            title="Nhạc Nền (BGM)"
            icon={<Music size={14} className="text-emerald-400" />}
            volume={audioSettings.bgm.volume}
            muted={audioSettings.bgm.muted}
            solo={audioSettings.bgm.solo}
            meterLevel={meterLevels.bgm}
            accentColor="emerald"
            extraControl={
              <button
                onClick={() => {
                  onUpdateAudioSettings({ bgm: { ...audioSettings.bgm, autoDuck: !audioSettings.bgm.autoDuck } });
                  showToast(audioSettings.bgm.autoDuck ? 'Đã tắt Auto-Ducking' : 'Đã bật Auto-Ducking BGM khi có thoại', 'info');
                }}
                className={`w-full py-1 text-[10px] font-semibold rounded border transition ${
                  audioSettings.bgm.autoDuck ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                }`}
              >
                Auto-Ducking: {audioSettings.bgm.autoDuck ? 'ON' : 'OFF'}
              </button>
            }
            onVolumeChange={(v) => {
              onUpdateAudioSettings({ bgm: { ...audioSettings.bgm, volume: v } });
              audioEngine.updateLevels({
                masterVol: audioSettings.master.volume,
                videoVol: audioSettings.videoAudio.volume,
                voiceVol: audioSettings.voiceover.volume,
                bgmVol: v,
                sfxVol: audioSettings.sfx.volume,
              });
            }}
            onToggleMute={() => {
              onUpdateAudioSettings({ bgm: { ...audioSettings.bgm, muted: !audioSettings.bgm.muted } });
            }}
            onToggleSolo={() => {
              onUpdateAudioSettings({ bgm: { ...audioSettings.bgm, solo: !audioSettings.bgm.solo } });
            }}
          />

          {/* Channel 4: SFX */}
          <MixerChannel
            title="Hiệu Ứng (SFX)"
            icon={<Bell size={14} className="text-amber-400" />}
            volume={audioSettings.sfx.volume}
            muted={audioSettings.sfx.muted}
            solo={audioSettings.sfx.solo}
            meterLevel={meterLevels.master * 0.5}
            accentColor="amber"
            onVolumeChange={(v) => {
              onUpdateAudioSettings({ sfx: { ...audioSettings.sfx, volume: v } });
              audioEngine.updateLevels({
                masterVol: audioSettings.master.volume,
                videoVol: audioSettings.videoAudio.volume,
                voiceVol: audioSettings.voiceover.volume,
                bgmVol: audioSettings.bgm.volume,
                sfxVol: v,
              });
            }}
            onToggleMute={() => {
              onUpdateAudioSettings({ sfx: { ...audioSettings.sfx, muted: !audioSettings.sfx.muted } });
            }}
            onToggleSolo={() => {
              onUpdateAudioSettings({ sfx: { ...audioSettings.sfx, solo: !audioSettings.sfx.solo } });
            }}
          />

          {/* Master Channel */}
          <div className="bg-[#181818] border border-neutral-700/80 rounded-xl p-3 flex flex-col items-center justify-between">
            <div className="w-full text-center border-b border-neutral-700 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Master Out</span>
              <span className="text-[10px] font-mono text-neutral-400">Main Bus</span>
            </div>

            {/* Stereo Master VU Meter */}
            <div className="flex-1 w-full flex items-center justify-center gap-3 py-4">
              <div className="h-44 w-3 bg-neutral-900 rounded overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
                <div
                  style={{ height: `${Math.min(100, meterLevels.master)}%` }}
                  className="w-full bg-gradient-to-t from-emerald-500 via-yellow-500 to-red-500 rounded transition-all duration-75"
                />
              </div>
              <div className="h-44 w-3 bg-neutral-900 rounded overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
                <div
                  style={{ height: `${Math.min(100, meterLevels.master * 0.95)}%` }}
                  className="w-full bg-gradient-to-t from-emerald-500 via-yellow-500 to-red-500 rounded transition-all duration-75"
                />
              </div>

              {/* Fader */}
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.02"
                value={audioSettings.master.volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onUpdateAudioSettings({ master: { ...audioSettings.master, volume: v } });
                  audioEngine.updateLevels({
                    masterVol: v,
                    videoVol: audioSettings.videoAudio.volume,
                    voiceVol: audioSettings.voiceover.volume,
                    bgmVol: audioSettings.bgm.volume,
                    sfxVol: audioSettings.sfx.volume,
                  });
                }}
                className="h-44 w-4 appearance-none bg-neutral-800 rounded-lg cursor-pointer accent-blue-500 [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
              />
            </div>

            <div className="w-full space-y-2 pt-2 border-t border-neutral-700 text-center">
              <div className="font-mono text-xs font-bold text-blue-400">
                {Math.round(audioSettings.master.volume * 100)}%
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 p-1 rounded border border-emerald-800/40">
                <ShieldCheck size={12} />
                <span>Peak Limiter ON</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Channel Subcomponent
function MixerChannel({
  title,
  icon,
  volume,
  muted,
  solo,
  meterLevel,
  accentColor = 'blue',
  extraControl,
  onVolumeChange,
  onToggleMute,
  onToggleSolo,
}: {
  title: string;
  icon: React.ReactNode;
  volume: number;
  muted: boolean;
  solo: boolean;
  meterLevel: number;
  accentColor?: string;
  extraControl?: React.ReactNode;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}) {
  return (
    <div className="bg-[#161616] border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-between">
      {/* Title */}
      <div className="w-full text-center border-b border-neutral-800 pb-2">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          {icon}
          <span className="text-xs font-semibold text-neutral-200 truncate">{title}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">Track Strip</span>
      </div>

      {/* Meter & Fader */}
      <div className="flex-1 w-full flex items-center justify-center gap-3 py-4">
        {/* VU Meter */}
        <div className="h-44 w-2.5 bg-neutral-900 rounded overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
          <div
            style={{ height: `${muted ? 0 : Math.min(100, meterLevel)}%` }}
            className="w-full bg-gradient-to-t from-emerald-500 via-yellow-500 to-red-500 rounded transition-all duration-75"
          />
        </div>

        {/* Vertical Volume Slider */}
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.02"
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="h-44 w-4 appearance-none bg-neutral-800 rounded-lg cursor-pointer accent-blue-500 [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
        />
      </div>

      {/* Controls */}
      <div className="w-full space-y-2 pt-2 border-t border-neutral-800">
        <div className="font-mono text-xs text-neutral-300 text-center font-bold">
          {muted ? 'MUTED' : `${Math.round(volume * 100)}%`}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onToggleMute}
            className={`py-1 rounded text-[10px] font-bold border transition ${
              muted ? 'bg-red-600 border-red-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            MUTE
          </button>
          <button
            onClick={onToggleSolo}
            className={`py-1 rounded text-[10px] font-bold border transition ${
              solo ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            SOLO
          </button>
        </div>

        {extraControl}
      </div>
    </div>
  );
}

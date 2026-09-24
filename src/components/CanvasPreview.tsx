import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Maximize2, 
  PictureInPicture2, Volume2, VolumeX, Eye, Sparkles
} from 'lucide-react';
import { SubtitleSegment, SubtitleStyle, AspectRatioType } from '../types/editor';
import { videoRenderer } from '../utils/videoRenderer';

interface CanvasPreviewProps {
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  aspectRatio: AspectRatioType;
  subtitles: SubtitleSegment[];
  globalStyle: SubtitleStyle;
  selectedSubId: number | string | null;
  onSelectSubtitle: (id: number | string) => void;
}

export default function CanvasPreview({
  videoSrc,
  videoRef,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  aspectRatio,
  subtitles,
  globalStyle,
  selectedSubId,
  onSelectSubtitle,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPiP, setIsPiP] = useState(false);

  // Timecode helper (HH:MM:SS:FF)
  const formatTimecode = (sec: number) => {
    const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
    const hrs = pad(sec / 3600);
    const mins = pad((sec % 3600) / 60);
    const secs = pad(sec % 60);
    const frames = pad((sec % 1) * 30);
    return `${hrs}:${mins}:${secs}:${frames}`;
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Video frame
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const vW = video.videoWidth || 1920;
        const vH = video.videoHeight || 1080;
        const videoRatio = vW / vH;
        const targetRatio = width / height;

        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;

        if (videoRatio > targetRatio) {
          drawH = width / videoRatio;
          drawY = (height - drawH) / 2;
        } else {
          drawW = height * videoRatio;
          drawX = (width - drawW) / 2;
        }

        ctx.drawImage(video, drawX, drawY, drawW, drawH);
      } else {
        // Draw subtle pattern or placeholder
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#262626';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Không gian xem trước Video & Vietsub', width / 2, height / 2 - 10);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#404040';
        ctx.fillText('Tải video lên từ thanh công cụ bên trái', width / 2, height / 2 + 14);
      }

      // 3. Draw Subtitles
      const activeSub = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
      if (activeSub) {
        const text = activeSub.textVi || activeSub.translation || activeSub.text || '';
        const style = activeSub.style || globalStyle;
        videoRenderer.drawSubtitleText(ctx, text, width, height, style);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [videoRef, currentTime, subtitles, globalStyle, aspectRatio]);

  // Determine viewport aspect ratio CSS box
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video max-w-[850px]';
      case '9:16':
        return 'aspect-[9/16] max-h-[calc(100vh-320px)]';
      case '1:1':
        return 'aspect-square max-h-[calc(100vh-320px)]';
      case '4:5':
        return 'aspect-[4/5] max-h-[calc(100vh-320px)]';
      default:
        return 'aspect-video max-w-[850px]';
    }
  };

  const getCanvasResolution = () => {
    switch (aspectRatio) {
      case '16:9':
        return { w: 1920, h: 1080 };
      case '9:16':
        return { w: 1080, h: 1920 };
      case '1:1':
        return { w: 1080, h: 1080 };
      case '4:5':
        return { w: 1080, h: 1350 };
      default:
        return { w: 1920, h: 1080 };
    }
  };

  const { w, h } = getCanvasResolution();

  // PiP toggle
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  // Frame stepping
  const stepFrame = (frames: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + frames * (1 / 30)));
    onSeek(newTime);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-black relative flex flex-col items-center justify-center p-3 overflow-hidden select-none"
    >
      {/* Hidden native video element for audio & decoding */}
      <video
        ref={videoRef as any}
        src={videoSrc || undefined}
        className="hidden"
        playsInline
      />

      {/* Main Canvas Viewport Frame */}
      <div className={`relative w-full ${getAspectRatioClasses()} shadow-2xl rounded-lg overflow-hidden border border-neutral-800 bg-[#080808] flex items-center justify-center`}>
        <canvas
          ref={canvasRef}
          width={w}
          height={h}
          onClick={onTogglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Floating Aspect Ratio Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-neutral-400 border border-neutral-800/80 pointer-events-none">
          {aspectRatio} • {w}x{h}
        </div>
      </div>

      {/* Viewport Playback Controller Bar */}
      <div className="w-full max-w-xl mt-3 flex items-center justify-between px-3 py-1.5 bg-[#141414]/90 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 text-xs shadow-lg">
        {/* Playhead Timecode Display */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-blue-400">
          <span>{formatTimecode(currentTime)}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-500">{formatTimecode(duration)}</span>
        </div>

        {/* Central Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 hover:text-white text-neutral-400 hover:bg-neutral-800 rounded transition"
            title="Lùi 1 Frame (-1/30s)"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow transition"
            title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 hover:text-white text-neutral-400 hover:bg-neutral-800 rounded transition"
            title="Tiến 1 Frame (+1/30s)"
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Right Tools (PiP, Fullscreen) */}
        <div className="flex items-center gap-1">
          {videoSrc && (
            <button
              onClick={togglePiP}
              className="p-1.5 hover:text-white text-neutral-400 hover:bg-neutral-800 rounded transition"
              title="Chế độ Hình trong hình (PiP)"
            >
              <PictureInPicture2 size={14} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:text-white text-neutral-400 hover:bg-neutral-800 rounded transition"
            title="Toàn màn hình"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

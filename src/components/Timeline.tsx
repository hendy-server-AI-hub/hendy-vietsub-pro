import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Plus, Scissors, Trash2, ZoomIn, 
  ZoomOut, Volume2, Mic, Film, Music, Magnet, 
  Layers, Copy, MoveHorizontal
} from 'lucide-react';
import { SubtitleSegment } from '../types/editor';

interface TimelineProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  subtitles: SubtitleSegment[];
  selectedSubId: number | string | null;
  onSelectSubtitle: (id: number | string) => void;
  onUpdateSubtitle: (id: number | string, start: number, end: number) => void;
  onAddSubtitleAtPlayhead: () => void;
  onSplitSubtitleAtPlayhead: () => void;
  onDeleteSelectedSubtitle: () => void;
  videoFileName?: string;
  hasVoiceoverTrack?: boolean;
}

export default function Timeline({
  duration,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  subtitles,
  selectedSubId,
  onSelectSubtitle,
  onUpdateSubtitle,
  onAddSubtitleAtPlayhead,
  onSplitSubtitleAtPlayhead,
  onDeleteSelectedSubtitle,
  videoFileName,
  hasVoiceoverTrack,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 to 4
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [snapping, setSnapping] = useState(true);

  // Dragging / Resizing subtitle block
  const [draggingSub, setDraggingSub] = useState<{
    id: number | string;
    mode: 'move' | 'resize-start' | 'resize-end';
    initialX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const effectiveDuration = Math.max(duration, 15);
  // Pixels per second
  const pxPerSec = 40 * zoomLevel;
  const timelineWidth = Math.max(1200, effectiveDuration * pxPerSec);

  // Convert time to pixels
  const timeToPx = (time: number) => (time / effectiveDuration) * timelineWidth;
  // Convert pixels to time
  const pxToTime = (px: number) => {
    let t = (px / timelineWidth) * effectiveDuration;
    if (snapping) {
      // Snap to 0.1s increments
      t = Math.round(t * 10) / 10;
    }
    return Math.max(0, Math.min(effectiveDuration, t));
  };

  // Playhead scrubber
  const handleScrubberMouseDown = (e: React.MouseEvent) => {
    if (!trackContainerRef.current) return;
    setIsDraggingPlayhead(true);
    const rect = trackContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + trackContainerRef.current.scrollLeft;
    onSeek(pxToTime(clickX));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead && trackContainerRef.current) {
        const rect = trackContainerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + trackContainerRef.current.scrollLeft;
        onSeek(pxToTime(clickX));
      }

      if (draggingSub) {
        const deltaX = e.clientX - draggingSub.initialX;
        const deltaTime = (deltaX / timelineWidth) * effectiveDuration;

        let newStart = draggingSub.initialStart;
        let newEnd = draggingSub.initialEnd;

        if (draggingSub.mode === 'move') {
          const dur = draggingSub.initialEnd - draggingSub.initialStart;
          newStart = Math.max(0, draggingSub.initialStart + deltaTime);
          newEnd = newStart + dur;
        } else if (draggingSub.mode === 'resize-start') {
          newStart = Math.max(0, Math.min(draggingSub.initialEnd - 0.2, draggingSub.initialStart + deltaTime));
        } else if (draggingSub.mode === 'resize-end') {
          newEnd = Math.max(draggingSub.initialStart + 0.2, draggingSub.initialEnd + deltaTime);
        }

        if (snapping) {
          newStart = Math.round(newStart * 10) / 10;
          newEnd = Math.round(newEnd * 10) / 10;
        }

        onUpdateSubtitle(draggingSub.id, newStart, newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDraggingSub(null);
    };

    if (isDraggingPlayhead || draggingSub) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, draggingSub, timelineWidth, effectiveDuration, snapping]);

  // Generate ruler markers
  const rulerInterval = zoomLevel > 2 ? 1 : zoomLevel > 1 ? 2 : 5;
  const markerCount = Math.ceil(effectiveDuration / rulerInterval);
  const markers = Array.from({ length: markerCount }, (_, i) => i * rulerInterval);

  return (
    <div 
      ref={containerRef}
      className="h-64 bg-[#111111] border-t border-neutral-800 flex flex-col select-none z-10"
    >
      {/* 1. Timeline Toolbar Header */}
      <div className="h-9 border-b border-neutral-800 bg-[#161616] px-3 flex items-center justify-between text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <button 
            onClick={onTogglePlay}
            className="p-1 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition"
            title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <span className="font-mono text-[11px] text-blue-400 font-semibold px-2">
            {currentTime.toFixed(1)}s / {effectiveDuration.toFixed(1)}s
          </span>

          <div className="w-px h-3.5 bg-neutral-800 mx-1"></div>

          {/* Action Tools */}
          <button 
            onClick={onSplitSubtitleAtPlayhead}
            className="flex items-center gap-1 px-2 py-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition text-[11px]"
            title="Cắt đoạn phụ đề tại playhead"
          >
            <Scissors size={12} />
            <span>Cắt (S)</span>
          </button>

          <button 
            onClick={onAddSubtitleAtPlayhead}
            className="flex items-center gap-1 px-2 py-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition text-[11px]"
            title="Thêm phụ đề tại playhead"
          >
            <Plus size={12} />
            <span>Thêm Sub</span>
          </button>

          {selectedSubId && (
            <button 
              onClick={onDeleteSelectedSubtitle}
              className="flex items-center gap-1 px-2 py-0.5 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 rounded transition text-[11px]"
              title="Xóa phụ đề đã chọn"
            >
              <Trash2 size={12} />
              <span>Xóa</span>
            </button>
          )}

          <button
            onClick={() => setSnapping(!snapping)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition text-[11px] ${
              snapping ? 'text-blue-400 bg-blue-950/40 border border-blue-800/40' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Bật/Tắt chế độ bắt dính (Snapping 0.1s)"
          >
            <Magnet size={12} />
            <span>Bắt dính</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <ZoomOut 
            size={13} 
            className="cursor-pointer text-neutral-500 hover:text-neutral-300"
            onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.3))}
          />
          <input 
            type="range" 
            min="0.6" 
            max="3.5" 
            step="0.1"
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <ZoomIn 
            size={13} 
            className="cursor-pointer text-neutral-500 hover:text-neutral-300"
            onClick={() => setZoomLevel(Math.min(3.5, zoomLevel + 0.3))}
          />
        </div>
      </div>

      {/* 2. Multi-Track Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Labels) */}
        <div className="w-24 bg-[#141414] border-r border-neutral-800 flex flex-col flex-shrink-0 text-[10px] font-mono text-neutral-400 select-none">
          {/* Ruler space */}
          <div className="h-6 border-b border-neutral-800 flex items-center px-2 text-neutral-600">
            Timecode
          </div>

          {/* Track 1: Video */}
          <div className="h-12 border-b border-neutral-800 flex items-center px-2 gap-1.5 font-medium text-blue-400">
            <Film size={12} />
            <span>Video</span>
          </div>

          {/* Track 2: Subtitle */}
          <div className="h-12 border-b border-neutral-800 flex items-center px-2 gap-1.5 font-medium text-yellow-400">
            <Layers size={12} />
            <span>Vietsub</span>
          </div>

          {/* Track 3: Voiceover */}
          <div className="h-10 border-b border-neutral-800 flex items-center px-2 gap-1.5 font-medium text-purple-400">
            <Mic size={12} />
            <span>Voice AI</span>
          </div>

          {/* Track 4: Audio / BGM */}
          <div className="h-10 flex items-center px-2 gap-1.5 font-medium text-emerald-400">
            <Music size={12} />
            <span>BGM / FX</span>
          </div>
        </div>

        {/* Scrollable Track Canvas & Bars */}
        <div 
          ref={trackContainerRef}
          onMouseDown={handleScrubberMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0a0a0a] cursor-crosshair"
        >
          {/* Ruler */}
          <div 
            style={{ width: `${timelineWidth}px` }}
            className="h-6 border-b border-neutral-800 relative bg-[#121212] pointer-events-none"
          >
            {markers.map((sec) => (
              <div 
                key={sec}
                style={{ left: `${timeToPx(sec)}px` }}
                className="absolute top-0 bottom-0 flex flex-col justify-end pb-0.5 text-[9px] font-mono text-neutral-500 pl-1 border-l border-neutral-800/80"
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Track 1: Video Strip */}
          <div 
            style={{ width: `${timelineWidth}px` }}
            className="h-12 border-b border-neutral-800 relative bg-neutral-950/60 p-1"
          >
            <div 
              style={{ width: `${timeToPx(duration)}px` }}
              className="h-full bg-blue-950/50 border border-blue-700/60 rounded flex items-center px-2 text-[11px] text-blue-200 font-medium truncate pointer-events-none shadow"
            >
              <Film size={12} className="mr-1.5 flex-shrink-0 text-blue-400" />
              <span>{videoFileName || 'Video Track'} ({duration.toFixed(1)}s)</span>
            </div>
          </div>

          {/* Track 2: Subtitle Track (Interactive Draggable Blocks) */}
          <div 
            style={{ width: `${timelineWidth}px` }}
            className="h-12 border-b border-neutral-800 relative bg-neutral-950/40 p-1"
          >
            {subtitles.map((sub) => {
              const left = timeToPx(sub.start);
              const width = Math.max(16, timeToPx(sub.end - sub.start));
              const isSelected = selectedSubId === sub.id;

              return (
                <div
                  key={sub.id}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubtitle(sub.id);
                    onSeek(sub.start);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectSubtitle(sub.id);
                    setDraggingSub({
                      id: sub.id,
                      mode: 'move',
                      initialX: e.clientX,
                      initialStart: sub.start,
                      initialEnd: sub.end,
                    });
                  }}
                  className={`absolute inset-y-1 rounded cursor-grab active:cursor-grabbing border flex items-center px-1 overflow-hidden transition-all shadow select-none group ${
                    isSelected
                      ? 'bg-yellow-500 border-white text-black font-bold ring-2 ring-yellow-400/50 z-10'
                      : 'bg-yellow-600/80 hover:bg-yellow-500 border-yellow-400 text-black'
                  }`}
                  title={`${sub.start.toFixed(1)}s - ${sub.end.toFixed(1)}s: ${sub.textVi || sub.text}`}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingSub({
                        id: sub.id,
                        mode: 'resize-start',
                        initialX: e.clientX,
                        initialStart: sub.start,
                        initialEnd: sub.end,
                      });
                    }}
                    className="absolute left-0 inset-y-0 w-2 cursor-ew-resize hover:bg-black/30 flex items-center justify-center"
                  />

                  <span className="text-[10px] truncate px-1 pointer-events-none">
                    {sub.textVi || sub.text}
                  </span>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingSub({
                        id: sub.id,
                        mode: 'resize-end',
                        initialX: e.clientX,
                        initialStart: sub.start,
                        initialEnd: sub.end,
                      });
                    }}
                    className="absolute right-0 inset-y-0 w-2 cursor-ew-resize hover:bg-black/30 flex items-center justify-center"
                  />
                </div>
              );
            })}
          </div>

          {/* Track 3: Voiceover Waveform Track */}
          <div 
            style={{ width: `${timelineWidth}px` }}
            className="h-10 border-b border-neutral-800 relative bg-neutral-950/50 p-1 flex items-center"
          >
            {hasVoiceoverTrack && (
              <div 
                style={{ width: `${timeToPx(duration)}px` }}
                className="h-full bg-purple-950/40 border border-purple-800/50 rounded flex items-center px-2 text-[10px] text-purple-300 pointer-events-none"
              >
                <Mic size={11} className="mr-1 text-purple-400" />
                <span>AI Voiceover Audio Stream (Auto-Ducked)</span>
              </div>
            )}
          </div>

          {/* Track 4: BGM / FX Track */}
          <div 
            style={{ width: `${timelineWidth}px` }}
            className="h-10 relative bg-neutral-950/40 p-1 flex items-center"
          >
            <div 
              style={{ width: `${timeToPx(duration)}px` }}
              className="h-full bg-emerald-950/30 border border-emerald-800/40 rounded flex items-center px-2 text-[10px] text-emerald-300 pointer-events-none"
            >
              <Music size={11} className="mr-1 text-emerald-400" />
              <span>Background Atmosphere Music</span>
            </div>
          </div>

          {/* Draggable Playhead Needle */}
          <div
            style={{ left: `${timeToPx(currentTime)}px` }}
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.9)]"
          >
            <div className="w-3.5 h-3.5 bg-red-500 rotate-45 -mt-2 -ml-[6px] rounded-xs shadow flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

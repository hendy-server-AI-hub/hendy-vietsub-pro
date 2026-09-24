export interface SubtitleSegment {
  id: number | string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  translation?: string;
  textVi?: string;
  textOriginal?: string;
  speaker?: string;
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  bgColor: string; // e.g., 'rgba(0,0,0,0.6)' or 'transparent'
  positionY: 'bottom' | 'center' | 'top' | number; // percentage from top if number
  animation: 'none' | 'pop' | 'fade' | 'karaoke';
  letterSpacing?: number;
  lineHeight?: number;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:5';

export interface AudioTrackSettings {
  videoAudio: { volume: number; muted: boolean; solo: boolean; pan: number };
  voiceover: { volume: number; muted: boolean; solo: boolean; duckingSensitivity: number; voiceId: string };
  bgm: { volume: number; muted: boolean; solo: boolean; autoDuck: boolean; loop: boolean };
  sfx: { volume: number; muted: boolean; solo: boolean; reverb: boolean };
  master: { volume: number; muted: boolean; limiter: boolean };
}

export interface AudioEffectItem {
  id: string;
  name: string;
  category: 'impact' | 'whoosh' | 'tech' | 'cinematic';
  duration: number; // in seconds
  type: 'synth-whoosh' | 'synth-impact' | 'synth-click' | 'synth-glitch' | 'synth-pop' | 'synth-chime';
}

export interface TimelineClip {
  id: string;
  track: 'video' | 'subtitles' | 'voiceover' | 'bgm' | 'sfx';
  start: number;
  end: number;
  name: string;
  color?: string;
  content?: any;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  aspectRatio: AspectRatioType;
  resolution: '720p' | '1080p' | '4K';
  duration: number;
  fps: number;
}

export interface SubtitleSegment {
  id: number | string;
  start: number;
  end: number;
  text: string;
  translation?: string;
  textVi?: string;
  textOriginal?: string;
}

export interface VideoProject {
  title: string;
  duration: number;
  subtitles: SubtitleSegment[];
}

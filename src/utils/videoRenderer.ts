// Real-Time Canvas Composition & MediaRecorder VP9/MP4 Video Exporter

import { SubtitleSegment, SubtitleStyle, AspectRatioType } from '../types/editor';

export interface RenderOptions {
  videoElement: HTMLVideoElement | null;
  subtitles: SubtitleSegment[];
  globalStyle: SubtitleStyle;
  aspectRatio: AspectRatioType;
  duration: number;
  onProgress: (percent: number) => void;
}

export function getResolutionDimensions(aspectRatio: AspectRatioType, quality: '720p' | '1080p' | '4K' = '1080p'): { width: number; height: number } {
  const base1080 = 1080;
  let multiplier = 1;
  if (quality === '720p') multiplier = 720 / 1080;
  if (quality === '4K') multiplier = 2160 / 1080;

  switch (aspectRatio) {
    case '16:9':
      return { width: Math.round(1920 * multiplier), height: Math.round(1080 * multiplier) };
    case '9:16':
      return { width: Math.round(1080 * multiplier), height: Math.round(1920 * multiplier) };
    case '1:1':
      return { width: Math.round(1080 * multiplier), height: Math.round(1080 * multiplier) };
    case '4:5':
      return { width: Math.round(1080 * multiplier), height: Math.round(1350 * multiplier) };
    default:
      return { width: 1920, height: 1080 };
  }
}

export class VideoRenderer {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async renderAndExport(options: RenderOptions): Promise<Blob> {
    this.isCancelled = false;
    const { videoElement, subtitles, globalStyle, aspectRatio, duration, onProgress } = options;
    const { width, height } = getResolutionDimensions(aspectRatio, '1080p');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

    // Create stream from canvas
    const canvasStream = canvas.captureStream(30);

    // Pick supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 6000000 // 6 Mbps high quality
    });

    const recordedChunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    return new Promise(async (resolve, reject) => {
      recorder.onstop = () => {
        const outputBlob = new Blob(recordedChunks, { type: selectedMime });
        resolve(outputBlob);
      };

      recorder.onerror = (e) => reject(e);

      recorder.start();

      const fps = 30;
      const totalFrames = Math.max(1, Math.floor(duration * fps));
      let currentFrame = 0;

      const renderFrame = async () => {
        if (this.isCancelled) {
          recorder.stop();
          reject(new Error('Người dùng đã hủy quá trình xuất video'));
          return;
        }

        const currentTime = currentFrame / fps;

        // 1. Draw Background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Video Frame if available
        if (videoElement && videoElement.readyState >= 2) {
          try {
            videoElement.currentTime = currentTime;
            await new Promise(r => {
              const onSeeked = () => {
                videoElement.removeEventListener('seeked', onSeeked);
                r(null);
              };
              videoElement.addEventListener('seeked', onSeeked);
            });

            // Calculate fit/crop scaling
            const vW = videoElement.videoWidth || 1920;
            const vH = videoElement.videoHeight || 1080;
            const videoRatio = vW / vH;
            const targetRatio = width / height;

            let drawW = width;
            let drawH = height;
            let drawX = 0;
            let drawY = 0;

            if (videoRatio > targetRatio) {
              // Letterbox vertically
              drawH = width / videoRatio;
              drawY = (height - drawH) / 2;
            } else {
              // Pillarbox horizontally
              drawW = height * videoRatio;
              drawX = (width - drawW) / 2;
            }

            ctx.drawImage(videoElement, drawX, drawY, drawW, drawH);
          } catch (e) {
            // Seek or draw fallback
          }
        }

        // 3. Draw Active Subtitle
        const activeSub = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
        if (activeSub) {
          const text = activeSub.textVi || activeSub.translation || activeSub.text || '';
          this.drawSubtitleText(ctx, text, width, height, globalStyle);
        }

        currentFrame++;
        const percent = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
        onProgress(percent);

        if (currentFrame < totalFrames) {
          setTimeout(renderFrame, 1000 / fps);
        } else {
          recorder.stop();
        }
      };

      renderFrame();
    });
  }

  public drawSubtitleText(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    style: SubtitleStyle
  ) {
    if (!text.trim()) return;

    ctx.save();

    // Scale font size proportionally to 1080p
    const baseScale = width / 1920;
    const scaledFontSize = Math.max(16, Math.round(style.fontSize * (width / 1000)));

    ctx.font = `bold ${scaledFontSize}px ${style.fontFamily || 'Inter, sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position calculation
    let posY = height * 0.85;
    if (style.positionY === 'top') posY = height * 0.15;
    if (style.positionY === 'center') posY = height * 0.5;
    if (typeof style.positionY === 'number') posY = height * (style.positionY / 100);

    const posX = width / 2;
    const lines = text.split('\n');
    const lineHeight = scaledFontSize * 1.35;

    lines.forEach((line, index) => {
      const lineY = posY - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight;

      // Draw Background Box if present
      if (style.bgColor && style.bgColor !== 'transparent') {
        const textMetrics = ctx.measureText(line);
        const paddingX = scaledFontSize * 0.5;
        const paddingY = scaledFontSize * 0.25;
        ctx.fillStyle = style.bgColor;
        ctx.beginPath();
        ctx.roundRect(
          posX - textMetrics.width / 2 - paddingX,
          lineY - lineHeight / 2 - paddingY / 2,
          textMetrics.width + paddingX * 2,
          lineHeight + paddingY,
          8
        );
        ctx.fill();
      }

      // Drop Shadow
      if (style.shadowColor) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur || 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Stroke / Outline
      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineWidth = style.strokeWidth * (width / 1000) * 1.5;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, posX, lineY);
      }

      // Fill Text
      ctx.fillStyle = style.textColor || '#ffffff';
      ctx.fillText(line, posX, lineY);
    });

    ctx.restore();
  }
}

export const videoRenderer = new VideoRenderer();

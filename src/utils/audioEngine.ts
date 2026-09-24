// Procedural Sound FX Synthesis & Client Speech Fallback with Web Audio API

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private videoGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Analysers for metering
  private masterAnalyser: AnalyserNode | null = null;
  private voiceAnalyser: AnalyserNode | null = null;
  private bgmAnalyser: AnalyserNode | null = null;

  private isDucked = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 64;

      this.videoGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.voiceAnalyser = this.ctx.createAnalyser();
      this.voiceAnalyser.fftSize = 64;

      this.bgmAnalyser = this.ctx.createAnalyser();
      this.bgmAnalyser.fftSize = 64;

      // Routing
      this.videoGain.connect(this.masterGain);
      
      this.voiceGain.connect(this.voiceAnalyser);
      this.voiceAnalyser.connect(this.masterGain);

      this.bgmGain.connect(this.bgmAnalyser);
      this.bgmAnalyser.connect(this.masterGain);

      this.sfxGain.connect(this.masterGain);

      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public getMasterDestination(): AudioNode {
    this.initContext();
    return this.masterGain!;
  }

  // Update track volume & parameters
  public updateLevels(settings: {
    masterVol: number;
    videoVol: number;
    voiceVol: number;
    bgmVol: number;
    sfxVol: number;
  }) {
    this.initContext();
    const now = this.ctx!.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(settings.masterVol, now, 0.05);
    if (this.videoGain) this.videoGain.gain.setTargetAtTime(settings.videoVol, now, 0.05);
    if (this.voiceGain) this.voiceGain.gain.setTargetAtTime(settings.voiceVol, now, 0.05);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(settings.sfxVol, now, 0.05);

    // If auto-ducking is active, BGM level is attenuated
    if (this.bgmGain) {
      const targetBgm = this.isDucked ? settings.bgmVol * 0.25 : settings.bgmVol;
      this.bgmGain.gain.setTargetAtTime(targetBgm, now, 0.1);
    }
  }

  public setDucking(duck: boolean, baseBgmVol = 0.8) {
    this.initContext();
    this.isDucked = duck;
    if (this.bgmGain) {
      const target = duck ? baseBgmVol * 0.25 : baseBgmVol;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx!.currentTime, 0.15);
    }
  }

  // Real-time audio metering (0 to 100)
  public getMeterLevels(): { master: number; voice: number; bgm: number } {
    if (!this.ctx || !this.masterAnalyser) {
      return { master: 0, voice: 0, bgm: 0 };
    }

    const getLevel = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;
      return Math.min(100, Math.round((avg / 255) * 100 * 1.5));
    };

    return {
      master: getLevel(this.masterAnalyser),
      voice: getLevel(this.voiceAnalyser),
      bgm: getLevel(this.bgmAnalyser)
    };
  }

  // --- Procedural Sound Effects Synthesizer ---

  public playWhoosh() {
    this.initContext();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Filtered noise swoosh
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);
    filter.Q.setValueAtTime(3, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  public playImpactBoom() {
    this.initContext();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Sine pitch drop for sub-bass
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    // Distortion shaper
    const waveShaper = ctx.createWaveShaper();
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + 10) * x) / (Math.PI + 10 * Math.abs(x));
    }
    waveShaper.curve = curve;

    osc.connect(waveShaper);
    waveShaper.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  public playPop() {
    this.initContext();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playChime() {
    this.initContext();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.6);
    });
  }

  public playDigitalBeep() {
    this.initContext();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // --- Client Speech Synthesis Fallback (Web Speech API) ---

  public speakClientSpeech(text: string, lang = 'vi-VN'): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select Vietnamese voice if available
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VIE'));
      if (viVoice) utterance.voice = viVoice;

      this.setDucking(true);
      utterance.onend = () => {
        this.setDucking(false);
        resolve();
      };
      utterance.onerror = () => {
        this.setDucking(false);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  public stopAllSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.setDucking(false);
  }
}

export const audioEngine = new AudioEngine();

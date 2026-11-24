class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public resume(): void {
    this.getContext();
  }

  public setMuted(value: boolean): void {
    this.muted = value;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.06,
    endFreq?: number
  ): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors when blocked by browser autoplay policy
    }
  }

  public playClick(): void {
    this.playTone(620, 0.065, 'triangle', 0.05, 320);
  }

  public playSoftClick(): void {
    this.playTone(480, 0.045, 'sine', 0.035, 280);
  }

  public playCopy(): void {
    this.playTone(740, 0.06, 'sine', 0.045);
    setTimeout(() => this.playTone(980, 0.09, 'sine', 0.05), 55);
  }

  public playScan(): void {
    this.playTone(340, 0.14, 'sine', 0.035, 680);
  }

  public playSuccess(): void {
    this.playTone(523.25, 0.09, 'triangle', 0.05);
    setTimeout(() => this.playTone(659.25, 0.09, 'triangle', 0.05), 80);
    setTimeout(() => this.playTone(783.99, 0.14, 'triangle', 0.06), 160);
  }

  public playError(): void {
    this.playTone(220, 0.12, 'sawtooth', 0.04, 150);
  }
}

export const soundFx = new SoundSynthesizer();

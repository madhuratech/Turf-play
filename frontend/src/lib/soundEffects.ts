// Web Audio API synthesized sound effects — zero external assets

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('kc_sound_enabled') === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kc_sound_enabled', enabled ? 'true' : 'false');
  if (enabled) {
    getAudioContext();
  }
}

export function playSound(type: 'six' | 'four' | 'wicket' | 'goal'): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'six') {
      // Ascending triumphant chime chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } else if (type === 'four') {
      // Crisp double-crack punch
      [440, 660].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.25, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } else if (type === 'wicket') {
      // Dramatic low timber thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'goal') {
      // Stadium horn swell & whistle
      const whistle = ctx.createOscillator();
      const wGain = ctx.createGain();
      whistle.type = 'sine';
      whistle.frequency.setValueAtTime(1800, now);
      whistle.frequency.linearRampToValueAtTime(2200, now + 0.15);
      wGain.gain.setValueAtTime(0.2, now);
      wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      whistle.connect(wGain);
      wGain.connect(ctx.destination);
      whistle.start(now);
      whistle.stop(now + 0.4);

      // Warm goal horn
      [220, 277.18, 329.63].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + 0.1);

        gain.gain.setValueAtTime(0.01, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + 0.1);
        osc.stop(now + 0.95);
      });
    }
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

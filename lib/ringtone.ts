// Utility for realistic looping telephone ringtone and mobile vibration
let cachedRingtoneUri: string | null = null;

export function getRingtoneUri(): string {
  if (cachedRingtoneUri) return cachedRingtoneUri;
  if (typeof window === "undefined") return "";

  const sampleRate = 8000;
  const duration = 2.5; // 2.5 seconds (1.2s ring + 1.3s silence)
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // US/European realistic phone ring: 440Hz + 480Hz dual sine
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (t < 1.2) {
      const envelope = t < 0.05 ? t / 0.05 : t > 1.15 ? (1.2 - t) / 0.05 : 1.0;
      const val = 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.5 * Math.sin(2 * Math.PI * 480 * t);
      sample = Math.floor(val * envelope * 28000);
    }
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedRingtoneUri = "data:audio/wav;base64," + btoa(binary);
  return cachedRingtoneUri;
}

class RingtoneManager {
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRinging = false;

  public start() {
    if (this.isRinging) return;
    this.isRinging = true;

    // 1. Play HTML5 Audio element
    try {
      const uri = getRingtoneUri();
      if (uri) {
        if (!this.audioElement) {
          this.audioElement = new Audio(uri);
        }
        this.audioElement.currentTime = 0;
        this.audioElement.loop = true;
        this.audioElement.volume = 1.0;
        this.audioElement.play().catch((err) => {
          console.warn("Audio element play error (waiting user gesture):", err);
        });
      }
    } catch (e) {
      console.warn("HTML5 audio playback error:", e);
    }

    // 2. Synthesize with Web Audio API as parallel backup
    const triggerTone = () => {
      if (!this.isRinging) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!this.audioCtx || this.audioCtx.state === "closed") {
          this.audioCtx = new AudioCtx();
        }

        const ctx = this.audioCtx;
        const playOscillators = () => {
          try {
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = "sine";
            osc1.frequency.setValueAtTime(440, now);
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(480, now);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
            gain.gain.setValueAtTime(0.6, now + 1.2);
            gain.gain.linearRampToValueAtTime(0.001, now + 1.3);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.3);
            osc2.stop(now + 1.3);
          } catch (err) {
            console.warn("Oscillator start error:", err);
          }
        };

        if (ctx.state === "suspended") {
          ctx.resume().then(playOscillators).catch(() => {});
        } else {
          playOscillators();
        }

        // 3. Trigger mobile vibration pattern
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([600, 300, 600, 300, 800]);
        }
      } catch (err) {
        console.warn("WebAudio tone error:", err);
      }
    };

    triggerTone();
    this.intervalId = setInterval(triggerTone, 2600);
  }

  public stop() {
    this.isRinging = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close().catch(() => {});
      } catch (e) {}
      this.audioCtx = null;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(0);
      }
    } catch (e) {}
  }
}

export const ringtoneManager = new RingtoneManager();

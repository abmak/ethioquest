/**
 * Tiny synthesised sound effects for the quiz, built with the Web Audio API so
 * no audio files are needed. The mute preference is remembered per browser.
 */
const STORAGE_KEY = "eq-sfx-muted";

let context: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.07) {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  amp.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.03);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage can be blocked; the setting then lasts for this page only.
  }
}

/** A soft rising chime when a new question appears. */
export function playQuestion(): void {
  tone(523.25, 0, 0.16, "triangle", 0.05);
  tone(783.99, 0.1, 0.22, "triangle", 0.045);
}

/** A short, satisfying blip when an answer is chosen. */
export function playAnswer(): void {
  tone(660, 0, 0.09, "square", 0.035);
  tone(990, 0.05, 0.1, "sine", 0.04);
}

/** A two-note confirmation when the question is locked in and we move on. */
export function playAdvance(): void {
  tone(587.33, 0, 0.12, "sine", 0.05);
  tone(880, 0.09, 0.16, "sine", 0.05);
}

/** A dry tick for the final seconds of the countdown. */
export function playTick(urgent = false): void {
  tone(urgent ? 1200 : 880, 0, 0.05, "square", urgent ? 0.045 : 0.028);
}

/** The finish fanfare when the whole challenge is submitted. */
export function playFinish(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((note, i) => tone(note, i * 0.11, 0.26, "triangle", 0.055));
}

/** A gentle error tone, e.g. when the challenge cannot start. */
export function playError(): void {
  tone(320, 0, 0.18, "sawtooth", 0.035);
  tone(220, 0.14, 0.22, "sawtooth", 0.03);
}

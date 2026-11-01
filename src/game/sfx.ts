// Small synthesized sound effects (WebAudio only, no audio files).
// The AudioContext is created on the first tap or key press (browser autoplay
// rules). A mute button is added to the page; the choice is saved in localStorage.
const KEY = "farshore-sound";
let muted = false;
try {
  muted = localStorage.getItem(KEY) === "off";
} catch {
  /* storage blocked: default on */
}
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const last: Record<string, number> = {};

function ensure(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.5, slide = 0, delay = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.4, freq = 1200, delay = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = buf;
  f.type = "lowpass";
  f.frequency.value = freq;
  g.gain.value = vol;
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
}

function limit(name: string, ms: number) {
  const now = Date.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}

let btn: HTMLButtonElement | null = null;

function paint() {
  if (!btn) return;
  btn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  btn.setAttribute("aria-label", muted ? "Sound off. Turn sound on" : "Sound on. Mute");
  btn.title = muted ? "Sound off" : "Sound on";
  btn.setAttribute("aria-pressed", muted ? "true" : "false");
}

export const sfx = {
  tap() {
    if (limit("tap", 40)) tone(660, 0.05, "triangle", 0.25, 120);
  },
  action() {
    if (!limit("action", 60)) return;
    noise(0.07, 0.5, 900);
    tone(140, 0.09, "sine", 0.5, -40);
  },
  success() {
    tone(660, 0.1, "triangle", 0.35);
    tone(990, 0.16, "triangle", 0.3, 0, 0.08);
  },
  fail() {
    tone(220, 0.18, "sawtooth", 0.18, -60);
    tone(165, 0.26, "sawtooth", 0.16, -50, 0.14);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.3, 0, i * 0.11));
  },
  isMuted() {
    return muted;
  },
  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem(KEY, muted ? "off" : "on");
    } catch {
      /* ignore */
    }
    if (muted && ctx && ctx.state === "running") void ctx.suspend();
    if (!muted) {
      ensure();
      sfx.tap();
    }
    paint();
  },
};

let installed = false;
/** Unlock audio on the first gesture and click on every button press. Adds a
 *  floating mute toggle unless the game draws its own (button: false). */
export function installSfx(opts: { button?: boolean; className?: string } = {}) {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("pointerdown", () => void ensure(), { capture: true, passive: true });
  document.addEventListener("keydown", () => void ensure(), { capture: true });
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as Element | null;
      const b = el?.closest?.("button, [role=button]");
      if (b && b !== btn) sfx.tap();
    },
    true,
  );
  if (opts.button === false) return;
  btn = document.createElement("button");
  btn.type = "button";
  btn.className = opts.className ?? "sfx-toggle";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    sfx.setMuted(!muted);
  });
  paint();
  document.body.appendChild(btn);
}

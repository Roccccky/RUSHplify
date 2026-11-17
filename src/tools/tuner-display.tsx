import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** How the tuner draws the pitch: needle or strobe. One choice for the big tuner and the miniature. */
export type TunerDisplay = "needle" | "strobe";
const DISPLAY_KEY = "rushplify-tuner-display";
const DISPLAY_EVENT = "rushplify:tuner-display";
const rememberedDisplay = (): TunerDisplay => { try { return localStorage.getItem(DISPLAY_KEY) === "strobe" ? "strobe" : "needle"; } catch { return "needle"; } };

export function useTunerDisplay() {
  const [display, setDisplay] = useState<TunerDisplay>(rememberedDisplay);
  useEffect(() => {
    const sync = () => setDisplay(rememberedDisplay());
    window.addEventListener(DISPLAY_EVENT, sync);
    return () => window.removeEventListener(DISPLAY_EVENT, sync);
  }, []);
  const change = (next: TunerDisplay) => {
    setDisplay(next);
    try { localStorage.setItem(DISPLAY_KEY, next); } catch { /* convenience only */ }
    window.dispatchEvent(new Event(DISPLAY_EVENT));
  };
  return [display, change] as const;
}

const SEMITONES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** Frequency of a note name as the pedal reports it ("A", "F#", "Bb2"); without an octave the guitar range (octave 2). */
export function noteFrequency(note: string, reference = 440): number {
  const match = /^\s*([A-G])\s*([#♯b♭]?)\s*(-?\d)?/.exec(note);
  if (!match) return 110;
  const semitone = SEMITONES[match[1]] + (match[2] === "#" || match[2] === "♯" ? 1 : match[2] ? -1 : 0);
  const octave = match[3] === undefined ? 2 : Number(match[3]);
  return reference * 2 ** ((semitone + (octave - 4) * 12) / 12);
}
/** How fast the strobe drifts, in stripes per second: the beat between the string and its target note.
 *  Zero when in tune; the sign is the direction (sharp runs right, flat runs left). */
export const strobeRate = (frequency: number, cents: number) => frequency * (2 ** (cents / 1200) - 1);

/** Strobe display: two rows of blocks in wells like the needle's track, note and cents underneath (`children`).
 *  The top row's blocks are half as wide (48 / 96 px).
 *  As on a strobe tuner, each band runs at a multiple of the beat (the octave band above twice as fast), right
 *  = sharp, left = flat; the closer the string, the slower they run, and in tune they stand still. The motion
 *  follows the measured pitch error directly, without easing. */
const ROWS = [{ period: 96, gain: 4 }, { period: 192, gain: 1 }];

export function Strobe({ note, cents, reference, children }: { note: string; cents: number; reference: number; children?: ReactNode }) {
  const rows = useRef<Array<HTMLSpanElement | null>>([]);
  const rate = useRef(0);
  rate.current = note ? strobeRate(noteFrequency(note, reference), Math.max(-50, Math.min(50, cents))) : 0;
  useEffect(() => {
    let frame = 0; let last = performance.now(); let phase = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      phase = (((phase + rate.current * dt) % 1) + 1) % 1;
      ROWS.forEach((row, index) => {
        const element = rows.current[index];
        if (element) element.style.transform = `translateX(${((phase * row.gain) % 1) * row.period}px)`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="rp-strobe" data-lit={Boolean(note) || undefined}>
    <div className="rp-strobe__rows" aria-hidden="true">{ROWS.map((row, index) => <div key={row.period} className="rp-strobe__row">
      <span ref={(element) => { rows.current[index] = element; }} style={{ "--strobe-period": `${row.period}px` } as CSSProperties}/>
    </div>)}</div>
    <div className="rp-strobe__readout">{children}</div>
  </div>;
}

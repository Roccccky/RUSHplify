/** Effect and tool marks from NAMplify (`ui/icons.js`, same author): drawn paths in a 24×24 field, stroke in
 *  currentColor. Used where a block or tool needs a sign (STAGE pads). */
export const FX_MARKS = {
  GATE: '<path d="M3 12h4l2.5-6 3 12 2.5-6h1"/><path d="M19 4v16"/>',
  COMP: '<path d="M4 12h16"/><path d="M12 3v5M9.5 5.5 12 3l2.5 2.5"/><path d="M12 21v-5M9.5 18.5 12 21l2.5-2.5"/>',
  DRIVE: '<path d="M13.5 2 5 13.5h5.5L9.5 22 19 10.5h-5.5L14.5 2z" fill="currentColor" stroke="none"/>',
  PEDAL: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><path d="M10 3.5v4M14 3.5v4M10 16.5v4M14 16.5v4M3.5 10h4M3.5 14h4M16.5 10h4M16.5 14h4"/>',
  AMP: '<path d="M9.5 5.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v.5"/><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M6.5 15h11"/><circle cx="8" cy="10.5" r="1.4"/><circle cx="12" cy="10.5" r="1.4"/><circle cx="16" cy="10.5" r="1.4"/>',
  EQ: '<path d="M7 3.5v17M12 3.5v17M17 3.5v17"/><path d="M4.5 9h5M9.5 15h5M14.5 7h5"/>',
  CAB: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><circle cx="12" cy="14" r="4"/><circle cx="12" cy="14" r="1.3"/><circle cx="12" cy="6.5" r="1.3"/>',
  OUTBOARD: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6" fill="currentColor" stroke="none"/><path d="M10 3.5v4M14 3.5v4M10 16.5v4M14 16.5v4M3.5 10h4M3.5 14h4M16.5 10h4M16.5 14h4"/>',
  CHORUS: '<path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h13a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h7a2 2 0 1 1-2 2"/>',
  FLANGER: '<path d="M2.5 12c2-7 4.5 7 7 0s4.5-7 7 0 3 5 4 1.5"/><path d="M2.5 18c2-4 4.5 4 7 0s4.5-4 7 0 3 3 4 1"/>',
  PHASER: '<path d="M2.5 12h2.5l2-5.5 3 11 3-13 3 10 2-4.5h3.5"/>',
  TREMOLO: '<path d="M2.5 7.5c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0"/><path d="M2.5 12c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0"/><path d="M2.5 16.5c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0"/>',
  DELAY: '<circle cx="4.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M9 8.5a5 5 0 0 1 0 7M13.5 6a8.5 8.5 0 0 1 0 12M18 3.5a12 12 0 0 1 0 17"/>',
  REVERB: '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8 9a4.5 4.5 0 0 0 0 6M16 9a4.5 4.5 0 0 1 0 6"/><path d="M4.5 6a8.5 8.5 0 0 0 0 12M19.5 6a8.5 8.5 0 0 1 0 12"/>',
  LOOPER: '<path d="M4 9.5V8a2.5 2.5 0 0 1 2.5-2.5h11"/><path d="M15 3l2.5 2.5L15 8"/><path d="M20 14.5V16a2.5 2.5 0 0 1-2.5 2.5h-11"/><path d="M9 16l-2.5 2.5L9 21"/>',
  DRUMS: '<path d="M9.5 3.5h5l4 17h-13z"/><path d="M7.5 15h9"/><path d="M12 18.5 16.5 6"/>',
  RECORDER: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/><path d="M10.6 12h2.8"/>',
  FORK: '<path d="M9 3v7a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3V3 M12 13v8"/>',
  PREV: '<path d="M15 5l-8 7 8 7z"/>',
  NEXT: '<path d="M9 5l8 7-8 7z"/>',
  SCENE: '<path d="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z"/>',
} as const;
export type FxMark = keyof typeof FX_MARKS;

export function FxIcon({ mark, size = 24, className }: { mark: FxMark; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: FX_MARKS[mark] }}/>;
}

/** Tuner sign: a tuning fork (always hidden from assistive tech; the button carries the name). */
export function TuningFork({ size = 24, className }: { size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return <FxIcon mark="FORK" size={size} className={className}/>;
}

const CATEGORY_MARK: Array<[RegExp, FxMark]> = [
  [/gate/, "GATE"], [/comp|dynamic|sustain|swell/, "COMP"], [/drive|dist|fuzz|boost|\bod\b|crush/, "DRIVE"], [/delay|echo/, "DELAY"],
  [/reverb|verb|plate|spring|shimmer|hall|room/, "REVERB"], [/chorus|doubler|detune/, "CHORUS"], [/flang/, "FLANGER"], [/phas/, "PHASER"],
  [/trem|vib|rotary|pan/, "TREMOLO"], [/\beq\b|graphic/, "EQ"], [/\bamp\b|clone|capture|nam\b/, "AMP"], [/\bcab\b|\bir\b|impulse/, "CAB"],
  [/loop/, "LOOPER"], [/drum/, "DRUMS"], [/wah|filter|pitch|harm|whammy|octa/, "PEDAL"],
];
/** The mark for a block, from its category or name (null when nothing fits). */
export function fxMarkFor(text: string): FxMark | null {
  const lower = text.toLowerCase();
  return CATEGORY_MARK.find(([pattern]) => pattern.test(lower))?.[1] ?? null;
}

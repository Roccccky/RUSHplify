/** What each Flex Prime model is inspired by (HeadRush's own "Inspired by" list, Flex Prime product page,
 *  FW 5.x), plus how RUSHplify draws it. The drawing mirrors the look of the model on the pedal (enclosure,
 *  colour, knob rows, treadle or Boss-style switch plate), so it is recognised at a glance, but it is our own
 *  flat drawing: no logos, no brand or model text, nothing traced from the pedal's pictures.
 *  Trademarks belong to their owners and are named only to describe the sound. */
import { BLOCK_CATEGORY_COLORS, categoryForBlockName } from "./block-categories";
import type { BlockCategory } from "./types";

/** Enclosures: stompbox, wide box, guitar-pick box, round fuzz, treadle (wah / volume), whammy box with a
 *  treadle, piano-style sustain pedal, amp head, cab, IR, NAM host. */
export type ArtShape = "stomp" | "wide" | "pick" | "round" | "wah" | "whammy" | "key" | "amp" | "cab" | "ir" | "nam";
export interface BlockArt {
  shape: ArtShape;
  /** Enclosure colour. */
  body: string;
  /** Knob rows, top to bottom: [2, 1] = two knobs, one under them. */
  rows?: number[];
  /** Knob cap colour. */
  knob?: string;
  /** Second colour for the upper part of a two-tone box. */
  top?: string;
  /** Boss-style switch plate covering the lower part (replaces the footswitch). */
  plate?: string;
  /** Plain stripe where the original has its name. */
  band?: string;
  /** Wooden or coloured side cheeks. */
  trim?: string;
  /** Outline colour of a framed box. */
  frame?: string;
  /** Coloured stripes across the box (one per knob row). */
  stripes?: string[];
  faders?: number;
  buttons?: number;
  switches?: number;
  screen?: string;
  /** Jacks on the top edge. */
  jacks?: boolean;
}
export interface Inspiration { by: string | null; art: BlockArt }

const ORIGINAL = null;
const DARK = "#1c1c1c";
const LIGHT = "#e6e6e6";
const STEEL = "#8e9296";
const WOOD = "#6b3a22";
type Extra = Omit<BlockArt, "shape" | "body" | "rows">;
const st = (body: string, rows: number[], extra: Extra = {}): BlockArt => ({ shape: "stomp", body, rows, ...extra });
const wide = (body: string, rows: number[], extra: Extra = {}): BlockArt => ({ shape: "wide", body, rows, ...extra });
const pick = (body: string, rows: number[], extra: Extra = {}): BlockArt => ({ shape: "pick", body, rows, ...extra });
const round = (body: string, rows: number[]): BlockArt => ({ shape: "round", body, rows });
const wah = (body: string): BlockArt => ({ shape: "wah", body });
const whammy = (body: string): BlockArt => ({ shape: "whammy", body });

// [pedal name, inspired by (null = original), drawing]
const ROWS: Array<[string, string | null, BlockArt]> = [
  // overdrive / boost
  ["Jimmy OD", "MXR Timmy", st("#2a6fd6", [2, 2])],
  ["Palace OD", "MXR Duke of Tone", st("#5a1f4a", [2, 1])],
  ["Anxiety OD", "Fulltone OCD", st("#e9ebe8", [2, 1])],
  ["Anxiety OD V2", "Fulltone OCD (mod)", st("#e9ebe8", [2, 1])],
  ["B2 Drive", "Boss BD-2 Blues Driver", st("#2257b8", [2, 1], { plate: DARK })],
  ["Budda OM OD", "Budda OM OD", st("#e8823a", [2, 1], { knob: LIGHT })],
  ["Budda ZenMan", "Budda ZenMan", st("#d83a32", [2, 2], { knob: LIGHT, switches: 2 })],
  ["D250 Drive", "DOD Overdrive Preamp 250", st("#f2d21c", [2], { knob: LIGHT, band: "#1c1c1c" })],
  ["Green JRC-OD", "Ibanez TS808", st("#3aa64a", [2, 1], { band: "#2a7f36" })],
  ["Greener", "Maxon / Ibanez Tube Screamer (mod)", st("#3aa64a", [2, 1], { band: "#e9ebe8" })],
  ["Greener Lite", "Maxon / Ibanez Tube Screamer (mod)", st("#43b04f", [2], { band: "#e9ebe8" })],
  ["Grinder Bass OD", ORIGINAL, st("#c8343a", [3], { top: "#d9555a" })],
  ["K Drive", "Klon Centaur", wide("#e2b534", [3])],
  ["S1 Drive", "Boss SD-1 Super Overdrive", st("#f0cf3a", [2, 1], { plate: DARK })],
  ["Sher'ff", "Marshall Guv'nor", st("#1e1e1e", [5], { knob: STEEL })],
  ["Treble Booster", "Dallas Rangemaster", st("#c9cdd1", [1])],
  ["White Boost", "Xotic RC Booster", st("#eceded", [2, 2])],
  ["Glorious Drive", "JHS Morning Glory", st("#b9a86a", [2, 1], { knob: LIGHT })],
  // distortion / fuzz
  ["8-Bit Crush", "OTO Biscuit", st("#1f1f1f", [2, 2], { knob: STEEL, trim: WOOD })],
  ["B Dist 7000", "Darkglass Microtubes B7K", wide("#1b1b1b", [4, 4], { knob: STEEL, switches: 2, frame: "#e9ebe8" })],
  ["Black Death", "ProCo Rat", st("#1a1a1a", [3], { knob: STEEL, top: "#3a3d40" })],
  ["Black Op", "ProCo Rat", st("#151515", [2, 1], { knob: STEEL })],
  ["D1 Dist", "Boss DS-1", st("#f07a1a", [2, 1], { plate: DARK })],
  ["DC Distort", "Eleven Rack custom distortion", st("#f5b770", [2, 2])],
  ["MX Dist", "MXR Distortion+", st("#f2d33a", [2])],
  ["Oct Fuzz", "Dunlop JH-OC1 Octavio", st("#ececec", [], { jacks: true })],
  ["Round Fuzz", "Dunlop Fuzz Face", round("#9a2a24", [2])],
  ["Slab O Meat", ORIGINAL, st("#b5262c", [2, 1], { knob: STEEL, top: "#c8434a" })],
  ["Tri Fuzz", "EHX Big Muff Pi", st("#9fa3a8", [2, 1], { band: "#c8343a", plate: DARK })],
  ["Acoust Sim", "Boss Acoustic Simulator", st("#f2a93a", [3], { top: DARK, plate: DARK, knob: STEEL })],
  ["Acoustic Pre", ORIGINAL, st("#d6d8da", [3], { screen: "#1c1c1c" })],
  // eq
  ["Auto Q 8 Band EQ", ORIGINAL, st("#efe9cf", [3, 3, 3, 3, 3])],
  ["Bass EQ", "Eleven Rack custom EQ", st("#1f3550", [2], { knob: STEEL })],
  ["G EQ", ORIGINAL, st("#c9a94a", [1], { faders: 7 })],
  ["Graphic EQ", "Eleven Rack graphic EQ", st("#1d3a40", [], { faders: 7 })],
  ["Graphic Bass EQ", "Eleven Rack graphic EQ", st("#cfd2d5", [], { faders: 8, plate: DARK })],
  ["Para EQ", "Eleven Rack parametric EQ", st("#6fb2e6", [3, 3, 3, 3], { knob: LIGHT })],
  ["Promise EQ", "Providence DBS-1 Bass EQ", st("#1f2f66", [4, 4], { knob: STEEL, switches: 2 })],
  ["Ten Freq EQ", "MXR M108 Ten Band EQ", wide("#c4c7ca", [], { faders: 10 })],
  // compressor / dynamics
  ["Budda Comp", "Budda Chakra Compressor", st("#c9cccd", [2, 2], { knob: LIGHT })],
  ["DynIII Comp", "Avid Dynamics III", st("#4f88b3", [2, 2, 2])],
  ["Gray Comp", "Ross Compressor", st("#a9acaf", [2])],
  ["Pressor", ORIGINAL, st("#b9bcbf", [2])],
  ["Side Comp", ORIGINAL, st("#4a5fbf", [2, 2, 2])],
  ["Slammer", ORIGINAL, st("#c8241c", [2, 1], { knob: LIGHT })],
  ["Gate", "Rocktron Hush", st("#2a6fd0", [3], { knob: LIGHT, band: "#5aa0e8" })],
  ["Kaften Gate", ORIGINAL, st("#3a3a3a", [2], { knob: LIGHT })],
  ["Noise Filter", ORIGINAL, st("#e3e4e5", [2, 2, 2])],
  ["Volume", ORIGINAL, wah("#9da1a5")],
  ["Sustain", ORIGINAL, { shape: "key", body: "#1c1c1c" }],
  ["Hold", "EHX Freeze", st("#e8eaec", [2, 2])],
  ["Auto Swell", "DigiTech Crescendo", st("#2c2c2c", [2], { knob: LIGHT })],
  ["Feedback", ORIGINAL, whammy("#d3d5d7")],
  // delay
  ["Again Delay", ORIGINAL, st("#2d2d2d", [2, 3, 3], { knob: LIGHT })],
  ["AIR Delay", "Pro Tools AIR Delay", st("#b9bcbf", [2, 2, 2, 2, 2])],
  ["BBD Delay", "EHX Deluxe Memory Man", st("#b0b3b6", [5, 3], { plate: DARK })],
  ["Budda Samsara Delay", "Budda Samsara Delay", st("#a560b8", [2, 2], { knob: LIGHT })],
  ["Dyn Delay", "Pro Tools AIR Dynamic Delay", st("#b9bcbf", [3, 3, 3, 3])],
  ["M104 Analog Delay", "Moog MF-104M", st("#2a2421", [3, 3], { knob: STEEL, trim: WOOD, switches: 2 })],
  ["Pitch Delay", "Boss PS-3", st("#4ea0d8", [4], { knob: LIGHT, plate: DARK })],
  ["Reso Delay", ORIGINAL, pick("#5a2a28", [3, 3])],
  ["Reverse Delay", "Boss DD-5", st("#f0f0f0", [3], { knob: "#3aa59a", plate: DARK })],
  ["Stereo Doubler", ORIGINAL, st("#d4d6d8", [2, 1])],
  ["Tape Echo", "Maestro Echoplex EP-3", st("#3c4044", [2, 2, 2], { knob: STEEL })],
  ["Time Warp", "DigiTech Space Station", whammy("#e8c12a")],
  ["Multi Delay", ORIGINAL, wide("#2b38b8", [4, 2], { knob: LIGHT, switches: 2 })],
  ["Grain Delay", ORIGINAL, pick("#4a6fd0", [3, 3], { knob: LIGHT })],
  // reverb
  ["AIR Reverb", "Pro Tools AIR Reverb", st("#2f7fc4", [2, 2])],
  ["Eleven Reverb", "Avid Reverb One", st("#c9ccce", [2, 2], { screen: "#1f3a7a" })],
  ["Party Verb", ORIGINAL, pick("#d9604a", [2, 3])],
  ["Shimmer", ORIGINAL, st("#39b8e8", [2, 3], { plate: DARK })],
  ["Spring Reverb", "Fender spring reverb", st("#b5b8bb", [2, 2], { band: "#8d9094", plate: DARK })],
  ["Spring Guru", ORIGINAL, st("#1c2a4a", [2, 2, 2], { knob: LIGHT })],
  ["C-Verb", ORIGINAL, st("#59a8e6", [2, 1], { knob: LIGHT })],
  ["Ambi Verb", ORIGINAL, pick("#1d2c4a", [2, 2])],
  ["Flora Verb", ORIGINAL, pick("#1e3556", [3, 2])],
  // modulation
  ["Budda Karma Chorus", "Budda Karma Chorus", st("#5fb0e0", [2, 2], { knob: LIGHT, switches: 2 })],
  ["C2 Bass Chorus", "Boss CE-2B", st("#b7834f", [2, 1], { top: "#d9b98a", plate: DARK })],
  ["C2 Chorus", "Boss CE-2", st("#7cc6e8", [2], { plate: DARK })],
  ["Chorus", "Boss CE-1 (chorus)", st("#c9cbcd", [2, 2])],
  ["Detune", ORIGINAL, st("#3a3d3d", [2, 2, 2, 2], { knob: STEEL, screen: "#3a1414" })],
  ["Dim Chorus", "Boss Dimension-C", st("#b9a9e8", [], { buttons: 4, top: "#e3dcf6", plate: DARK })],
  ["Multi Chorus", "AIR Multichorus", st("#6c6f72", [3, 3, 3], { knob: STEEL })],
  ["AIR Flanger", "AIR Flanger", st("#9a4ab0", [2, 2], { knob: LIGHT })],
  ["Analog Flanger", ORIGINAL, st("#bfc2c4", [2, 2])],
  ["Digital Flanger", ORIGINAL, st("#7a1f22", [2, 2], { knob: LIGHT })],
  ["Flanger", "Eleven Rack flanger", st("#8d3fa8", [2, 2])],
  ["Orange Phaser", "MXR Phase 90", st("#f2a35a", [1])],
  ["Ring Mod", ORIGINAL, st("#1f1f1f", [2, 1], { knob: STEEL, trim: WOOD })],
  ["Square-Phase", "MXR Phase 90 (script)", st("#f08a1a", [1])],
  ["Stone Phaser", "EHX Small Stone", st("#bfc2c4", [2, 2], { plate: DARK })],
  ["Tron Phaser", "Mu-Tron Phasor II", st("#8a8d90", [1, 1, 1], { knob: LIGHT, stripes: ["#e0603a", "#e04a3a", "#9a3ab0"] })],
  ["Vibe Phaser", "Shin-ei Uni-Vibe", st("#1d1d1d", [2], { knob: STEEL })],
  ["AIR Vibrato", "AIR Vibrato", st("#e0473f", [2, 2])],
  ["Panner", "Eleven Rack panner", wah("#c9cbcd")],
  ["Rotary", "AIR Rotary", st("#1c1c1c", [2, 1], { knob: STEEL })],
  ["Tremolo", "Boss TR-2", st("#4fc7a5", [2, 2], { plate: DARK })],
  ["Tube Tremolo", ORIGINAL, st("#5a4434", [2, 1], { knob: LIGHT, band: "#3a2c22" })],
  ["Vibrato", "Boss CE-1 (vibrato)", st("#c9cbcd", [2, 2])],
  // filter / wah
  ["AIR Filter", "AIR Filter", st("#1e1e1e", [2, 2], { knob: STEEL, trim: WOOD })],
  ["Black Wah", "Dunlop Cry Baby", wah("#1c1c1c")],
  ["Bud Wah", "Budda BudWah", wah("#c4c7ca")],
  ["Env Filter", "DOD FX25 Envelope Filter", st("#3ab04a", [2], { band: "#1c1c1c", plate: DARK })],
  ["More Wah", "Morley wah", wah("#2a2a2a")],
  ["Shine Wah", "Vox V846", wah("#d0d3d6")],
  ["Tron Filter", "Mu-Tron III", st("#ece6d6", [2, 1, 1], { knob: LIGHT, top: "#3a2a7a" })],
  ["White Bass Wah", "Dunlop Cry Baby 105Q Bass Wah", wah("#f0f0f0")],
  // pitch
  ["Up Tune", ORIGINAL, st("#3f7fd8", [2, 1])],
  ["Chord Wham", "DigiTech Whammy (chords)", whammy("#d42a2a")],
  ["Drop Tune", "DigiTech Drop", st("#c8202a", [2, 1])],
  ["Harm", "DigiTech Whammy (harmony)", whammy("#d42a2a")],
  ["Octaves", "Boss OC-2", st("#5a3a2a", [2, 1], { plate: DARK })],
  ["Octaves Up", ORIGINAL, st("#3f8fd0", [2, 1], { plate: DARK })],
  ["Smart Harm", ORIGINAL, st("#4a3f36", [3, 3, 3, 3], { knob: STEEL })],
  ["Wham", "DigiTech Whammy", whammy("#d42a2a")],
  ["12 String", ORIGINAL, st("#8fa8c4", [2])],
  // rhythmic / synth / util
  ["Kill Seq", ORIGINAL, st("#48c0d0", [], { faders: 1 })],
  ["Splicer", ORIGINAL, pick("#7a8088", [3, 3])],
  ["Hybrid", ORIGINAL, st("#1f3a6a", [3, 3, 3], { knob: LIGHT })],
  ["DB-33", ORIGINAL, st("#4a3424", [3, 4, 4], { knob: LIGHT })],
  ["Electric", ORIGINAL, st("#c9ccce", [3, 3])],
  ["FX-Loop", ORIGINAL, st("#dcdedf", [2, 1], { jacks: true })],
];

const KIND_ART: Array<[RegExp, BlockArt]> = [
  [/neural amp modeler/i, { shape: "nam", body: "#1a1d20", frame: "#4fc8d2" }],
  [/pedal clone/i, st("#1f1f1f", [2, 2], { knob: "#e8c84a" })],
  [/superclone/i, { shape: "amp", body: "#1e2e5a", top: "#3a5aa8", knob: LIGHT }],
  [/clone/i, { shape: "amp", body: "#2a2a2a", top: "#3a3d40", knob: STEEL }],
  [/^ir\b|impulse/i, { shape: "ir", body: "#1c1c1c" }],
  [/revalver cab/i, { shape: "cab", body: "#c9ccce", top: "#151515" }],
  [/cab/i, { shape: "cab", body: "#5a5d60", top: "#2a2a2a" }],
  [/amp/i, { shape: "amp", body: "#1c1c1c", top: "#c9ccce" }],
];

/** Models without a row (other firmware, demo rigs) are drawn as a box in their category colour. */
const CATEGORY_ART: Partial<Record<BlockCategory, (colour: string) => BlockArt>> = {
  amp: (colour) => ({ shape: "amp", body: "#1c1c1c", top: colour }),
  clone: (colour) => ({ shape: "amp", body: "#1c1c1c", top: colour }),
  cab: (colour) => ({ shape: "cab", body: colour, top: "#2a2a2a" }),
  ir: () => ({ shape: "ir", body: "#1c1c1c" }),
  eq: (colour) => st(colour, [], { faders: 7 }),
  filter: (colour) => wah(colour),
  pitch: (colour) => whammy(colour),
  delay: (colour) => st(colour, [2, 2]),
  reverb: (colour) => st(colour, [2, 2]),
  "fx-loop": (colour) => st(colour, [2, 1], { jacks: true }),
};
const categoryArt = (category: BlockCategory): BlockArt => {
  const colour = BLOCK_CATEGORY_COLORS[category];
  return CATEGORY_ART[category]?.(colour) ?? st(colour, [2, 1]);
};

const key = (name: string) => name.replace(/ 2$/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const TABLE = new Map(ROWS.map(([name, by, art]) => [key(name), { by, art } satisfies Inspiration]));
// Names the product page spells differently from the pedal's module list.
for (const [alias, name] of [["Acoustic Sim", "Acoust Sim"], ["10 Freq EQ", "Ten Freq EQ"], ["Autoswell", "Auto Swell"], ["C Verb", "C-Verb"], ["Budda BudWah", "Bud Wah"], ["D1 Distortion", "D1 Dist"]]) TABLE.set(key(alias), TABLE.get(key(name))!);

/** `category` (the slot's own category, when known) only decides the drawing of models without a row. */
export function inspirationFor(name: string, category?: BlockCategory): Inspiration {
  const hit = TABLE.get(key(name));
  if (hit) return hit;
  const art = KIND_ART.find(([pattern]) => pattern.test(name))?.[1] ?? categoryArt(category ?? categoryForBlockName(name));
  return { by: null, art };
}

const chroma = (hex: string) => { const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]; if (!value) return 0; const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16)); return (Math.max(r, g, b) - Math.min(r, g, b)) / 255; };
const coloured = (hex: string | undefined): hex is string => Boolean(hex) && chroma(hex!) >= 0.12;

/** The colour a block wears in the UI: the colour of its pictogram (the enclosure, or for a black, white or
 *  grey box its coloured knobs, top, stripes or band), else its category colour. */
export function blockColour(name: string, category?: BlockCategory): string {
  const cat = category ?? categoryForBlockName(name);
  const art = inspirationFor(name, cat).art;
  if (art.shape === "nam" || art.shape === "ir") return BLOCK_CATEGORY_COLORS[cat];
  return [art.body, art.top, art.knob, ...(art.stripes ?? []), art.band, art.plate, art.screen, art.trim].find(coloured) ?? BLOCK_CATEGORY_COLORS[cat];
}

/** Short "inspired by" text, or null for HeadRush / ReValver / AIR originals. */
export const inspiredBy = (name: string) => inspirationFor(name).by;

/** The original as shown in the UI: always marked as a reference ("≈ Ibanez TS808"), never as the product. */
export const inspiredByLabel = (name: string) => { const by = inspiredBy(name); return by ? `≈ ${by}` : null; };

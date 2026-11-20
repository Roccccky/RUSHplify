/** Sorting and filtering rigs for LIBRARY. Rig colours follow the HeadRush habit (blue clean, yellow hot clean,
 *  orange crunch, red drive / high gain, green bass), so "by colour" orders rigs from clean to heavy. */
export type RigSort = "pedal" | "name" | "colour" | "tempo";
export type ToneFamily = "clean" | "hot" | "crunch" | "drive" | "bass" | "other";

export const RIG_SORTS: Array<{ value: RigSort; text: string }> = [
  { value: "pedal", text: "PEDAL" }, { value: "name", text: "A–Z" }, { value: "colour", text: "COLOUR" }, { value: "tempo", text: "BPM" },
];
export const TONE_FAMILIES: Array<{ id: ToneFamily; label: string; colour: string }> = [
  { id: "clean", label: "Clean", colour: "var(--rp-rig-clean)" },
  { id: "hot", label: "Hot clean", colour: "var(--rp-rig-hot)" },
  { id: "crunch", label: "Crunch", colour: "var(--rp-rig-crunch)" },
  { id: "drive", label: "Drive", colour: "var(--rp-rig-gain)" },
  { id: "bass", label: "Bass", colour: "var(--rp-rig-bass)" },
  { id: "other", label: "Other", colour: "var(--rp-off)" },
];
const ORDER: ToneFamily[] = TONE_FAMILIES.map((family) => family.id);

function hsl(hex: string): [number, number] | null {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1]; if (!value) return null;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), chroma = max - min;
  if (chroma < .12) return [0, 0];
  const hue = max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return [(hue * 60 + 360) % 360, chroma];
}

/** Tone family of a rig colour, from its hue. */
export function toneFamily(colour: string): ToneFamily {
  const parsed = hsl(colour); if (!parsed || parsed[1] === 0) return "other";
  const [hue] = parsed;
  if (hue >= 170 && hue < 245) return "clean";
  if (hue >= 45 && hue < 75) return "hot";
  if (hue >= 18 && hue < 45) return "crunch";
  if (hue >= 330 || hue < 18) return "drive";
  if (hue >= 75 && hue < 170) return "bass";
  return "other";
}

/** Sorted copy; ties keep the pedal order. */
export function sortRigs<T extends { name: string; color: string; tempo?: number }>(rigs: T[], sort: RigSort): T[] {
  const indexed = rigs.map((rig, index) => ({ rig, index }));
  const name = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const compare: Record<RigSort, (a: T, b: T) => number> = {
    pedal: () => 0,
    name,
    colour: (a, b) => ORDER.indexOf(toneFamily(a.color)) - ORDER.indexOf(toneFamily(b.color)) || (hsl(a.color)?.[0] ?? 0) - (hsl(b.color)?.[0] ?? 0) || name(a, b),
    tempo: (a, b) => (a.tempo ?? 0) - (b.tempo ?? 0) || name(a, b),
  };
  return indexed.sort((a, b) => compare[sort](a.rig, b.rig) || a.index - b.index).map((entry) => entry.rig);
}

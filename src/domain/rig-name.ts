/* Rig name suggestion from the chain, offline: amp or NAM capture, gain character, standout effects.
   Only characters the pedal keeps in file names (see pedalFileKey): letters, digits, space, "." and "-". */
import type { RigBlock } from "./types";
import { isNamBlock } from "./nam";

export const SUGGESTION_MAX_LENGTH = 32;
const CORE_MAX_LENGTH = 20;

type Gain = "Clean" | "Crunch" | "Lead";
const GAINS: Gain[] = ["Clean", "Crunch", "Lead"];

/** What the suggestion knows about a block beyond the chain: the loaded capture (TONE3000 title or .nam file). */
export type CaptureNames = Record<string, string | undefined>;

const DRIVE = new Set(["overdrive", "distortion", "drive"]);
const MOD = new Set(["chorus", "phaser", "vibrato", "modulation"]);
const NOISE = /\b(?:nam|capture|captures|profile|model|tone3000|neural amp modeler|standard|lite|feather|nano|a1|a2|v\d+)\b/gi;

/** Keep only what the pedal stores unchanged; collapse spaces, trim dots and dashes at the ends. */
export function pedalSafeName(raw: string): string {
  return raw.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .-]+/g, " ")
    .replace(/\s+/g, " ").trim().replace(/^[\s.-]+|[\s.-]+$/g, "");
}

const fileStem = (path: string) => (path.split("/").at(-1) ?? path).replace(/\.nam$/i, "").replace(/_/g, " ");

/** Cut at a word boundary. */
function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const words = text.split(" "); let out = "";
  for (const word of words) { const next = out ? `${out} ${word}` : word; if (next.length > max) break; out = next; }
  return (out || text.slice(0, max)).replace(/[\s.-]+$/g, "");
}

function captureName(block: RigBlock, captures: CaptureNames): string {
  const host = block.sourcePath ?? "";
  const known = captures[host];
  if (known) return known;
  const loaded = block.parameters.find((parameter) => parameter.id === "LoadedClone")?.value;
  return typeof loaded === "string" && loaded ? fileStem(loaded) : "";
}

function gainLevel(block: RigBlock): number | null {
  const knob = block.parameters.find((parameter) => typeof parameter.value === "number" && (/^(?:gain|drive|preamp)/i.test(parameter.id) || /^(?:gain|drive)$/i.test(parameter.label)));
  if (!knob || typeof knob.value !== "number") return null;
  const min = knob.min ?? 0; const max = knob.max ?? 10;
  return max > min ? (knob.value - min) / (max - min) : null;
}

function gainFromText(text: string): Gain | null {
  if (/clean|glass|sparkle|jazz/i.test(text)) return "Clean";
  if (/crunch|edge|break.?up|plexi|blues/i.test(text)) return "Crunch";
  if (/lead|high.?gain|hi.?gain|metal|djent|solo|5150|recto/i.test(text)) return "Lead";
  return null;
}

/** The parts the variants are built from; exported for tests. */
export function rigNameParts(blocks: readonly RigBlock[], captures: CaptureNames = {}) {
  const active = blocks.filter((block) => !block.empty && block.enabled).sort((a, b) => a.slot - b.slot);
  const nam = active.find((block) => isNamBlock(block) && captureName(block, captures));
  const amp = active.find((block) => block.category === "amp" && !isNamBlock(block)) ?? active.find((block) => block.category === "clone");
  const coreSource = nam ? captureName(nam, captures) : amp?.name ?? "";
  const core = cut(pedalSafeName(coreSource.replace(NOISE, " ")), CORE_MAX_LENGTH);
  const drives = active.filter((block) => DRIVE.has(block.category));

  let gain: Gain | null = null;
  const level = amp && !nam ? gainLevel(amp) : null;
  if (level !== null) gain = level < 0.4 ? "Clean" : level < 0.65 ? "Crunch" : "Lead";
  else gain = gainFromText(coreSource);
  if (drives.length) gain = gain ? GAINS[Math.min(2, GAINS.indexOf(gain) + 1)] : "Crunch";
  if (gain && new RegExp(`\\b${gain}\\b`, "i").test(core)) gain = null;

  const effects: string[] = [];
  if (drives.length) effects.push(cut(pedalSafeName(drives[0].name), 12));
  if (active.some((block) => block.category === "delay")) effects.push("Delay");
  if (active.some((block) => block.category === "reverb")) effects.push("Verb");
  if (active.some((block) => MOD.has(block.category))) effects.push("Mod");
  return { core, gain, effects };
}

/** Rig name suggestion; `variant` steps through alternative wordings (the suggest button). Never a name in `taken`. */
export function suggestRigName(blocks: readonly RigBlock[], options: { captures?: CaptureNames; variant?: number; taken?: readonly string[] } = {}): string {
  const { core, gain, effects } = rigNameParts(blocks, options.captures);
  const head = [core, gain].filter(Boolean).join(" ");
  const ambience = effects.filter((effect) => ["Delay", "Verb", "Mod"].includes(effect));
  const variants = [
    [head, effects.join(" ")],
    [head, ambience.join(" ")],
    [head],
    [[gain, effects[0]].filter(Boolean).join(" "), core],
  ].map((parts) => parts.filter(Boolean).join(" - ")).map((text) => cut(pedalSafeName(text), SUGGESTION_MAX_LENGTH)).filter(Boolean);
  const unique = [...new Set(variants)];
  const base = unique.length ? unique[((options.variant ?? 0) % unique.length + unique.length) % unique.length] : "New Rig";
  const taken = new Set((options.taken ?? []).map((name) => name.trim().toLocaleLowerCase()));
  if (!taken.has(base.toLocaleLowerCase())) return base;
  for (let number = 2; ; number += 1) {
    const candidate = `${cut(base, SUGGESTION_MAX_LENGTH - String(number).length - 1)} ${number}`;
    if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

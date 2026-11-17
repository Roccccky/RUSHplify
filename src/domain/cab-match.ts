import type { CloudTone } from "./types";

/** What a TONE3000 capture is, as far as the chain behind it cares. */
export type CaptureRole = "amp" | "fullrig" | "ir" | "pedal" | "outboard";

export function captureRole(tone: Pick<CloudTone, "gear" | "detectedType" | "captureType">): CaptureRole {
  if (/outboard/i.test(tone.gear ?? "")) return "outboard";
  const type = tone.detectedType ?? tone.captureType;
  if (type === "amp") return "amp";
  if (type === "ir") return "ir";
  if (type === "effect") return "pedal";
  return "fullrig";
}

/** Amp family → which cab IR file names belong to it. First family that matches the capture wins.
 *  `cab` also knows the factory IRs every Flex Prime ships with: Choptones ("CT-Bogie…", "CT-Brit…",
 *  "CT-Fend…", "CT-Vocs…") and Matched Cabs, named after the amp nicknames ("65 Black SR", "64 Fox AC30",
 *  "68 Plexiglas", "92 Flathill Dual" …). */
const CAB_FAMILIES: Array<{ id: string; amp: RegExp; cab: RegExp }> = [
  { id: "mesa", amp: /mesa|boogie|rectifier|\brecto|dual rec|triple rec|mark ?(?:i{1,3}|iv|v|iic)\b|lone ?star|triple crown|badlander/i, cab: /mesa|recto|boogie|bogie|lone ?star|flathill|\bm-2\b/i },
  { id: "5150", amp: /5150|evh|peavey|6505|invective/i, cab: /5150|evh|peavey/i },
  { id: "engl", amp: /engl|fireball|powerball|savage|invader/i, cab: /engl|angel pb/i },
  { id: "bogner", amp: /bogner|ecstasy|uberschall|shiva/i, cab: /bogner|bogna/i },
  { id: "marshall", amp: /marshall|jcm|plexi|jmp|jubilee|dsl|jvm|1959|2203|super lead|jtm ?45|friedman|\bbe-?100|splawn|soldano/i, cab: /marshall|1960|\bbrit|g12m|greenback|plexi|lead 800|acm 900|basic 100|\bj45\b|sl-100/i },
  { id: "vox", amp: /\bvox\b|ac ?30|ac ?15|matchless/i, cab: /\bvox\b|vocs|ac ?30|\bac hi boost|alnico blue|alnbl/i },
  { id: "fender", amp: /fender|twin|deluxe|bassman|princeton|bandmaster|super reverb|vibrolux|tweed|champ\b/i, cab: /fender|\bfend|twin|deluxe|jensen|tweed|black (?:lux|vib|prince|sr|duo|mini|shimmer)|bluesmaker/i },
  { id: "dumble", amp: /dumble|two.?rock|overdrive special|\bods\b|kingsley/i, cab: /dumble|two.?rock|marco|\bon-1\b/i },
  { id: "orange", amp: /orange|rockerverb|thunderverb|or ?120|tiny terror|ad ?30/i, cab: /orange|ppc|redhot ad30/i },
  { id: "diezel", amp: /diezel|herbert|vh4/i, cab: /diezel|herr demon/i },
  { id: "budda", amp: /budda|superdrive|verbmaster/i, cab: /budda/i },
];

/** Fallback by gain when no make matches: high gain → V30 4x12, else an open 1x12/2x12. */
const HIGH_GAIN = /high.?gain|metal|djent|lead|hi-?gain/i;
/** A neutral cab when nothing else fits: open 1x12 / 2x12, G12M or Jensen. */
const NEUTRAL_CAB = /g12m|2x12|212|1x12|112|jensen|greenback/i;

function toneText(tone: Pick<CloudTone, "title" | "tags" | "description" | "metadata" | "gear">): string {
  const makes = typeof tone.metadata?.filters === "string" ? tone.metadata.filters : "";
  const meta = Object.values(tone.metadata ?? {}).filter((value) => typeof value === "string").join(" ");
  return [tone.title, tone.tags.join(" "), tone.description, makes, meta].join(" ");
}

const fileName = (path: string) => path.split("/").at(-1) ?? path;

/** What a .nam file on the pedal is, read from its folder name (Amp / Full Rig / Pedal / Outboard, anywhere in the path). */
export function localCaptureRole(path: string): CaptureRole | null {
  if (/\/full[ _-]?rigs?\//i.test(path)) return "fullrig";
  if (/\/amps?\//i.test(path)) return "amp";
  if (/\/pedals?\//i.test(path)) return "pedal";
  if (/\/outboard\//i.test(path)) return "outboard";
  return null;
}

/** Factory IR folders on every Flex Prime, best first; any other folder is the user's own and comes before them. */
const FACTORY_IR_FOLDERS = ["matched cabs", "choptones", "headrush", "headrush cloud"];
const folderRank = (path: string) => {
  const parts = path.split("/");
  const folder = (parts.length > 2 ? parts.at(-2) ?? "" : "").toLowerCase();
  const factory = FACTORY_IR_FOLDERS.indexOf(folder);
  return factory < 0 ? 0 : factory + 1;
};

/** Best IR from the pedal's library for an amp capture; null only when the library is empty.
 *  `irs` are paths like "Impulse Responses/Matched Cabs/65 Black SR.wav". The user's own folders (any folder
 *  that is not a factory one, whatever its name) win, then Matched Cabs, then Choptones. Order of choice:
 *  same make → V30 4x12 for high gain → a neutral open-back / G12M cab → the first IR at all. */
export function matchCabIr(tone: Pick<CloudTone, "title" | "tags" | "description" | "metadata" | "gear">, irs: string[]): string | null {
  if (!irs.length) return null;
  const text = toneText(tone);
  const ranked = [...irs].sort((left, right) => folderRank(left) - folderRank(right) || left.localeCompare(right));
  const family = CAB_FAMILIES.find((item) => item.amp.test(text));
  if (family) {
    const hit = ranked.find((path) => family.cab.test(fileName(path)));
    if (hit) return hit;
  }
  const byName = (pattern: RegExp) => ranked.find((path) => pattern.test(fileName(path)));
  if (HIGH_GAIN.test(text)) return byName(/v30|412|4x12/i) ?? ranked[0];
  return byName(NEUTRAL_CAB) ?? ranked[0];
}

/** Make of an IR file, read from its name ("65 Black SR.wav" → fender), or null. */
export const cabFamilyOf = (path: string): string | null => CAB_FAMILIES.find((item) => item.cab.test(fileName(path)))?.id ?? null;

const sameFile = (left: string, right: string) => fileName(left).toLowerCase() === fileName(right).toLowerCase();

/** The IR to load when a new amp capture goes into a NAM slot, or null to keep the loaded one.
 *  `lastAuto` is the IR RUSHplify itself picked last time for this slot. An empty slot or an IR picked by
 *  RUSHplify always follows the new amp (Mesa → Fender → Orange …). An IR the user picked stays, unless it is
 *  clearly of another make than the new amp. */
export function nextCabIr(tone: Pick<CloudTone, "title" | "tags" | "description" | "metadata" | "gear">, irs: string[], loaded: string, lastAuto?: string): string | null {
  const pick = matchCabIr(tone, irs);
  if (!pick) return null;
  const hasFile = /\.wav$/i.test(loaded);
  if (hasFile && sameFile(loaded, pick)) return null;
  if (!hasFile || (lastAuto && sameFile(loaded, lastAuto))) return pick;
  const amp = capturesFamily(tone);
  const current = cabFamilyOf(loaded);
  return amp && current && amp !== current ? pick : null;
}

export const capturesFamily = (tone: Pick<CloudTone, "title" | "tags" | "description" | "metadata" | "gear">): string | null => CAB_FAMILIES.find((item) => item.amp.test(toneText(tone)))?.id ?? null;

/** What a NAM slot takes from TONE3000: amps and full rigs. */
export const slotCapture = (tone: Pick<CloudTone, "gear" | "detectedType" | "captureType">) => { const role = captureRole(tone); return role === "amp" || role === "fullrig"; };

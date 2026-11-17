import { DoorClosed, SlidersHorizontal } from "lucide-react";
import type { Parameter } from "../domain/types";
import { Knob, LeverSwitch, Param, RailToggle } from "../components/rp/controls";
import { cn } from "../lib/utils";

/** A section of the card: tiny caps label, optional on/off rail for the whole section, then its knobs. */
export interface ParamGroup { label: string; toggle?: string; icon?: React.ReactNode; ids: string[] }

/** NAM host, read like the pedal: what goes in, the gate, the tone stack, what comes out. `lane` "2" is the
 *  doubled second file. */
export const namGroups = (lane: "" | "2"): ParamGroup[] => [
  { label: "INPUT", ids: [`Input${lane}`, `CalibrateInput${lane}`] },
  { label: "GATE", toggle: `Gate${lane}`, icon: <DoorClosed size={11}/>, ids: [`Threshold${lane}`] },
  { label: "EQ", toggle: `EQ${lane}`, icon: <SlidersHorizontal size={11}/>, ids: [`Bass${lane}`, `Middle${lane}`, `Treble${lane}`] },
  { label: "OUTPUT", ids: [`Output${lane}`, `OutputMode${lane}`, `LightMode${lane}`] },
];

/** Any other block, sorted the way pedals are laid out: what drives it, how it is voiced, time and movement,
 *  switches, and finally what comes out. Matched on the parameter name (lane "2" suffix ignored). */
const SECTIONS: Array<[string, RegExp]> = [
  ["DRIVE", /^(?:gain|drive|dist(?:ortion)?|fuzz|sustain|boost|sens(?:itivity)?|thresh(?:old)?|ratio|attack|release|comp(?:ression)?|squash)\b/i],
  ["TONE", /^(?:bass|low|mid(?:dle)?|treble|high|presence|tone|bright|contour|hi ?cut|lo ?cut|resonance|q$|freq\w*|cut ?off|depth ?eq|voice|color|colour)\b/i],
  ["TIME", /^(?:time|delay|pre ?delay|feedback|repeats|decay|size|room|damp|diffusion|subdiv\w*|sync|tempo|note|spread|ducking|duck)\b/i],
  ["MOD", /^(?:rate|speed|depth|shape|wave|mod(?:ulation)?|intensity|width ?mod|vibrato|regen|manual|sweep|pitch|shift|semi|cents|interval|key|harmony)\b/i],
  ["OUTPUT", /^(?:mix|level|volume|master|output|blend|trim|dry|wet|pan|balance|width)\b/i],
];

export function autoGroups(parameters: Parameter[]): ParamGroup[] {
  const sorted = new Map<string, string[]>([...SECTIONS.map(([name]) => [name, []] as [string, string[]]), ["MORE", []]]);
  for (const parameter of parameters) {
    const name = parameter.label.replace(/\s*2$/, "");
    const section = SECTIONS.find(([, pattern]) => pattern.test(name))?.[0] ?? "MORE";
    sorted.get(section)!.push(parameter.id);
  }
  const more = sorted.get("MORE")!; sorted.delete("MORE");
  const order = [...sorted].filter(([name]) => name !== "OUTPUT");
  return [...order, ["MORE", more] as [string, string[]], ["OUTPUT", sorted.get("OUTPUT")!] as [string, string[]]]
    .filter(([, ids]) => ids.length).map(([label, ids]) => ({ label, ids }));
}

/** Knob panel: numbers are small NAMplify knobs (label turns into the value while touched), switches are
 *  rails, lists are wells. With `groups`, each group is a labelled row; without, all controls in one flow. */
export function ParamPanel({ parameters, groups, colour, className, onChange }: { parameters: Parameter[]; groups?: ParamGroup[]; colour?: string; className?: string; onChange: (id: string, value: Parameter["value"]) => void }) {
  const byId = new Map(parameters.map((parameter) => [parameter.id, parameter]));
  if (!groups) return <div className={cn("rp-knobs", className)}>{parameters.map((parameter) => <ParamControl key={parameter.id} parameter={parameter} colour={colour} onChange={onChange}/>)}</div>;
  return <div className={cn("rp-pgroups", className)}>{groups.map((group) => {
    const toggle = group.toggle ? byId.get(group.toggle) : undefined;
    const items = group.ids.flatMap((id) => byId.get(id) ?? []);
    if (!toggle && !items.length) return null;
    const off = toggle?.value === false;
    const units = Math.max(toggle ? 1.5 : 1, items.reduce((sum, parameter) => sum + (parameter.choices && parameter.choices.length > 4 ? 2 : parameter.choices && parameter.choices.length > 1 ? 1.85 : 1), 0));
    return <section key={group.label} className="rp-pgroup" data-off={off || undefined} aria-label={group.label} style={{ "--units": units } as React.CSSProperties}>
      <header className="rp-pgroup__head">{group.icon && <span className="rp-pgroup__icon" aria-hidden="true">{group.icon}</span>}<span className="rp-pgroup__label">{group.label}</span>{toggle && <RailToggle label={`${group.label} on`} on={toggle.value === true} colour={colour} disabled={toggle.writable === false} onChange={(next) => onChange(toggle.id, next)}/>}</header>
      <div className="rp-knobs">{items.map((parameter) => <ParamControl key={parameter.id} parameter={parameter} colour={colour} onChange={onChange}/>)}</div>
    </section>;
  })}</div>;
}

/** Labels without the lane number ("Input 2" → "Input"); the section already says which lane. */
const SHORT: Record<string, string> = { "calibrate input": "Calibrate", "gate threshold": "Thresh", "output mode": "Mode", "lite mode": "Lite", "tone eq": "EQ" };
const short = (label: string) => { const base = label.replace(/\s*2$/, ""); return SHORT[base.toLowerCase()] ?? base; };

const ABBREVIATIONS: Record<string, string> = { CALIBRATED: "CAL", NORMALIZE: "NORM", NORMALISE: "NORM", STEREO: "ST", SWITCH: "SW", SINGLE: "1×", DOUBLE: "2×", PARALLEL: "PAR", SERIAL: "SER", DISTORTION: "DIST", OVERDRIVE: "OD", BOOST: "BST", "1/16 SWING": "16", "1/8 SWING": "8", "1/4 SWING": "4", UNSTEADY: "UNS", BRIDGE: "BRDG", "FILL HOLD": "HOLD" };
/** Every lever is the same width, so its names must fit: 2 positions take 6 letters, 3 take 4, 4 take 3. */
export const leverText = (choice: string, positions: number) => {
  const text = choice.toUpperCase(); const room = positions <= 2 ? 6 : positions === 3 ? 4 : 3;
  return text.length <= room ? text : (ABBREVIATIONS[text] ?? text.slice(0, room));
};

/** One control, pedal style: numbers → small knob, on/off → rail, 2–4 choices → segment switch with its name
 *  below, longer lists and files → well. */
export function ParamControl({ parameter, colour, onChange }: { parameter: Parameter; colour?: string; onChange: (id: string, value: Parameter["value"]) => void }) {
  const label = short(parameter.label);
  if (typeof parameter.value === "number" && !parameter.choices && !parameter.deviceFile) {
    return <Knob small label={label} value={parameter.value} min={parameter.min ?? 0} max={parameter.max ?? 100} step={parameter.step} unit={parameter.unit} colour={colour} disabled={parameter.writable === false} reset={parameter.min !== undefined && parameter.max !== undefined ? (parameter.min + parameter.max) / 2 : undefined} onChange={(next) => onChange(parameter.id, next)}/>;
  }
  if (typeof parameter.value === "boolean") return <div className="rp-kswitch"><RailToggle label={label} on={parameter.value} colour={colour} disabled={parameter.writable === false} onChange={(next) => onChange(parameter.id, next)}/><span className="rp-kswitch__label">{label}</span></div>;
  const choices = parameter.choices ? [...new Set(parameter.choices)] : [];
  if (choices.length >= 2 && choices.length <= 4) {
    return <div className="rp-kseg"><LeverSwitch label={label} value={String(parameter.value)} colour={colour} disabled={parameter.writable === false} options={choices.map((choice) => ({ value: choice, text: leverText(choice, choices.length), title: choice }))} onChange={(next) => onChange(parameter.id, next)}/><span className="rp-kswitch__label">{label}</span></div>;
  }
  return <div className="rp-kwide"><Param parameter={{ ...parameter, label }} colour={colour} onChange={(next) => onChange(parameter.id, next)}/></div>;
}

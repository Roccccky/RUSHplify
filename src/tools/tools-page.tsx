import { ChevronDown, Drum, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";
import { TuningFork } from "../components/rp/fx-icon";
import { useEffect, useRef, useState } from "react";
import { Strobe, useTunerDisplay } from "./tuner-display";
export { noteFrequency, strobeRate } from "./tuner-display";
import { useAppStore } from "../stores/app-store";
import { cn } from "../lib/utils";
import { RailToggle, Segment } from "../components/rp/controls";
import { useDeviceTuner } from "../pages/performance-studio";
import { EqZone, MAIN_EQ } from "./eq-zone";
import { DRUMS, DrumsZone } from "./drums-zone";
import "../styles/rp-tools.css";

export type Tool = "tuner" | "drums" | "eq";

const TOOLS: Array<{ id: Tool; label: string; icon: ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }> }> = [
  { id: "tuner", label: "TUNER", icon: TuningFork },
  { id: "drums", label: "DRUMS", icon: Drum },
  { id: "eq", label: "GLOBAL EQ", icon: SlidersHorizontal },
];

/** Window event: open a tool (the header tuner icon). `detail.start` also switches the tool on. */
export const OPEN_TOOL = "rushplify:open-tool";
const STORAGE_KEY = "rushplify-tool";
let pending: { tool: Tool; start: boolean } | null = null;

/** Opens TOOLS on `tool`; works whether or not the page is mounted yet (lazy room). */
export function openTool(tool: Tool, start = false) {
  pending = { tool, start };
  window.dispatchEvent(new CustomEvent(OPEN_TOOL, { detail: pending }));
  useAppStore.getState().setPage("tools");
}

const remembered = (): Tool => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved === "tuner" || saved === "drums" || saved === "eq") return saved; } catch { /* convenience only */ } return "tuner"; };

/** TOOLS: left the tools (one LED each), centre the open tool in one zone. Same grammar as RIG, no Stage. */
export function ToolsPage() {
  const tree = useAppStore((state) => state.liveSubtree) ?? {};
  const tunerOn = useAppStore((state) => state.performanceTunerActive);
  const [tool, setTool] = useState<Tool>(() => pending?.tool ?? remembered());
  const [autostart, setAutostart] = useState(() => Boolean(pending?.start));
  useEffect(() => { pending = null; const onOpen = (event: Event) => { const detail = (event as CustomEvent<{ tool: Tool; start: boolean }>).detail; setTool(detail.tool); setAutostart(detail.start); pending = null; }; window.addEventListener(OPEN_TOOL, onOpen); return () => window.removeEventListener(OPEN_TOOL, onOpen); }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, tool); } catch { /* convenience only */ } }, [tool]);
  const lit: Record<Tool, boolean> = { tuner: tunerOn, drums: tree[DRUMS]?.value?.isPlaying === true, eq: tree[MAIN_EQ]?.value?.On === true };

  return <div className="rp-tools">
    <aside className="rp-side" aria-label="Tools"><div className="rp-side__body">
      <ol className="rp-rig-list rp-tools__list">{TOOLS.map((item) => { const Icon = item.icon; return <li key={item.id}>
        <button className={cn(tool === item.id && "on")} aria-current={tool === item.id || undefined} onClick={() => { setTool(item.id); setAutostart(false); }}><Icon size={14} aria-hidden="true"/><span>{item.label}</span><em className={cn("rp-dot", lit[item.id] && "on")} aria-label={lit[item.id] ? "On" : "Off"}/></button>
      </li>; })}</ol>
    </div></aside>
    <main className="rp-tools__centre">
      {tool === "tuner" && <TunerZone autostart={autostart}/>}
      {tool === "drums" && <DrumsZone object={tree[DRUMS]}/>}
      {tool === "eq" && <EqZone tree={tree}/>}
    </main>
  </div>;
}

const REFERENCES = [432, 435, 438, 440, 441, 442, 444];

/** The pedal's tuner as one NAMplify screen: note, cents, needle or strobe. Controls in the zone head. */
function TunerZone({ autostart }: { autostart: boolean }) {
  const tuner = useDeviceTuner();
  const { active, muted, readout, busy, muteBusy, error, cents, note, inTune } = tuner;
  const started = useRef(false);
  useEffect(() => { if (autostart && !active && !started.current) { started.current = true; void tuner.start(); } }, [autostart]);
  const offset = Math.max(-50, Math.min(50, cents));
  const [display, setDisplay] = useTunerDisplay();
  const readoutText = <>
    <strong className="rp-tuner__note" aria-live="polite">{note || "—"}</strong>
    <span className="rp-tuner__cents">{note ? `${cents > 0 ? "+" : ""}${cents}` : ""}</span>
  </>;
  return <section className="rp-zone rp-tuner" aria-label="Tuner" data-active={active}>
    <header className="rp-zone__head">
      <RailToggle label="Tuner" text="TUNER" on={active} disabled={busy} onChange={(next) => void (next ? tuner.start() : tuner.stop())}/>
      <span className="rp-grow"/>
      <Segment label="Tuner display" value={display} options={[{ value: "needle", text: "NEEDLE" }, { value: "strobe", text: "STROBE" }]} onChange={setDisplay}/>
      <Segment label="Tuner range" value={readout.TunerLow === true ? "bass" : "guitar"} options={[{ value: "guitar", text: "GUITAR" }, { value: "bass", text: "BASS" }]} onChange={(next) => void tuner.change("/Evil/Engine/FFTCtrl", "TunerLow", next === "bass")}/>
      <label className="rp-side__select rp-tuner__ref"><select aria-label="Reference" value={Number(readout.TunerRef ?? 440)} onChange={(event) => void tuner.change("/Evil/Engine/FFTCtrl", "TunerRef", Number(event.target.value))}>{REFERENCES.map((hz) => <option key={hz} value={hz}>{hz} Hz</option>)}</select><ChevronDown size={14}/></label>
      <RailToggle label="Mute outputs" text="MUTE" on={muted} disabled={!active || muteBusy} onChange={(next) => void tuner.changeMute(next)}/>
    </header>
    <div className="rp-tuner__screen" data-display={display} data-in-tune={inTune || undefined} data-signal={Boolean(note) || undefined}>
      {display === "strobe" ? <Strobe note={note} cents={tuner.exactCents} reference={Number(readout.TunerRef ?? 440)}>{readoutText}</Strobe> : <>
        {readoutText}
        <div className="rp-tuner__track" aria-hidden="true">
          {[-50, -25, 0, 25, 50].map((tick) => <i key={tick} style={{ left: `${50 + tick}%` }} data-centre={tick === 0 || undefined}/>)}
          {note && <b style={{ left: `${50 + offset}%` }}/>}
        </div>
      </>}
    </div>
    {error && <p className="rp-pcard__error" role="status">{error}</p>}
  </section>;
}

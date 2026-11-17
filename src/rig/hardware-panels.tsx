import { Pencil, Play, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { Fader, Segment } from "../components/rp/controls";
import { NameField } from "../components/rp/name-field";
import { colorForIndex } from "../domain/headrush-reflection";
import { expressionPedalCapabilities } from "../domain/expression-pedal";
import { deviceApi } from "../services/device-api";
import { deviceErrorDetail } from "../services/device-errors";
import { cn } from "../lib/utils";

const RIG = "/Evil/Engine/Patch/Rig";
const RIGS = "/Evil/API/Rigs";
const TEMPO = "/Evil/Engine/Tempo";
const MIDI_OUT = "/Evil/Engine/MIDIOutCtrl";
const numeric = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** The pedal keeps tempo normalized over 30–240 BPM. */
export const bpmOf = (raw: unknown) => Math.round((30 + numeric(raw, 0.4285714) * 210) * 100) / 100;
export const rawBpm = (bpm: number) => (Math.max(30, Math.min(240, bpm)) - 30) / 210;

/** One write to the pedal, then a fresh read of the RIG room; a refusal goes to DIAGNOSTICS. */
function useWrite(source: string) {
  const store = useAppStore(); const [busy, setBusy] = useState(false);
  const write = async (path: string, properties: Record<string, unknown>) => {
    setBusy(true);
    try { await deviceApi.setProperties(path, properties); await store.refreshPage("editor", "manual"); return true; }
    catch (error) { store.addDiagnostic({ level: "warning", source, message: `Could not change ${Object.keys(properties).join(", ")}`, detail: deviceErrorDetail(error) }); return false; }
    finally { setBusy(false); }
  };
  const call = async (method: string, args: unknown[]) => {
    setBusy(true);
    try { const response = await deviceApi.callMethod(MIDI_OUT, method, args); if ((response.body as { methodReturnValue?: unknown } | undefined)?.methodReturnValue === false) throw new Error(`${method} was refused by the pedal.`); await store.refreshPage("editor", "manual"); return true; }
    catch (error) { store.addDiagnostic({ level: "warning", source, message: `Could not ${method}`, detail: deviceErrorDetail(error) }); return false; }
    finally { setBusy(false); }
  };
  return { busy, write, call };
}

export function useMidiOutPresets() {
  const [presets, setPresets] = useState<string[]>([]);
  const reload = useCallback(async () => setPresets(await deviceApi.midiOutPresets().catch(() => [])), []);
  useEffect(() => { void reload(); }, [reload]);
  return { presets, reload };
}

function Pick({ label, value, options, disabled, onChange, className }: { label: string; value: string; options: Array<{ value: string; text?: string }>; disabled?: boolean; onChange: (value: string) => void; className?: string }) {
  return <span className={cn("rp-choice__well rp-hw__pick", className)}><select aria-label={label} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.text ?? option.value}</option>)}</select></span>;
}

/** Number typed in place; written on Enter or when the field loses focus. */
function NumberField({ label, value, min, max, empty, disabled, onCommit }: { label: string; value: number; min: number; max: number; empty?: number; disabled?: boolean; onCommit: (value: number) => void }) {
  const shown = empty !== undefined && value === empty ? "" : String(value);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const next = text.trim() === "" && empty !== undefined ? empty : Math.round(Number(text));
    if (!Number.isFinite(next)) { setText(shown); return; }
    const clamped = next === empty ? next : Math.max(min, Math.min(max, next));
    setText(empty !== undefined && clamped === empty ? "" : String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return <input className="rp-hw__num" aria-label={label} inputMode="numeric" disabled={disabled} value={text} placeholder={empty !== undefined ? "—" : undefined} onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); if (event.key === "Escape") { setText(shown); (event.target as HTMLInputElement).blur(); } }}/>;
}

const MESSAGE_TYPES = ["None", "Program Change", "Control Change", "Note-On", "Note-Off"];
const SHORT_TYPES = ["—", "PC", "CC", "NOTE ON", "NOTE OFF"];
const field = (base: string, lane: number) => `${base}${lane}`;

/** MIDI Out messages (HeadRush "MIDI Out Messages"): preset, five messages, test. APPLY assigns the preset
 *  to whatever opened the editor (rig, scene, footswitch); UNASSIGN clears it there. */
export function MidiOutEditor({ assigned, onAssign }: { assigned: string; onAssign: (name: string) => Promise<unknown> }) {
  const store = useAppStore(); const values = store.liveSubtree?.[MIDI_OUT]?.value ?? {};
  const { busy, write, call } = useWrite("MIDI Out");
  const { presets, reload } = useMidiOutPresets();
  const [lane, setLane] = useState(1);
  const [naming, setNaming] = useState(false);
  const loaded = String(values.LoadedPreset ?? "");
  const type = numeric(values[field("Type", lane)]);
  useEffect(() => { if (assigned && assigned !== loaded && presets.includes(assigned)) void call("loadPreset", [assigned, false]); }, [assigned, presets.join("|")]);
  const set = (base: string, value: number) => void write(MIDI_OUT, { [field(base, lane)]: value });
  const apply = async () => { if (!loaded) return; if (await call("saveCurrentPreset", [])) await onAssign(loaded); };

  return <div className="rp-midi" aria-label="MIDI Out messages">
    <div className="rp-midi__presets">
      {naming
        ? <NameField label="New MIDI Out preset" taken={presets} value="" placeholder="Preset name" onCancel={() => setNaming(false)} onSubmit={async (name) => { if (await call("createPreset", [name])) { await reload(); setNaming(false); } }}/>
        : <Pick label="MIDI Out preset" value={presets.includes(loaded) ? loaded : ""} disabled={busy} options={[{ value: "", text: "New preset" }, ...presets.map((name) => ({ value: name }))]} onChange={(name) => { if (name) void call("loadPreset", [name, false]); }}/>}
      <button type="button" className="rp-ibtn rp-ibtn--sm" aria-label="Save MIDI Out preset" disabled={busy || !loaded} onClick={() => void call("saveCurrentPreset", [])}><Save size={13}/></button>
      <button type="button" className="rp-ibtn rp-ibtn--sm" aria-label="New MIDI Out preset" disabled={busy} onClick={() => setNaming(true)}><Plus size={13}/></button>
      <button type="button" className="rp-ibtn rp-ibtn--sm" aria-label="Delete MIDI Out preset" disabled={busy || !loaded} onClick={() => void call("deletePreset", [loaded]).then(() => reload())}><Trash2 size={13}/></button>
    </div>
    <div className="rp-midi__lanes">
      <Segment label="MIDI message" value={lane} options={[1, 2, 3, 4, 5].map((index) => ({ value: index, text: String(index), mark: numeric(values[field("Type", index)]) > 0 ? <i className="rp-midi__dot"/> : undefined }))} onChange={setLane}/>
      <button type="button" className="rp-midi__test" disabled={busy} onClick={() => void call("test", [])}><Play size={11}/>TEST</button>
    </div>
    <div className="rp-midi__fields">
      <label><span>TYPE</span><Pick label="Message type" value={String(type)} disabled={busy} options={MESSAGE_TYPES.map((name, index) => ({ value: String(index), text: name }))} onChange={(next) => set("Type", Number(next))}/></label>
      {type > 0 && <label><span>CH</span><Pick label="MIDI channel" value={String(numeric(values[field("Chan", lane)], 1))} disabled={busy} options={Array.from({ length: 16 }, (_, index) => ({ value: String(index + 1) }))} onChange={(next) => set("Chan", Number(next))}/></label>}
      {type > 0 && <label><span>{type === 1 ? "PROG" : type === 2 ? "CC" : "NOTE"}</span><NumberField label={type === 1 ? "Program" : type === 2 ? "CC number" : "Note"} value={numeric(values[field("Val1", lane)])} min={0} max={127} disabled={busy} onCommit={(value) => set("Val1", value)}/></label>}
      {(type === 2 || type === 3 || type === 4) && <label><span>{type === 2 ? "VALUE" : "VEL"}</span><NumberField label={type === 2 ? "CC value" : "Velocity"} value={numeric(values[field("Val2", lane)])} min={0} max={127} disabled={busy} onCommit={(value) => set("Val2", value)}/></label>}
      {type === 1 && <label><span>MSB</span><NumberField label="Bank MSB" value={numeric(values[field("MSB", lane)], -1)} min={0} max={127} empty={-1} disabled={busy} onCommit={(value) => set("MSB", value)}/></label>}
      {type === 1 && <label><span>LSB</span><NumberField label="Bank LSB" value={numeric(values[field("LSB", lane)], -1)} min={0} max={127} empty={-1} disabled={busy} onCommit={(value) => set("LSB", value)}/></label>}
    </div>
    <div className="rp-midi__foot">
      <button type="button" className="rp-midi__btn" disabled={busy || !assigned} onClick={() => void onAssign("")}>UNASSIGN</button>
      <button type="button" className="rp-midi__btn rp-midi__btn--apply" disabled={busy || !loaded} onClick={() => void apply()}>APPLY</button>
    </div>
  </div>;
}

/** MIDI Out preset of a rig or scene: the name and an edit button; the caller shows the editor where it fits. */
export function MidiOutChoice({ label, value, disabled, open, onToggle, onAssign }: { label: string; value: string; disabled?: boolean; open: boolean; onToggle: () => void; onAssign: (name: string) => Promise<unknown> }) {
  const { presets } = useMidiOutPresets();
  return <span className="rp-hw__midi">
    <Pick label={label} value={value} disabled={disabled} options={[{ value: "", text: "—" }, ...[...new Set([...(value ? [value] : []), ...presets])].map((name) => ({ value: name }))]} onChange={(name) => void onAssign(name)}/>
    <button type="button" className={cn("rp-ibtn rp-ibtn--sm", open && "on")} aria-label={`Edit ${label}`} aria-expanded={open} onClick={onToggle}><Pencil size={12}/></button>
  </span>;
}

/** HeadRush "Hardware Assign" head: rig tempo (current or fixed), program number, MIDI Out on rig load. */
export function RigMidi() {
  const store = useAppStore(); const tree = store.liveSubtree ?? {};
  const rig = tree[RIG]?.value ?? {}; const rigs = tree[RIGS]?.value ?? {};
  const { busy, write } = useWrite("Rig MIDI");
  const fixed = rig.TempoFromMaster === false;
  const bpm = bpmOf(fixed ? rig.Tempo : tree[TEMPO]?.value?.Tempo ?? rig.Tempo);
  const prog = numeric(rigs.loadedProgMIDICC, -1);
  const free = Array.isArray(rigs.availableProgMIDICC) ? (rigs.availableProgMIDICC as unknown[]).map((item) => numeric(item, -1)).filter((item) => item >= 0) : [];
  const progs = [...new Set([...(prog >= 0 ? [prog] : []), ...free])].sort((a, b) => a - b);
  const midiOut = String(rig.MIDIOut ?? "");
  const [editing, setEditing] = useState(false);
  const assign = (name: string) => write(RIG, { MIDIOut: name });
  return <><div className="rp-hw" role="group" aria-label="Rig tempo and MIDI">
    <label className="rp-hw__cell"><span>TEMPO</span>
      <span className="rp-hw__tempo">
        <Segment label="Rig tempo" value={fixed ? "fixed" : "current"} disabled={busy} options={[{ value: "current", text: "CURRENT" }, { value: "fixed", text: "FIXED" }]} onChange={(next) => void write(RIG, next === "fixed" ? { TempoFromMaster: false, Tempo: rawBpm(bpm) } : { TempoFromMaster: true })}/>
        {fixed ? <NumberField label="Fixed tempo" value={Math.round(bpm)} min={30} max={240} disabled={busy} onCommit={(value) => void write(RIG, { Tempo: rawBpm(value) })}/> : <output className="rp-hw__bpm" aria-label="Current tempo">{bpm.toFixed(1)}</output>}
        <small>BPM</small>
      </span>
    </label>
    <label className="rp-hw__cell"><span>MIDI PROG</span>
      <Pick label="MIDI program" value={String(prog)} disabled={busy} options={[{ value: "-1", text: "—" }, ...progs.map((item) => ({ value: String(item) }))]} onChange={(next) => void write(RIGS, { loadedProgMIDICC: Number(next) })}/>
    </label>
    <div className="rp-hw__cell rp-hw__cell--send"><span>MIDI SEND</span>
      <MidiOutChoice label="MIDI send" value={midiOut} disabled={busy} open={editing} onToggle={() => setEditing(!editing)} onAssign={assign}/>
    </div>
  </div>
  {editing && <MidiOutEditor assigned={midiOut} onAssign={async (name) => { await assign(name); setEditing(false); }}/>}
  </>;
}

const ENGAGE_OFF = ["TOE UP", "TOE DOWN", "STOP"];
const percent = (value: unknown, fallback: number) => Math.round(numeric(value, fallback / 100) * 100);

/** One expression pedal lane: target, parameter, heel and toe in percent. */
function PedalLane({ pedal, lane, values, busy, write }: { pedal: 1 | 2; lane: number; values: Record<string, unknown>; busy: boolean; write: (properties: Record<string, unknown>) => Promise<unknown> }) {
  const module = String(values[`Module${lane}`] ?? "Unassigned") || "Unassigned";
  const param = String(values[`Param${lane}`] ?? "");
  const modules = Array.isArray(values[`ModuleList${lane}`]) ? (values[`ModuleList${lane}`] as unknown[]).map(String) : [module];
  const [params, setParams] = useState<string[]>([]);
  useEffect(() => { let disposed = false; setParams([]); if (module === "Unassigned") return; void deviceApi.pedalParams(pedal, lane, module).then((items) => { if (!disposed) setParams(items); }).catch(() => undefined); return () => { disposed = true; }; }, [pedal, lane, module]);
  const colour = numeric(values[`AssignmentColour${lane}`], -1);
  const assigned = module !== "Unassigned";
  return <li className={cn("rp-exp__lane", assigned && "on")}>
    <i style={colour >= 0 ? { background: colorForIndex(colour) } : undefined}/>
    <Pick label={`Lane ${lane} target`} value={module} disabled={busy} options={[...new Set([module, ...modules])].map((item) => ({ value: item, text: item === "Unassigned" ? "—" : item }))} onChange={(next) => void write({ [`Module${lane}`]: next, [`Param${lane}`]: "" })}/>
    {assigned && <Pick label={`Lane ${lane} parameter`} value={param} disabled={busy} options={[...(param ? [] : [{ value: "", text: "—" }]), ...[...new Set([...(param ? [param] : []), ...params])].map((item) => ({ value: item }))]} onChange={(next) => void write({ [`Param${lane}`]: next })}/>}
    {assigned && <span className="rp-exp__range">
      <NumberField label={`Lane ${lane} heel`} value={percent(values[`Min${lane}`], 0)} min={0} max={100} disabled={busy} onCommit={(value) => void write({ [`Min${lane}`]: value / 100 })}/>
      <small>–</small>
      <NumberField label={`Lane ${lane} toe`} value={percent(values[`Max${lane}`], 100)} min={0} max={100} disabled={busy} onCommit={(value) => void write({ [`Max${lane}`]: value / 100 })}/>
      <small>%</small>
    </span>}
  </li>;
}

/** Expression pedal card, compact like HeadRush: mode, A/B bank, the lanes as rows, Auto-Engage options. */
export function PedalCard({ pedal }: { pedal: 1 | 2 }) {
  const store = useAppStore(); const path = `/Evil/Engine/Pedal${pedal}`; const values = store.liveSubtree?.[path]?.value ?? {};
  const { busy, write } = useWrite("Expression");
  const put = (properties: Record<string, unknown>) => write(path, properties);
  const mode = pedal === 1 ? Math.max(0, Math.min(2, numeric(values.PedalMode))) as 0 | 1 | 2 : null;
  const capabilities = expressionPedalCapabilities(pedal, mode);
  const lanes = Array.from({ length: capabilities.assignmentLimit }, (_, index) => index + 1);
  const delay = Math.round(numeric(values.AutoEngageDelay) * 5000);
  // The fader moves locally; the pedal gets the value once the hand rests for a moment.
  const [delayShown, setDelayShown] = useState(delay);
  const delayTimer = useRef<number | undefined>(undefined);
  useEffect(() => setDelayShown(delay), [delay]);
  useEffect(() => () => window.clearTimeout(delayTimer.current), []);
  const changeDelay = (value: number) => { setDelayShown(value); window.clearTimeout(delayTimer.current); delayTimer.current = window.setTimeout(() => void put({ AutoEngageDelay: value / 5000 }), 250); };
  return <div className="rp-exp">
    <div className="rp-exp__head">
      {pedal === 1 && <Segment label="Pedal mode" value={mode ?? 0} disabled={busy} options={["CLASSIC", "ADVANCED", "AUTO-ENGAGE"].map((text, index) => ({ value: index, text }))} onChange={(index) => void put({ PedalMode: index })}/>}
      {capabilities.supportsBankSwitching && "PedalAssignmentEdit" in values && <Segment label="Pedal bank" value={numeric(values.PedalAssignmentEdit)} disabled={busy} options={[{ value: 0, text: "A" }, { value: 1, text: "B" }]} onChange={(index) => void put({ PedalAssignmentEdit: index })}/>}
    </div>
    <ol className="rp-exp__lanes" aria-label="Pedal targets">{lanes.map((lane) => <PedalLane key={lane} pedal={pedal} lane={lane} values={values} busy={busy} write={put}/>)}</ol>
    {capabilities.supportsAutoEngage && <div className="rp-exp__engage">
      <label className="rp-hw__cell"><span>OFF POSITION</span><Pick label="Off position" value={String(numeric(values.AutoEngageMode))} disabled={busy} options={ENGAGE_OFF.map((text, index) => ({ value: String(index), text }))} onChange={(next) => void put({ AutoEngageMode: Number(next) })}/></label>
      <Fader label="Off delay" value={delayShown} min={0} max={5000} step={10} unit="ms" onChange={changeDelay}/>
    </div>}
  </div>;
}

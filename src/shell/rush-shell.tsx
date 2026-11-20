import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Cloud, FilePlus2, RotateCcw, Save, Settings } from "lucide-react";
import { UNSAVED_RIG_ID, colorForIndex } from "../domain/headrush-reflection";
import { pedalSaveDialogOpen, useAppStore } from "../stores/app-store";
import { cn } from "../lib/utils";
import { preloadPage } from "../page-loaders";
import { Brand } from "../components/system/brand";
import { ConnectionOrb } from "../components/system/controls";
import { ShellNavigationContext } from "../components/system/shell-navigation";
import { Sep } from "../components/rp/controls";
import { TuningFork } from "../components/rp/fx-icon";
import { Button, Dialog, Input } from "../components/ui";
import { Display } from "./display";
import { SuggestButton } from "../components/rp/name-field";
import { NAME_MAX_LENGTH, NAME_PROBLEM_TEXT, nameProblem } from "../domain/names";
import { useRigNameSuggestion } from "../rig/use-rig-name-suggestion";
import { useRigNavigator, useSceneNavigator } from "./navigators";
import { MAIN_ROOMS, ROOMS, rememberedPage, rememberPage, roomForPage, type Room } from "./rooms";

const noNavigationToggle = { collapsed: false, toggle: () => undefined };

/**
 * RUSHplify frame: header with rooms (RIG · LIBRARY · TOOLS), rig and scene displays, NEW / SAVE,
 * device LED, cloud, tuner and ⚙ (SYSTEM); below it the room's sections; then the workspace.
 */
export function RushShell({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const page = useAppStore((state) => state.page);
  const setPage = useAppStore((state) => state.setPage);
  const device = useAppStore((state) => state.device);
  const live = useAppStore((state) => state.liveSnapshot);
  const pending = useAppStore((state) => state.pendingWrites.length);
  const applyPending = useAppStore((state) => state.applyPending);
  const testRigReturn = useAppStore((state) => state.testRigReturn);
  const auditioningToneId = useAppStore((state) => state.auditioningToneId);
  const tunerOn = useAppStore((state) => state.performanceTunerActive);
  const rig = useRigNavigator();
  const scene = useSceneNavigator();

  const deviceReady = Boolean(device && ["ready", "demo"].includes(device.status));
  const room = roomForPage(page);
  const openRoom = (target: Room) => setPage(target.id === room.id && target.sections.some((section) => section.page === page) ? page : rememberedPage(target));

  useEffect(() => { rememberPage(page); }, [page]);

  // Ctrl/⌘ + 1–3 switch rooms, Ctrl/⌘ + , opens settings.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const target = MAIN_ROOMS[Number(event.key) - 1];
      if (target) { event.preventDefault(); useAppStore.getState().setPage(rememberedPage(target)); }
      else if (event.key === ",") { event.preventDefault(); useAppStore.getState().setPage("settings"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = device?.status ?? "offline";
  const ledLabel = device ? `${device.name} · ${status === "demo" ? "demo session" : status}${live ? ` · CPU ${live.cpuPercent}%` : ""}` : "No device";

  return <ShellNavigationContext.Provider value={noNavigationToggle}>
    <div className={cn("app rp-app", !deviceReady && "app--offline")}>
      <header className="rp-top" inert={!deviceReady || undefined}>
        <Brand className="rp-top__brand"/>
        <nav className="rp-rooms" aria-label="Rooms">
          {MAIN_ROOMS.map((target, position) => <button key={target.id} type="button" className={cn(room.id === target.id && "on")} aria-current={room.id === target.id ? "page" : undefined} title={`${target.label} (Ctrl+${position + 1})`} onPointerEnter={() => preloadPage(rememberedPage(target))} onClick={() => openRoom(target)}>{target.label}</button>)}
        </nav>
        <div className="rp-top__displays">
          <Display className="rp-top__rig" name="Rig" items={rig.items} index={rig.index} onCommit={rig.commit} dirty={rig.dirty} disabled={!deviceReady} placeholder="No rig" onRename={rig.rename} taken={rig.names} suggest={rig.suggest}/>
          <Display className="rp-top__scene" name="Scene" items={scene.items} index={scene.index} onCommit={scene.commit} disabled={!deviceReady}/>
        </div>
        <div className="rp-top__actions">
          {testRigReturn && <button type="button" className="rp-btn" onClick={() => setPage("tone-cloud")} title="Open the tone browser"><RotateCcw size={14} aria-hidden="true"/>{auditioningToneId ? "AUDITION" : "RETURN"}</button>}
          {pending > 0 && <button type="button" className="rp-btn rp-btn--pri" onClick={() => void applyPending()} aria-label={`Apply ${pending} pending change${pending === 1 ? "" : "s"}`}>APPLY {pending}</button>}
          {deviceReady && <RigFileActions/>}
          <Sep/>
          <button type="button" className="rp-led" onClick={() => setPage("settings")} title={ledLabel} aria-label={`Device: ${ledLabel}. Open connection settings`}>
            <ConnectionOrb status={status}/><span>{device?.name ?? "OFFLINE"}</span>{live && <em>{live.cpuPercent}%</em>}
          </button>
          <Sep/>
          <button type="button" className={cn("rp-icon", page === "tone-cloud" && "on")} aria-label="HeadRush Cloud" title="HeadRush Cloud" onPointerEnter={() => preloadPage("tone-cloud")} onClick={() => void import("../rig/tone-bench").then((module) => module.openCloud())}><Cloud size={16} aria-hidden="true"/></button>
          <button type="button" className={cn("rp-icon", tunerOn && "on")} aria-label="Tuner" title="Tuner" onPointerEnter={() => preloadPage("tools")} onClick={() => void import("../tools/tools-page").then((module) => module.openTool("tuner", true))}><TuningFork size={16}/></button>
          <button type="button" className={cn("rp-icon", room.id === "system" && "on")} aria-label="System" aria-current={room.id === "system" ? "page" : undefined} title="System (Ctrl+,)" onClick={() => openRoom(ROOMS.find((item) => item.id === "system")!)}><Settings size={16} aria-hidden="true"/></button>
        </div>
      </header>
      {room.sections.length > 1 && <nav className="rp-sections" aria-label={`${room.label} sections`} inert={!deviceReady || undefined}>
        {room.sections.map((section) => <button key={section.page} type="button" className={cn(page === section.page && "on")} aria-current={page === section.page ? "page" : undefined} onPointerEnter={() => preloadPage(section.page)} onClick={() => setPage(section.page)}>{section.label}</button>)}
      </nav>}
      <main className="rp-main app-content">
        <div className="app-workspace" aria-hidden={!deviceReady || undefined} inert={!deviceReady || undefined}>{children}</div>
        {overlay}
        <RigGuardDialog/>
        <RigNameDialog/>
      </main>
    </div>
  </ShellNavigationContext.Provider>;
}

/** HeadRush rig colours (index into the pedal palette). Factory use: blue clean, yellow hot clean,
 *  orange crunch, red drive / high gain, green bass. */
export const RIG_COLOURS = [
  { value: 1, name: "Green" }, { value: 2, name: "Bass green" }, { value: 3, name: "Yellow · hot clean" }, { value: 4, name: "Orange · crunch" },
  { value: 5, name: "Red · drive" }, { value: 6, name: "Pink" }, { value: 7, name: "Violet" }, { value: 8, name: "Blue" }, { value: 9, name: "Light blue · clean" },
];

/** The loaded rig's colour on the pedal (blue clean when unknown). */
function useRigColour() {
  const loaded = useAppStore((state) => state.liveSubtree?.["/Evil/API/Rigs"]?.value?.loadedColor);
  return typeof loaded === "number" && RIG_COLOURS.some((item) => item.value === loaded) ? loaded : 9;
}

export function RigColourPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="rp-rigcolours" role="radiogroup" aria-label="Rig colour">{RIG_COLOURS.map((item) => <button key={item.value} type="button" role="radio" aria-checked={value === item.value} aria-label={item.name} title={item.name} className={cn(value === item.value && "on")} style={{ "--swatch": colorForIndex(item.value) } as React.CSSProperties} onClick={() => onChange(item.value)}>{value === item.value && <Check size={12}/>}</button>)}</div>;
}

/** Optional setlist the saved rig also goes into (at its end). Every rig lands in the rig library anyway. */
export function SetlistPick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const setlists = useAppStore((state) => state.setlists);
  return <label className="rp-choice rp-savelist"><span className="rp-choice__name">SETLIST</span><span className="rp-choice__well"><select aria-label="Add to setlist" value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">—</option>{setlists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
  </select></span></label>;
}

/** NEW and SAVE of the loaded rig: one place, in the header next to the rig display. SAVE lights up red while
 *  the rig has unsaved changes; it stays usable on a rig made with NEW (that one asks for a name). */
export function RigFileActions() {
  const createRig = useAppStore((state) => state.createRig);
  const saveCurrentRig = useAppStore((state) => state.saveCurrentRig);
  const dirty = useAppStore((state) => state.liveSnapshot?.rig.modified === "Unsaved changes" || state.liveSnapshot?.rig.id === UNSAVED_RIG_ID);
  // On the pedal the live rig tells; in the demo every listed rig is a stored one.
  const stored = useAppStore((state) => state.liveSnapshot ? state.liveSnapshot.rig.id !== UNSAVED_RIG_ID : Boolean(state.selectedRigId));
  const name = useAppStore((state) => state.liveSnapshot?.rig.name ?? state.rigs.find((rig) => rig.id === state.selectedRigId)?.name ?? "");
  const [asking, setAsking] = useState(false);
  const current = useRigColour(); const [colour, setColour] = useState(current);
  const [setlist, setSetlist] = useState("");
  // A stored rig: overwrite it, or keep it and store the changes under a new name. A NEW rig asks for its name.
  const save = () => { setColour(current); setSetlist(""); if (stored) setAsking(true); else void saveCurrentRig().catch(() => undefined); };
  const overwrite = () => { setAsking(false); void saveCurrentRig(undefined, colour, setlist || undefined).catch(() => undefined); };
  const saveAsNew = () => { setAsking(false); useAppStore.setState({ rigNaming: { asNew: true, colour, setlistId: setlist || undefined } }); };
  return <>
    <button type="button" className="rp-btn" onClick={() => void createRig()} title="New rig"><FilePlus2 size={14} aria-hidden="true"/>NEW</button>
    <button type="button" className={cn("rp-btn", dirty && "rp-btn--pri")} onClick={save} title="Save the current rig on the pedal"><Save size={14} aria-hidden="true"/>SAVE</button>
    <Dialog open={asking} onClose={() => setAsking(false)} title="Save rig" description={name} width="420px"
      footer={<>
        <Button onClick={() => setAsking(false)}>Cancel</Button>
        <Button onClick={saveAsNew}>Save as new</Button>
        <Button variant="primary" onClick={overwrite}>Overwrite</Button>
      </>}><RigColourPicker value={colour} onChange={setColour}/><SetlistPick value={setlist} onChange={setSetlist}/></Dialog>
  </>;
}

/** The loaded rig has unsaved changes and another rig (or a new one) is about to replace it: ask here,
 *  like the pedal does on its own screen. */
function RigGuardDialog() {
  const guard = useAppStore((state) => !state.rigNaming && (state.rigGuard || pedalSaveDialogOpen(state.liveSubtree)));
  const name = useAppStore((state) => state.liveSnapshot?.rig.name ?? "");
  const resolveGuard = useAppStore((state) => state.resolveRigGuard);
  const resolve = (choice: "save" | "discard" | "cancel") => resolveGuard(choice).catch(() => undefined);
  return <Dialog open={Boolean(guard)} onClose={() => void resolve("cancel")} title="Unsaved changes" description={name} width="420px"
    footer={<>
      <Button onClick={() => void resolve("cancel")}>Cancel</Button>
      <Button onClick={() => void resolve("discard")}>Discard</Button>
      <Button variant="primary" onClick={() => void resolve("save")}>Save</Button>
    </>}>{null}</Dialog>;
}

/** SAVE on a rig made with NEW: the pedal stores it only under a name. */
function RigNameDialog() {
  const naming = useAppStore((state) => state.rigNaming);
  const save = useAppStore((state) => state.saveCurrentRig);
  const cancel = useAppStore((state) => state.cancelRigNaming);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const current = useRigColour(); const [colour, setColour] = useState(current);
  const [setlist, setSetlist] = useState("");
  useEffect(() => { if (naming) { setColour(naming.colour ?? current); setSetlist(naming.setlistId ?? ""); } }, [naming]);
  // Opens with a name suggested from the chain; the wand steps through further suggestions.
  const suggest = useRigNameSuggestion();
  const variant = useRef(0);
  const nextSuggestion = () => { setName(suggest(variant.current)); variant.current += 1; setProblem(null); };
  useEffect(() => { if (naming) { variant.current = 0; nextSuggestion(); } }, [naming]);
  const submit = async () => {
    if (!name.trim() || busy) return;
    const state = useAppStore.getState(); const taken = state.liveSnapshot?.rigLibrary.map((rig) => rig.name) ?? state.rigs.map((rig) => rig.name);
    const found = nameProblem(name, taken); if (found) { setProblem(NAME_PROBLEM_TEXT[found]); return; }
    setBusy(true); try { await save(name.trim(), colour, setlist || undefined); } catch { /* reported in diagnostics */ } finally { setBusy(false); }
  };
  return <Dialog open={Boolean(naming)} onClose={cancel} title={naming?.asNew ? "Save as new rig" : "Save rig"} width="420px"
    footer={<>
      <Button onClick={cancel}>Cancel</Button>
      <Button variant="primary" disabled={!name.trim() || busy} onClick={() => void submit()}>Save</Button>
    </>}>
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <RigColourPicker value={colour} onChange={setColour}/>
      <span className="rp-namefield rp-namefield--suggest rp-namefield--dialog">
        <Input aria-label="Rig name" autoFocus maxLength={NAME_MAX_LENGTH + 16} value={name} aria-invalid={Boolean(problem) || undefined} onChange={(event) => { setName(event.target.value); setProblem(null); }} placeholder="Rig name"/>
        <SuggestButton disabled={busy} onSuggest={nextSuggestion}/>
        {problem && <span className="rp-namefield__error" role="alert">{problem}</span>}
      </span>
      <SetlistPick value={setlist} onChange={setSetlist}/>
    </form>
  </Dialog>;
}

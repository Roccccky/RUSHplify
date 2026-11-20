import { blockColour } from "../domain/block-inspiration";
import { BookmarkX, Check, Copy, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { Button, Dialog } from "../components/ui";
import { ParameterControl } from "../components/system/controls";
import { EqGraph } from "../components/system/eq-graph";
import { ReflectionEditor } from "../components/system/reflection-editor";
import { LeverSwitch, RailToggle, Screen, Segment, type ScreenRow } from "../components/rp/controls";
import { BlockPicture } from "../components/rp/block-picture";
import { EditableName, NameField } from "../components/rp/name-field";
import { inspiredByLabel } from "../domain/block-inspiration";
import { ParamControl, ParamPanel, autoGroups, namGroups } from "./param-panel";
import type { HeadRushObject, Parameter, RigBlock } from "../domain/types";
import { BLOCK_CATEGORY_COLORS, BLOCK_CATEGORY_GROUPS, blockBelongsToCategoryGroup, categoryGroupForBlock } from "../domain/block-categories";
import { equalizerBands, slotEqualizerParameters } from "../domain/equalizer";
import { colorForIndex } from "../domain/headrush-reflection";
import { expressionPedalCapabilities } from "../domain/expression-pedal";
import { isNamBlock, isNamModule, parseNamModule } from "../domain/nam";
import { DEFAULT_TONE3000_FILTERS, deviceApi } from "../services/device-api";
import { captureRole, slotCapture } from "../domain/cab-match";
import { deviceErrorDetail, deviceErrorMessage } from "../services/device-errors";
import { cn } from "../lib/utils";
import { SceneEditor } from "./scene-editor";
import { MidiOutEditor, PedalCard, RigMidi } from "./hardware-panels";
import { switchPress } from "./switch-press";
import { DEMO_BLOCK_TYPES, blockChoicesFromModuleTypes, chainSlots, type BlockChoice } from "./block-catalogue";
import { fileFolder, fileRowLabel, fileStem, useDeviceLibrary } from "./device-library";

export type RoutingNode = "input" | "mix" | "output";
export const NODE_PATH: Record<RoutingNode, string> = { input: "/Evil/Engine/Patch/Input", mix: "/Evil/Engine/Patch/Mix", output: "/Evil/Engine/Patch/Output" };
const NODE_LABEL: Record<RoutingNode, string> = { input: "Input", mix: "Mix", output: "Output" };
const NODE_GROUPS: Record<RoutingNode, Array<{ label: string; properties: string[] }>> = {
  input: [{ label: "SOURCE", properties: ["RigInput", "InputGain", "Lock"] }, { label: "GATE", properties: ["GateThresh", "GateRelease", "FilterThreshold"] }, { label: "PITCH TRACKING", properties: ["PPTInGain", "PPTMono", "PPTRange", "PPTTrigThresh", "PPTEndThresh", "PPTRetrigger"] }],
  mix: [{ label: "PATH A", properties: ["Para1Level", "Para1Pan"] }, { label: "PATH B", properties: ["Para2Level", "Para2Pan"] }, { label: "MERGE", properties: ["ParaDelay", "ParaXFade"] }],
  output: [{ label: "OUTPUT", properties: ["RigVolume", "RigWidth"] }],
};

export const FOOTSWITCH = "/Evil/Engine/FootSwitch";
export const SWITCH_MODES = ["Toggle", "Hold", "Scene"] as const;
const SWITCH_COLOURS = ["Neutral", "Green", "Dark green", "Amber", "Orange", "Red", "Pink", "Violet", "Blue", "Cyan", "White", "Grey", "Aqua", "Black"];
export const numeric = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

type CardStyle = React.CSSProperties & { "--card-colour"?: string };

/** NAMplify card, read top to bottom: head (on/off, name, caption, tools) → what it is → how it sounds.
 *  No stompbox foot: on/off lives in the head. */
export function Card({ colour, enabled = true, power, caption, tools, title, className, children }: { colour?: string; enabled?: boolean; className?: string; power?: { label: string; on: boolean; onChange: (on: boolean) => void }; caption: string; tools?: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className={cn("rp-card rp-pcard", className)} data-enabled={enabled} style={colour ? { "--card-colour": colour } as CardStyle : undefined}>
    <header className="rp-pcard__top">
      {power && <RailToggle label={power.label} on={power.on} colour={colour} onChange={power.onChange}/>}
      <strong className="rp-pcard__title">{title}</strong>
      <small>{caption}</small>
      <span className="rp-grow"/>{tools}
    </header>
    <div className="rp-pcard__body">{children}</div>
  </div>;
}

function Tool({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return <button type="button" className={cn("rp-ibtn rp-ibtn--sm", danger && "rp-ibtn--danger")} aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

function useModuleChoices() {
  const reflected = useAppStore((store) => store.liveSubtree?.["/Evil/API/Blocks"]?.value?.ModuleTypes) as unknown[] | undefined;
  const moduleTypes = reflected?.length || deviceApi.isNative() ? reflected ?? [] : DEMO_BLOCK_TYPES;
  return useMemo(() => blockChoicesFromModuleTypes(moduleTypes), [moduleTypes]);
}

const NAM_HIDDEN = /^(?:LoadedClone|PresetName)/;
/** Shared by both lanes of a doubled block: they live in the card foot, not in a lane. */
const SHARED = new Set(["Doubling", "DoubleMode", "Width", "Balance"]);

export function BlockInspector({ block }: { block: RigBlock }) {
  const store = useAppStore();
  const [presets, setPresets] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [eqOpen, setEqOpen] = useState(false);
  const [presetNaming, setPresetNaming] = useState<"new" | "rename" | null>(null);
  useEffect(() => setPresetNaming(null), [block.id, block.name]);
  const nam = isNamBlock(block);
  useEffect(() => { if (nam) return; let disposed = false; void deviceApi.blockPresets(block.name).then((items) => { if (!disposed) setPresets(items); }).catch(() => undefined); return () => { disposed = true; }; }, [block.name, nam]);
  const choices = useModuleChoices();
  const group = categoryGroupForBlock(block.name, block.category);
  const groups = BLOCK_CATEGORY_GROUPS.filter((candidate) => candidate.id === group?.id || choices.some((choice) => blockBelongsToCategoryGroup(choice.name, candidate.id)));
  const groupIndex = Math.max(0, groups.findIndex((candidate) => candidate.id === group?.id));
  // NAM hosts 1 and 2 are the same model to the player: list it once (the second host is the one in use).
  const models = choices.filter((choice) => (group ? blockBelongsToCategoryGroup(choice.name, group.id) : choice.category === block.category)
    && !(isNamModule(choice.name) && (parseNamModule(choice.name)?.instance ?? 1) > 1 && choice.name !== block.name && !(nam && choice.name === block.name)))
    .filter((choice, index, list) => !(isNamModule(choice.name) && list.findIndex((other) => isNamModule(other.name)) !== index));
  const modelIndex = models.findIndex((choice) => choice.name === block.name);
  const eqParameters = slotEqualizerParameters(block.parameters); const eqIds = new Set(eqParameters.map((parameter) => parameter.id)); const eqBands = equalizerBands(eqParameters);
  const parameters = block.parameters.filter((parameter) => !eqIds.has(parameter.id) && !(nam && NAM_HIDDEN.test(parameter.id)));
  const param = (id: string) => block.parameters.find((parameter) => parameter.id === id);
  const doubled = block.doubled ?? param("Doubling")?.value === "Double";
  const doubleable = Boolean(block.canDouble || param("Doubling"));
  const isLane2 = (id: string) => /2$/.test(id) && parameters.some((parameter) => parameter.id === id.slice(0, -1));
  const laneParams = parameters.filter((parameter) => !SHARED.has(parameter.id));
  // The file of a lane (IR, clone, reverb file) is picked in the screen above, never again among the knobs.
  const file1 = nam ? undefined : laneParams.find((parameter) => parameter.deviceFile && !isLane2(parameter.id));
  const file2 = nam ? undefined : laneParams.find((parameter) => parameter.deviceFile && isLane2(parameter.id));
  const lane1 = laneParams.filter((parameter) => !isLane2(parameter.id) && !parameter.deviceFile);
  const lane2 = laneParams.filter((parameter) => isLane2(parameter.id) && !parameter.deviceFile);
  const stereo = parameters.filter((parameter) => parameter.id === "Width" || parameter.id === "Balance");
  const doubleMode = param("DoubleMode");
  const color = blockColour(block.name, block.category);
  const run = async (task: () => Promise<unknown>) => { setBusy(true); setError(null); try { await task(); } catch (failure) { setError(deviceErrorMessage(failure)); } finally { setBusy(false); } };
  const refresh = async () => setPresets(await deviceApi.blockPresets(block.name));
  const replace = (choice: BlockChoice | undefined) => { if (!choice || choice.name === block.name) return; void run(async () => { await store.addBlock({ ...choice, id: `slot-${block.slot + 1}`, slot: block.slot, enabled: true, empty: false, parameters: [] }); store.selectBlock(`slot-${block.slot + 1}`); }); };
  const switchGroup = (label: string) => { const target = groups.find((candidate) => candidate.label === label); if (!target || target.id === group?.id) return; replace(choices.filter((choice) => blockBelongsToCategoryGroup(choice.name, target.id)).sort((a, b) => a.name.localeCompare(b.name))[0]); };
  const presetOptions = ["", ...presets];
  const presetIndex = Math.max(0, presetOptions.indexOf(block.presetName && presets.includes(block.presetName) ? block.presetName : ""));
  const loadPreset = (name: string) => void run(() => store.loadBlockPreset(block.id, name));
  // Preset names are typed in place (NameField); errors stay in the field.
  const savePreset = async (name: string) => { if (!block.moduleTypeId) return; await deviceApi.createBlockPreset(block.name, block.moduleTypeId, name); await refresh(); setPresetNaming(null); };
  const renamePreset = async (name: string) => { if (!block.presetName) return; await deviceApi.renameBlockPreset(block.name, block.presetName, name); await refresh(); setPresetNaming(null); if (deviceApi.isNative()) await store.refreshFull("manual"); };
  const deletePreset = () => run(async () => { if (!block.presetName || !window.confirm(`Delete preset “${block.presetName}”?`)) return; await deviceApi.deleteBlockPreset(block.name, block.presetName); await refresh(); });
  const host = block.sourcePath ?? "/Evil/Engine/Patch/Neural_Amp_Modeler";
  // A capture kept on the pedal (SAVE, Keep, a recalled rig) is "On pedal"; TONE3000 only while a preview plays
  // or while the user browses TONE3000 for a slot without a stored capture.
  // A preview counts only while the slot still plays it (another preset or capture ends it).
  const preview = store.slotCaptures[host];
  const previewing = Boolean(preview) && (!deviceApi.isNative() || loadedCapture(store, block) === preview?.file);
  const [source, setSourceState] = useState<CaptureSource>(() => initialSource(previewing, SOURCE_MEMORY.get(host), loadedCapture(store, block)));
  const setSource = (next: CaptureSource) => { SOURCE_MEMORY.set(host, next); setSourceState(next); };
  const wasPreviewing = useRef(previewing);
  // A preview starting (a tone picked in the TONES list) switches SOURCE to TONE3000; it ending switches back.
  useEffect(() => { if (wasPreviewing.current && !previewing) setSource("local"); if (!wasPreviewing.current && previewing) setSource("tone3000"); wasPreviewing.current = previewing; }, [previewing]);
  const capture = useCapture(block, "", source);
  const pickSource = (next: CaptureSource) => { setSource(next); if (next === "tone3000") showToneList(); };
  const change = (id: string, value: Parameter["value"]) => store.updateParameter(block.id, id, value);
  const by = inspiredByLabel(block.name);
  const fileRow = useFileRow(file1, busy, change);

  const third: ScreenRow = nam
    ? source === "tone3000"
      // A TONE3000 capture plays as a preview until it is stored: PREVIEW in turquoise, STORE ON PEDAL at the end.
      ? { key: "capture", label: "Preview", accent: true, hint: true, text: store.slotProgress ? `Storing ${store.slotProgress}` : capture.value ? capture.text : "Pick in TONE3000 browser →", value: capture.value, disabled: busy || store.slotBusy, onOpen: showToneList,
        action: { text: "STORE ON PEDAL", label: "Store on pedal", disabled: busy || store.slotBusy || !store.slotCaptures[host], onClick: () => void store.keepToneOnPedal(block.id).then((path) => { if (path) setSource("local"); }) } }
      : { key: "capture", label: "Capture", text: capture.text, menu: capture.options.length ? capture.options : undefined, value: capture.value, disabled: busy || store.slotBusy || !capture.options.length, onPick: capture.pick, onStep: capture.step }
    : { key: "preset", label: "Preset", text: block.presetName || "Default", options: presetOptions, value: presetOptions[presetIndex], disabled: busy, onPick: loadPreset, onStep: presets.length ? (direction) => loadPreset(presetOptions[(presetIndex + direction + presetOptions.length) % presetOptions.length]) : undefined };

  const rows = (third: ScreenRow, locked = false): ScreenRow[] => [
    { key: "category", label: "Category", text: group?.label ?? block.category, options: locked ? undefined : groups.map((candidate) => candidate.label), value: group?.label, disabled: locked || busy || groups.length < 2, onPick: locked ? undefined : switchGroup, onStep: locked ? undefined : (direction) => switchGroup(groups[(groupIndex + direction + groups.length) % groups.length].label) },
    nam ? { key: "source", label: "Source", tag: !locked && source === "tone3000" ? "PREVIEW" : undefined, text: SOURCE_TEXT[locked ? "local" : source], options: locked ? undefined : ["local", "tone3000"], optionText: (value) => SOURCE_TEXT[value as CaptureSource], value: locked ? "local" : source, disabled: locked || busy, onPick: locked ? undefined : (value) => pickSource(value as CaptureSource), onStep: locked ? undefined : () => pickSource(source === "local" ? "tone3000" : "local") }
    : { key: "model", label: "Model", text: block.name, sub: by ?? undefined, menu: locked ? undefined : models.map((choice) => ({ value: choice.name, text: choice.name, sub: inspiredByLabel(choice.name) ?? undefined, picture: <BlockPicture name={choice.name} size={38}/> })), value: block.name, disabled: locked || busy || models.length < 2, onPick: locked ? undefined : (name) => replace(models.find((choice) => choice.name === name)), onStep: locked ? undefined : (direction) => replace(models[(modelIndex + direction + models.length) % models.length]) },
    third,
  ];
  const title = (group?.label ?? block.category).toUpperCase();
  const main = <Card colour={color} enabled={block.enabled} caption={`SLOT ${block.slot + 1}`} title={title}
    power={{ label: `${block.enabled ? "Bypass" : "Enable"} ${block.name}`, on: block.enabled, onChange: () => void store.toggleBlock(block.id) }}
    tools={<>
      {!nam && <>
        <Tool label="Save preset" disabled={busy || !block.moduleTypeId} onClick={() => setPresetNaming("new")}><Save size={14}/></Tool>
        <Tool label="Rename preset" disabled={!block.presetName} onClick={() => setPresetNaming("rename")}><Pencil size={14}/></Tool>
        <Tool label="Delete preset" disabled={!block.presetName} onClick={() => void deletePreset()}><BookmarkX size={14}/></Tool>
        <span className="rp-pcard__toolsep" aria-hidden="true"/>
      </>}
      <Tool label={`Remove ${block.name}`} disabled={busy} onClick={() => void run(() => store.removeBlock(block.id))}><Trash2 size={14}/></Tool>
    </>}>
    <div className="rp-pcard__now">
      <span className="rp-pcard__art">{nam && capture.image ? <img src={capture.image} alt=""/> : <BlockPicture name={block.name} size={56}/>}</span>
      <div className="rp-pcard__screencol">
        <Screen className="rp-pcard__screen" labelled rows={(fileRow ? [...rows(third), fileRow] : rows(third)).filter((row) => !(presetNaming && row.key === "preset"))}/>
        {presetNaming && !nam && <div className="rp-pcard__naming"><small aria-hidden="true">{presetNaming === "new" ? "SAVE AS" : "PRESET"}</small>
          <NameField label={presetNaming === "new" ? "New preset name" : "Preset name"} taken={presets} value={presetNaming === "rename" ? block.presetName ?? "" : ""} placeholder={`${block.name} preset`}
            onCancel={() => setPresetNaming(null)} onSubmit={presetNaming === "new" ? savePreset : renamePreset}/></div>}
      </div>
    </div>
    {(error || (nam && store.slotError)) && <p className="rp-pcard__error" role="alert">{error ?? store.slotError}</p>}
    {nam ? <ParamPanel parameters={parameters} groups={namGroups("")} colour={color} onChange={change}/> : lane1.length > 0 && <ParamPanel parameters={lane1} groups={autoGroups(lane1)} colour={color} onChange={change}/>}
    {(doubleable || eqBands.length > 0) && <footer className="rp-pcard__foot">
      {doubleable && <div className="rp-kseg"><LeverSwitch label="Doubling" value={doubled ? "Double" : "Single"} colour={color} disabled={busy} options={[{ value: "Single", text: "SINGLE" }, { value: "Double", text: "DOUBLE" }]} onChange={(next) => change("Doubling", next)}/><span className="rp-kswitch__label"><Copy size={9}/> Doubling</span></div>}
      {doubled && doubleMode && <ParamControl parameter={{ ...doubleMode, label: "Double mode" }} colour={color} onChange={change}/>}
      {doubled && stereo.map((parameter) => <ParamControl key={parameter.id} parameter={parameter} colour={color} onChange={change}/>)}
      {eqBands.length > 0 && <button type="button" className="rp-eqmini" aria-label="Graphic EQ" onClick={() => setEqOpen(true)}><EqGraph compact parameters={eqParameters}/><span className="rp-kswitch__label">EQ</span></button>}
    </footer>}
    <Dialog open={eqOpen} onClose={() => setEqOpen(false)} title={`${block.name} · EQ`} width="860px" footer={<Button variant="primary" onClick={() => setEqOpen(false)}>Done</Button>}>
      <div className="graphic-eq-dialog"><EqGraph parameters={eqParameters} onParameterChange={(parameter, next) => store.updateParameter(block.id, parameter.id, next)}/><div className="graphic-eq-controls">{eqParameters.map((parameter) => <ParameterControl compact key={parameter.id} parameter={parameter} onChange={(next) => store.updateParameter(block.id, parameter.id, next)}/>)}</div></div>
    </Dialog>
  </Card>;
  if (!doubled) return main;
  return <div className="rp-pcards">{main}<SecondCard block={block} nam={nam} file={file2} title={title} rows={rows} parameters={nam ? parameters : lane2} colour={color} run={run} onChange={change}/></div>;
}

/** The doubled second lane as a card of its own, built like the first: same picture, same screen, same
 *  sections. Category and model belong to the block, so they only show here. */
function SecondCard({ block, nam, file, title, rows, parameters, colour, run, onChange }: { block: RigBlock; nam: boolean; file?: Parameter; title: string; rows: (third: ScreenRow, locked?: boolean) => ScreenRow[]; parameters: Parameter[]; colour: string; run: (task: () => Promise<unknown>) => Promise<void>; onChange: (id: string, value: Parameter["value"]) => void }) {
  const capture = useCapture(block, "2", "local");
  const fileRow = useFileRow(file, false, onChange);
  const third: ScreenRow = nam
    ? { key: "capture2", label: "Capture", text: capture.text, menu: capture.options.length ? capture.options : undefined, value: capture.value, disabled: !capture.options.length, onPick: capture.pick, onStep: capture.step }
    : fileRow ?? { key: "lane", label: "Lane", text: "Second", disabled: true };
  return <Card className="rp-pcard--second" colour={colour} enabled={block.enabled} caption={`SLOT ${block.slot + 1} · 2ND`} title={title}>
    <div className="rp-pcard__now">
      <span className="rp-pcard__art">{nam && capture.image ? <img src={capture.image} alt=""/> : <BlockPicture name={block.name} size={56}/>}</span>
      <Screen className="rp-pcard__screen" labelled rows={rows(third, true)}/>
    </div>
    {nam ? <ParamPanel parameters={parameters} groups={namGroups("2")} colour={colour} onChange={onChange}/> : parameters.length > 0 && <ParamPanel parameters={parameters} groups={autoGroups(parameters)} colour={colour} onChange={onChange}/>}
  </Card>;
}

/** Screen row for a block's file (IR, clone, reverb file): every matching file on the pedal, grouped by folder.
 *  Picking or ◀ ▶ loads it right away; SAVE makes it part of the rig. */
function useFileRow(parameter: Parameter | undefined, busy: boolean, onChange: (id: string, value: Parameter["value"]) => void): ScreenRow | undefined {
  const paths = useDeviceLibrary(parameter);
  if (!parameter?.deviceFile) return undefined;
  const { startPath } = parameter.deviceFile;
  const loaded = typeof parameter.value === "string" ? parameter.value : "";
  const index = paths.indexOf(loaded);
  const pick = (path: string) => { if (path && path !== loaded) onChange(parameter.id, path); };
  return {
    key: `file-${parameter.id}`, label: fileRowLabel(parameter), text: loaded ? fileStem(loaded) : "—", sub: loaded ? fileFolder(loaded, startPath) : undefined,
    menu: paths.length ? paths.map((path) => ({ value: path, text: fileStem(path), sub: fileFolder(path, startPath) })) : undefined,
    value: loaded, disabled: busy || parameter.writable === false || !paths.length, onPick: pick,
    onStep: paths.length ? (direction) => pick(paths[index < 0 ? (direction > 0 ? 0 : paths.length - 1) : (index + direction + paths.length) % paths.length]) : undefined,
  };
}

const stem = (path: string) => (path.split("/").at(-1) ?? path).replace(/\.nam$/i, "");

/** The capture in a NAM lane. Loaded from TONE3000 in this session → its variants; otherwise the .nam files
 *  next to the loaded one on the pedal. */
export type CaptureSource = "local" | "tone3000";

/** The .nam file a NAM host plays: live from the pedal, else from the rig. */
function loadedCapture(store: ReturnType<typeof useAppStore.getState>, block: RigBlock, lane: "" | "2" = "") {
  const host = block.sourcePath ?? "/Evil/Engine/Patch/Neural_Amp_Modeler";
  const reflected = deviceApi.isNative() ? store.liveSubtree?.[host]?.value?.[`LoadedClone${lane}`] : undefined;
  return typeof reflected === "string" ? reflected : String(block.parameters.find((parameter) => parameter.id === `LoadedClone${lane}`)?.value ?? "");
}

/** SOURCE when the card opens: TONE3000 while a preview plays, or when the user last browsed TONE3000 for a
 *  slot that has no capture stored on the pedal; otherwise On pedal. */
export function initialSource(previewing: boolean, remembered: CaptureSource | undefined, loaded: string): CaptureSource {
  if (previewing) return "tone3000";
  const stored = /\.nam$/i.test(loaded) && !/\/\.demo\//.test(loaded);
  return remembered === "tone3000" && !stored ? "tone3000" : "local";
}
/** TONE3000 has no end: the card does not list it, the TONES list on the right does. */
export const SHOW_TONE_LIST = "rushplify:show-tone-list";
/** The source picked per NAM host, kept while the card is rebuilt (switching the right-hand list remounts it). */
const SOURCE_MEMORY = new Map<string, CaptureSource>();
const showToneList = () => { window.dispatchEvent(new Event(SHOW_TONE_LIST)); window.setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="Search tones"]')?.focus(), 60); };
const SOURCE_TEXT: Record<CaptureSource, string> = { local: "On pedal", tone3000: "TONE3000 online" };
const folderOf = (path: string) => path.slice(0, path.lastIndexOf("/")).replace(/^Neural Amp Modeler\/?/, "") || "Neural Amp Modeler";

/** The capture in a NAM lane, from one of two sources: the .nam files on the pedal, or TONE3000 (amps and
 *  full rigs only). Picking or stepping loads it into the slot right away; SAVE makes it part of the rig. */
function useCapture(block: RigBlock, lane: "" | "2", source: CaptureSource) {
  const store = useAppStore();
  const host = block.sourcePath ?? "/Evil/Engine/Patch/Neural_Amp_Modeler";
  const loaded = loadedCapture(store, block, lane);
  const session = lane === "" ? store.slotCaptures[host] : undefined;
  const tone = session && (session.file === loaded || !deviceApi.isNative()) ? session.tone : undefined;
  const tones = useMemo(() => store.tones.filter((item) => item.source === "Tone3000" && slotCapture(item)), [store.tones]);

  useEffect(() => { if (source === "local") void store.loadNamLibrary(); }, [source]);
  useEffect(() => { if (source === "tone3000" && !tones.length && deviceApi.isNative() && store.device && !store.toneLoading) void store.refreshToneServices("", false, { ...DEFAULT_TONE3000_FILTERS, gear: ["amp", "full-rig"] }, "Tone3000"); }, [source]);

  if (source === "tone3000") {
    const options = tones.map((item) => ({ value: item.id, text: item.title, sub: `${captureRole(item) === "fullrig" ? "Amp+Cab" : "Amp"} · @${item.author}`, picture: item.imageUrl ? <img src={item.imageUrl} alt=""/> : <BlockPicture name="Neural Amp Modeler" size={38}/> }));
    const index = options.findIndex((item) => item.value === tone?.id);
    const pick = (id: string) => { const next = tones.find((item) => item.id === id); if (next && next.id !== tone?.id) void store.loadToneIntoSlot(block.id, next); };
    return { text: tone ? `${tone.title}${session?.model.name && (store.toneModels[tone.id]?.length ?? 0) > 1 ? ` · ${session.model.name}` : ""}` : "—", image: tone?.imageUrl, options, value: tone?.id, pick,
      step: (direction: -1 | 1) => options.length && pick(options[(Math.max(-1, index) + direction + options.length) % options.length].value) };
  }
  const library = store.namLibrary.length ? store.namLibrary : loaded ? [loaded] : [];
  const options = library.map((path) => ({ value: path, text: stem(path), sub: folderOf(path) }));
  const index = options.findIndex((item) => item.value === loaded);
  const pick = (path: string) => { if (path !== loaded) void store.loadLocalCapture(block.id, path, lane); };
  return { text: loaded ? stem(loaded) : "—", image: tone?.imageUrl, options, value: loaded, pick,
    step: (direction: -1 | 1) => options.length && pick(options[(Math.max(-1, index) + direction + options.length) % options.length].value) };
}

export function NodeInspector({ node, object }: { node: RoutingNode; object?: HeadRushObject }) {
  return <Card caption="RIG" title={NODE_LABEL[node].toUpperCase()}>
    {object ? NODE_GROUPS[node].map((group) => <section key={group.label} className="rp-pcard__group"><h4>{group.label}</h4><ReflectionEditor path={NODE_PATH[node]} object={object} include={group.properties} appearance="knobs" refreshPage="editor" emptyText="—"/></section>) : <EmptyLed/>}
  </Card>;
}

function EmptyLed() { return <div className="rp-pcard__empty" aria-hidden="true"><i className="rp-dot"/></div>; }

function useWriter(path: string, source: string) {
  const store = useAppStore(); const [busy, setBusy] = useState(false);
  const write = async (properties: Record<string, unknown>) => { setBusy(true); try { await deviceApi.setProperties(path, properties); await store.refreshPage("editor", "manual"); } catch (error) { store.addDiagnostic({ level: "warning", source, message: "Could not update assignment", detail: deviceErrorDetail(error) }); } finally { setBusy(false); } };
  return { busy, write };
}

function Choice({ label, value, options, disabled, onChange }: { label: string; value: string; options: Array<{ value: string; disabled?: boolean }>; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="rp-choice rp-choice--row"><span className="rp-choice__name">{label}</span><span className="rp-choice__well"><select aria-label={`Footswitch ${label.toLowerCase()}`} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.value || "—"}</option>)}</select></span></label>;
}

/** Footswitch n (1–6; 1–3 = bank A, 4–6 = bank B): behaviour, target, action, LED colour. */
export function SwitchInspector({ number }: { number: number }) {
  const store = useAppStore(); const fs = store.liveSubtree?.[FOOTSWITCH]?.value ?? {};
  const { busy, write } = useWriter(FOOTSWITCH, "Footswitches");
  const mode = numeric(fs[`ModeNew${number}`]); const module = String(fs[`Module${number}`] ?? "Unassigned"); const operation = String(fs[`Operation${number}`] ?? "");
  const label = String(fs[`FootSwitchText${number}`] ?? `FS ${number}`); const colour = numeric(fs[`FootSwitchColour${number}`]);
  const modules = Array.isArray(fs[`ModuleList${number}`]) ? (fs[`ModuleList${number}`] as unknown[]).map(String) : [];
  const [operations, setOperations] = useState<Array<{ label: string; isDisabled: boolean }>>([]);
  useEffect(() => { let disposed = false; setOperations([]); if (module === "Unassigned" || !store.liveSubtree) return; void deviceApi.footswitchOperations(number - 1, module).then((items) => { if (!disposed) setOperations(items); }).catch(() => undefined); return () => { disposed = true; }; }, [number, module]);
  // The pedal drops a target without an action when the rig is saved, so a new target takes its first action.
  const target = async (next: string) => {
    const first = next === "Unassigned" ? undefined : await deviceApi.footswitchOperations(number - 1, next).then((items) => items.find((item) => !item.isDisabled)?.label).catch(() => undefined);
    await write({ [`Module${number}`]: next, [`Operation${number}`]: first ?? "" });
  };
  const bank = number <= 3 ? "A" : "B"; const position = ((number - 1) % 3) + 1;
  const { on, press } = switchPress(fs, number, (store.liveSnapshot?.rig ?? store.rigs.find((rig) => rig.id === store.selectedRigId) ?? store.rigs[0])?.blocks ?? []);
  const [naming, setNaming] = useState(false);
  const renamable = fs[`FootSwitchTextEditable${number}`] !== false;
  const blocks = chainSlots((store.liveSnapshot?.rig ?? store.rigs.find((rig) => rig.id === store.selectedRigId) ?? store.rigs[0])?.blocks ?? []);
  // A scene switch keeps its LED in MacroColour (1-based) too; both are written so pedal and strip agree.
  const paint = (index: number) => write(mode === 2 ? { [`FootSwitchColour${number}`]: index, [`MacroColour${number}`]: index + 1 } : { [`FootSwitchColour${number}`]: index });
  return <Card colour={colorForIndex(colour)} enabled={on} caption={`FOOTSWITCH ${position} · BANK ${bank}`} title={label}
    power={{ label: `Press footswitch ${position}`, on, onChange: () => { if (!busy) void press?.().catch(() => undefined); } }}>
    <RigMidi/>
    <div className="rp-pcard__stack">
      <div className="rp-choice rp-choice--row rp-fsname"><span className="rp-choice__name">NAME</span>
        <EditableName label="Footswitch name" value={label} editing={naming} onEditingChange={setNaming} disabled={busy || !renamable} textClassName="rp-fsname__text" onRename={(name) => write({ [`FootSwitchText${number}`]: name })}/>
        {!naming && <button type="button" className="rp-ibtn rp-ibtn--sm" aria-label="Rename footswitch" disabled={busy || !renamable} onClick={() => setNaming(true)}><Pencil size={13}/></button>}
      </div>
      <Segment label="Footswitch mode" value={mode} disabled={busy} options={SWITCH_MODES.map((name, index) => ({ value: index, text: name.toUpperCase() }))} onChange={(index) => void write({ [`ModeNew${number}`]: index })}/>
      {mode !== 2 && <>
        <Choice label="TARGET" value={module} disabled={busy || !modules.length} options={(modules.length ? modules : [module]).map((item) => ({ value: item }))} onChange={(next) => void target(next)}/>
        {module !== "Unassigned" && <Choice label="ACTION" value={operation} disabled={busy || !operations.length} options={[...(!operation ? [{ value: "" }] : []), ...(operations.length ? operations : operation ? [{ label: operation, isDisabled: false }] : []).map((item) => ({ value: item.label, disabled: item.isDisabled }))]} onChange={(next) => void write({ [`Module${number}`]: module, [`Operation${number}`]: next })}/>}
      </>}
      {mode !== 2 && module === "MIDI Out" && <MidiOutEditor assigned={operation === "New/Edit..." ? "" : operation} onAssign={(name) => write(name ? { [`Module${number}`]: "MIDI Out", [`Operation${number}`]: name } : { [`Module${number}`]: "Unassigned", [`Operation${number}`]: "" })}/>}
      {mode === 2 && <SceneEditor number={number} blocks={blocks} busy={busy} write={write}/>}
      <div className="rp-swatches" role="radiogroup" aria-label="LED colour">{SWITCH_COLOURS.map((name, index) => <button key={name} role="radio" aria-checked={colour === index} aria-label={name} title={name} style={{ "--swatch": colorForIndex(index) } as React.CSSProperties} className={cn(colour === index && "on")} onClick={() => void paint(index)}>{colour === index && <Check size={10}/>}</button>)}</div>
    </div>
  </Card>;
}

/** Expression pedal (1 = onboard, 2 = external): mode, A/B bank, targets, Auto-Engage. No pedal picture. */
export function PedalInspector({ pedal }: { pedal: 1 | 2 }) {
  const store = useAppStore(); const object = store.liveSubtree?.[`/Evil/Engine/Pedal${pedal}`];
  return <Card caption="EXPRESSION" title={pedal === 1 ? "Expression pedal" : "External pedal"}>
    {object || !deviceApi.isNative() ? <PedalCard pedal={pedal}/> : <EmptyLed/>}
  </Card>;
}

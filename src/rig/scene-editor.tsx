import { Plus } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../stores/app-store";
import { Segment } from "../components/rp/controls";
import { MidiOutChoice, MidiOutEditor } from "./hardware-panels";
import { blockColour } from "../domain/block-inspiration";
import { deviceApi } from "../services/device-api";
import { deviceErrorDetail } from "../services/device-errors";
import { cn } from "../lib/utils";
import type { RigBlock } from "../domain/types";

const FOOTSWITCH = "/Evil/Engine/FootSwitch";
const numeric = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
/** Scene mode per slot on the pedal: 0 = no change (follow the rig), 1 = on, 2 = off. */
export const SCENE_MODES = [{ value: 0, text: "—" }, { value: 1, text: "ON" }, { value: 2, text: "OFF" }];
export type SceneMode = 0 | 1 | 2;

/** Key prefix of the scene state shown: state 1 has none, state 2 is "State2". */
export const scenePrefix = (fs: Record<string, unknown>, scene: number) => numeric(fs[`SceneNumberOfStates${scene}`], 1) === 2 && numeric(fs[`SceneState${scene}`]) === 1 ? "State2" : "";

/** What scene n (its current state) does to each slot (0-based): only slots it switches on or off. */
export function sceneChanges(fs: Record<string, unknown>, scene: number): Record<number, 1 | 2> {
  const prefix = scenePrefix(fs, scene);
  const changes: Record<number, 1 | 2> = {};
  for (let slot = 1; slot <= 14; slot += 1) {
    const mode = numeric(fs[`${prefix}Scene${scene}_${slot}_Mode`]);
    if (mode === 1 || mode === 2) changes[slot - 1] = mode;
  }
  return changes;
}

const SPLIT_ROUTINGS = new Set([1, 2, 3, 4]);

/** Scene footswitch: switch states 1/2, per block NO CHANGE / ON / OFF plus preset, path switch. */
export function SceneEditor({ number, blocks, busy, write }: { number: number; blocks: RigBlock[]; busy: boolean; write: (properties: Record<string, unknown>) => Promise<void> }) {
  const store = useAppStore();
  const fs = store.liveSubtree?.[FOOTSWITCH]?.value ?? {};
  const states = numeric(fs[`SceneNumberOfStates${number}`], 1) === 2 ? 2 : 1;
  const state = states === 2 && numeric(fs[`SceneState${number}`]) === 1 ? 2 : 1;
  const prefix = state === 2 ? "State2" : "";
  const routing = numeric(store.liveSubtree?.["/Evil/Engine/Patch/Chain"]?.value?.Routing);
  const pathKey = `${prefix}ScenePathSwitch${number}`;
  const [presets, setPresets] = useState<{ slot: number; options: string[] } | null>(null);
  const midiKey = `${prefix}SceneMIDIOut${number}`;
  const [midiOpen, setMidiOpen] = useState(false);

  const addState = async () => {
    try {
      await deviceApi.callMethod(FOOTSWITCH, "createNewSceneState", [number - 1, 0]);
      await write({ [`SceneNumberOfStates${number}`]: 2, [`SceneState${number}`]: 1 });
    } catch (error) {
      store.addDiagnostic({ level: "warning", source: "Scenes", message: "Could not add a second scene state", detail: deviceErrorDetail(error) });
    }
  };
  const openPresets = async (slot: number, effect: string, current: string) => {
    if (presets?.slot === slot) { setPresets(null); return; }
    setPresets({ slot, options: [...new Set(["No Preset", current])] });
    const list = await deviceApi.blockPresets(effect).catch(() => [] as string[]);
    setPresets((open) => open?.slot === slot ? { slot, options: [...new Set(["No Preset", current, ...list])] } : open);
  };

  // Scene keys count slots 1–14 on the pedal: the block's slot, not its place in the list.
  const used = blocks.filter((block) => !block.empty).map((block) => ({ block, slot: block.slot + 1 })).sort((a, b) => a.slot - b.slot);
  return <div className="rp-scene">
    <div className="rp-scene__states" role="group" aria-label="Switch state">
      <span className="rp-choice__name">STATE</span>
      {Array.from({ length: states }, (_, index) => index + 1).map((value) => <button key={value} type="button" className={cn("rp-scene__state", state === value && "on")} aria-pressed={state === value} disabled={busy} onClick={() => void write({ [`SceneState${number}`]: value - 1 })}>{value}</button>)}
      {states === 1 && <button type="button" className="rp-scene__state rp-scene__state--add" aria-label="Add switch state" disabled={busy} onClick={() => void addState()}><Plus size={13}/></button>}
    </div>
    <ol className="rp-scene__blocks" aria-label="Scene blocks">{used.map(({ block, slot }) => {
      const modeKey = `${prefix}Scene${number}_${slot}_Mode`;
      const presetKey = `${prefix}Scene${number}Slot${slot}Preset`;
      const mode = numeric(fs[modeKey]) as SceneMode;
      const preset = String(fs[presetKey] ?? "No Preset") || "No Preset";
      return <li key={block.id} data-mode={mode}>
        <i style={{ background: blockColour(block.name, block.category) }}/>
        <span className="rp-scene__name">{block.name}</span>
        <button type="button" className={cn("rp-scene__preset", preset !== "No Preset" && "set")} aria-label={`${block.name} preset`} aria-expanded={presets?.slot === slot} disabled={busy} onClick={() => void openPresets(slot, block.name, preset)}>{preset === "No Preset" ? "—" : preset}</button>
        <Segment label={`${block.name} in scene`} value={mode} disabled={busy} options={SCENE_MODES} onChange={(value) => void write({ [modeKey]: value })}/>
        {presets?.slot === slot && <div className="rp-scene__presets" role="listbox" aria-label={`${block.name} presets`}>{presets.options.map((option) => <button key={option} type="button" role="option" aria-selected={option === preset} className={cn(option === preset && "on")} onClick={() => { setPresets(null); void write({ [presetKey]: option }); }}>{option}</button>)}</div>}
      </li>;
    })}</ol>
    <div className="rp-choice rp-choice--row rp-scene__midi"><span className="rp-choice__name">MIDI OUT</span>
      <MidiOutChoice label="Scene MIDI out" value={String(fs[midiKey] ?? "")} disabled={busy} open={midiOpen} onToggle={() => setMidiOpen(!midiOpen)} onAssign={(name) => write({ [midiKey]: name })}/>
    </div>
    {midiOpen && <MidiOutEditor assigned={String(fs[midiKey] ?? "")} onAssign={async (name) => { await write({ [midiKey]: name }); setMidiOpen(false); }}/>}
    {SPLIT_ROUTINGS.has(routing) && pathKey in fs && <div className="rp-choice rp-choice--row"><span className="rp-choice__name">PATH</span>
      <Segment label="Path switch" value={numeric(fs[pathKey])} disabled={busy} options={[{ value: 0, text: "—" }, { value: 1, text: "A" }, { value: 2, text: "B" }]} onChange={(value) => void write({ [pathKey]: value })}/>
    </div>}
  </div>;
}

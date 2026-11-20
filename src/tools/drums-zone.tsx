import { Pause, Play, RotateCcw, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HeadRushObject, Parameter } from "../domain/types";
import { parameterDeviceValue, parametersForObject } from "../domain/headrush-reflection";
import { deviceApi } from "../services/device-api";
import { deviceErrorMessage } from "../services/device-errors";
import { useAppStore } from "../stores/app-store";
import { Footswitch, Screen, type ScreenRow } from "../components/rp/controls";
import { ParamPanel, type ParamGroup } from "../rig/param-panel";
import { cn } from "../lib/utils";
import { DEMO_DRUMS } from "./drums-demo";

export const DRUMS = "/Evil/Engine/DrumsCtrl";
const COLOUR = "#e8c34a";

/** The drum machine's knobs, grouped like the pedal's drum page. */
const GROUPS: ParamGroup[] = [
  { label: "TEMPO", ids: ["Tempo", "AutoTempo", "CountIn"] },
  { label: "MIX", ids: ["Vol", "KickVol", "SnareVol", "TomVol", "CymbVol"] },
  { label: "SOUND", ids: ["Tune", "Timbre", "Intensity", "Drive", "Reverb"] },
  { label: "GROOVE", ids: ["Groove", "GrooveDepth", "Length"] },
  { label: "FILLS", toggle: "AutoFill", ids: ["Mode", "FillMode", "AutoFillRate"] },
  { label: "ACCENT", ids: ["AccentSel", "AccentLevel", "AccentOneshot", "AccQuantise"] },
  { label: "PEDAL", ids: ["AutoPedal"] },
];
const LABELS: Record<string, string> = {
  Vol: "Volume", KickVol: "Kick", SnareVol: "Snare", TomVol: "Toms", CymbVol: "Cymbals", AutoTempo: "Sync", CountIn: "Count",
  GrooveDepth: "Depth", Mode: "FS mode", FillMode: "Fill", AutoFillRate: "Every", AccentSel: "Accent", AccentLevel: "Level",
  AccentOneshot: "1 shot", AccQuantise: "Quant", AutoPedal: "Auto", AutoFill: "Auto fill",
};

const truthy = (value: unknown) => value === true || Number(value) > 0;
const returned = (body: unknown) => { const result = (body as { methodReturnValue?: unknown } | null)?.methodReturnValue ?? body; if (typeof result !== "string") return result; try { return JSON.parse(result); } catch { return result; } };

/** DRUMS: the pedal's drum machine as one zone. Transport and beat LEDs in the head, a screen for style,
 *  pattern, kit and preset, four footswitches to perform, then the knobs in sections (as on a block card). */
export function DrumsZone({ object: reflected }: { object?: HeadRushObject }) {
  const store = useAppStore();
  const object = reflected ?? (deviceApi.isNative() ? undefined : DEMO_DRUMS);
  const [live, setLive] = useState<Record<string, unknown>>(object?.value ?? {});
  const [presets, setPresets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  useEffect(() => { if (object?.value) setLive((current) => ({ ...current, ...object.value })); }, [object]);
  const merged = useMemo<HeadRushObject | undefined>(() => object ? { ...object, value: { ...object.value, ...live } } : undefined, [object, live]);
  const parameters = useMemo(() => parametersForObject(merged).map((parameter) => ({ ...parameter, label: LABELS[parameter.id] ?? parameter.label })), [merged]);
  const byId = new Map(parameters.map((parameter) => [parameter.id, parameter]));
  const playing = truthy(live.isPlaying); const muted = truthy(live.isMuted); const filling = truthy(live.isFillEngaged);
  const beat = Number(live.currentBeat ?? -1); const bar = Number(live.currentBar ?? -1);
  const beats = Math.max(1, Math.min(8, Number(live.beatCount) || 4));

  const pull = useCallback(async () => { const next = await deviceApi.properties(DRUMS); if (Object.keys(next).length) setLive((current) => ({ ...current, ...next })); }, []);
  const call = async (method: string, args: unknown[] = []) => {
    setError(null);
    // The demo has no drum engine: play and mute just flip.
    if (!deviceApi.isNative()) { if (method === "togglePlay") setLive((current) => ({ ...current, isPlaying: truthy(current.isPlaying) ? 0 : 1, currentBeat: 0, currentBar: 0 })); if (method === "toggleMute") setLive((current) => ({ ...current, isMuted: truthy(current.isMuted) ? 0 : 1 })); return; }
    try { await deviceApi.callMethod(DRUMS, method, args); if (deviceApi.isNative()) await pull(); else await store.refreshPage("tools", "manual"); }
    catch (reason) { setError(deviceErrorMessage(reason)); }
  };
  const change = async (id: string, value: Parameter["value"]) => {
    const parameter = byId.get(id); if (!parameter) return;
    const raw = parameterDeviceValue(parameter, value);
    setLive((current) => ({ ...current, [id]: raw })); setError(null);
    try { await deviceApi.setProperties(DRUMS, { [id]: raw }); await store.refreshPage("tools", "manual"); }
    catch (reason) { setError(deviceErrorMessage(reason)); }
  };

  // The pedal wants to know when its drum page is open; presets come from a method.
  useEffect(() => {
    void deviceApi.callMethod(DRUMS, "drumsPageOpened").catch(() => undefined);
    void deviceApi.callMethod(DRUMS, "presets").then((response) => { const list = returned(response.body); setPresets(Array.isArray(list) ? list.map(String) : []); }).catch(() => undefined);
    return () => { void deviceApi.callMethod(DRUMS, "drumsPageClosed").catch(() => undefined); };
  }, []);
  // Beat LEDs follow the pedal while it plays.
  useEffect(() => { if (!playing || !deviceApi.isNative()) return; const timer = window.setInterval(() => void pull().catch(() => undefined), 250); return () => window.clearInterval(timer); }, [playing, pull]);

  const choiceRow = (key: string, label: string, id: string): ScreenRow => {
    const parameter = byId.get(id); const choices = parameter?.choices ?? []; const value = String(parameter?.value ?? "");
    const index = choices.indexOf(value);
    return { key, label, text: value || "—", options: choices.length > 1 ? choices : undefined, value, disabled: choices.length < 2, onPick: (next) => void change(id, next), onStep: choices.length > 1 ? (direction) => void change(id, choices[(index + direction + choices.length) % choices.length]) : undefined };
  };
  const preset = String(live.LoadedPreset ?? "").split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? "";
  const presetIndex = presets.indexOf(preset);
  const rows: ScreenRow[] = [
    choiceRow("style", "Style", "StyleList"),
    choiceRow("pattern", "Pattern", "StyleVari"),
    choiceRow("kit", "Kit", "Kit"),
    { key: "preset", label: "Preset", text: preset || "—", options: presets.length ? presets : undefined, value: preset, disabled: !presets.length, onPick: (name) => void call("loadPreset", [name]), onStep: presets.length > 1 ? (direction) => void call("loadPreset", [presets[(presetIndex + direction + presets.length) % presets.length]]) : undefined },
  ];
  const knobs = parameters.filter((parameter) => GROUPS.some((group) => group.ids.includes(parameter.id) || group.toggle === parameter.id));

  return <section className="rp-zone rp-drums" aria-label="Drums" data-playing={playing || undefined} style={{ "--card-colour": COLOUR } as React.CSSProperties}>
    <header className="rp-zone__head rp-drums__head">
      <button type="button" className="rp-ibtn" aria-label="Restart" onClick={() => void call("restart")}><RotateCcw size={14}/></button>
      <button type="button" className={cn("rp-ibtn", muted && "rp-ibtn--on")} aria-label="Mute" aria-pressed={muted} onClick={() => void call("toggleMute")}><VolumeX size={14}/></button>
      <span className="rp-grow"/>
      <span className="rp-drums__bar" aria-label="Bar">{playing && bar >= 0 ? bar + 1 : "—"}</span>
      <ol className="rp-drums__beats" aria-label="Beat">{Array.from({ length: beats }, (_, index) => <li key={index} className={cn("rp-dot", playing && index === beat && "on", index === 0 && "rp-drums__one")}/>)}</ol>
    </header>
    <div className="rp-drums__top">
      <Screen className="rp-pcard__screen" labelled rows={rows}/>
      <button type="button" className={cn("rp-drums__play", playing && "on")} aria-label={playing ? "Stop" : "Play"} aria-pressed={playing} onClick={() => void call("togglePlay")}>{playing ? <Pause size={30} fill="currentColor"/> : <Play size={30} fill="currentColor"/>}<span>{playing ? "STOP" : "PLAY"}</span></button>
      <div className="rp-drums__pads" role="group" aria-label="Perform">
        <Footswitch label="Fill" caption="FILL" on={filling} colour={COLOUR} onClick={() => void call("playFill")}/>
        <div onPointerDown={() => { setHolding(true); void call("playAccent"); }} onPointerUp={() => { if (holding) { setHolding(false); void call("stopAccent"); } }} onPointerLeave={() => { if (holding) { setHolding(false); void call("stopAccent"); } }}>
          <Footswitch label="Accent" caption="ACCENT" on={holding} colour={COLOUR} onClick={() => undefined}/>
        </div>
        <Footswitch label="Bridge" caption="BRIDGE" on={false} colour={COLOUR} onClick={() => void call("playBridge")}/>
        <Footswitch label="Outro" caption="OUTRO" on={false} colour={COLOUR} onClick={() => void call("playOutro")}/>
      </div>
    </div>
    {error && <p className="rp-pcard__error" role="status">{error}</p>}
    {knobs.length > 0 && <ParamPanel parameters={knobs} groups={GROUPS} colour={COLOUR} onChange={(id, value) => void change(id, value)}/>}
  </section>;
}

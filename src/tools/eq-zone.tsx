import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HeadRushObject, Parameter } from "../domain/types";
import { parameterDeviceValue, parametersForObject } from "../domain/headrush-reflection";
import { deviceApi } from "../services/device-api";
import { deviceErrorMessage } from "../services/device-errors";
import { useAppStore } from "../stores/app-store";
import { RailToggle, Segment } from "../components/rp/controls";
import { EqGraph } from "../components/system/eq-graph";
import { ParamPanel, type ParamGroup } from "../rig/param-panel";
import { DEMO_EQ } from "./eq-demo";

export const MAIN_EQ = "/Evil/Engine/GlobalEQMain";
export const AMP_EQ = "/Evil/Engine/GlobalEQAmp";
const COLOUR = "#8fb4d8";
type Output = "main" | "amp";

const GROUPS: ParamGroup[] = [
  { label: "LOW", ids: ["Type1", "Freq1", "Gain1", "Q1"] },
  { label: "LOW MID", ids: ["Freq2", "Gain2", "Q2"] },
  { label: "HIGH MID", ids: ["Freq3", "Gain3", "Q3"] },
  { label: "HIGH", ids: ["Type4", "Freq4", "Gain4", "Q4"] },
  { label: "MASTER", ids: ["MasterGain"] },
];
const LABELS: Record<string, string> = { Type1: "Type", Type4: "Type", Freq1: "Freq", Freq2: "Freq", Freq3: "Freq", Freq4: "Freq", Gain1: "Gain", Gain2: "Gain", Gain3: "Gain", Gain4: "Gain", Q1: "Q", Q2: "Q", Q3: "Q", Q4: "Q", MasterGain: "Level" };
const PROPERTIES = GROUPS.flatMap((group) => group.ids);

/** GLOBAL EQ: the pedal's two output EQs (main L/R, amp out). Head: output, on/off, reset. A screen with the
 *  curve (drag the nodes), then one section per band, like a block card. */
export function EqZone({ tree }: { tree: Record<string, HeadRushObject> }) {
  const store = useAppStore();
  const [output, setOutput] = useState<Output>("main");
  const path = output === "main" ? MAIN_EQ : AMP_EQ;
  const reflected = tree[path] ?? (deviceApi.isNative() ? undefined : DEMO_EQ[output]);
  const [local, setLocal] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setLocal({}), [output, reflected]);
  const object = useMemo<HeadRushObject | undefined>(() => reflected ? { ...reflected, value: { ...reflected.value, ...local } } : undefined, [reflected, local]);
  const parameters = useMemo(() => parametersForObject(object, PROPERTIES).map((parameter) => ({ ...parameter, label: LABELS[parameter.id] ?? parameter.label })), [object]);
  const byId = new Map(parameters.map((parameter) => [parameter.id, parameter]));
  const on = object?.value?.On === true;

  const write = async (props: Record<string, unknown>) => {
    setLocal((current) => ({ ...current, ...props })); setError(null);
    try { await deviceApi.setProperties(path, props); await store.refreshPage("tools", "manual"); }
    catch (reason) { setError(deviceErrorMessage(reason)); }
  };
  const change = (id: string, value: Parameter["value"]) => { const parameter = byId.get(id); if (parameter) void write({ [id]: parameterDeviceValue(parameter, value) }); };
  const reset = async () => {
    setError(null);
    try {
      if (output === "main") await deviceApi.callMethod(path, "reset");
      else await deviceApi.setProperties(path, Object.fromEntries(Object.entries(object?.meta?.properties ?? {}).flatMap(([property, meta]) => meta.readOnly || meta["x-options"]?.default === undefined ? [] : [[property, meta["x-options"]?.default]])));
      setLocal({}); await store.refreshPage("tools", "manual");
    } catch (reason) { setError(deviceErrorMessage(reason)); }
  };
  const graph = parameters.filter((parameter) => /^(Freq|Gain|Q)\d$/.test(parameter.id));

  return <section className="rp-zone rp-geq" aria-label="Global EQ" data-off={!on || undefined} style={{ "--card-colour": COLOUR } as React.CSSProperties}>
    <header className="rp-zone__head">
      <RailToggle label="Global EQ on" text="EQ" on={on} colour={COLOUR} onChange={(next) => void write({ On: next })}/>
      <Segment label="Output" value={output} options={[{ value: "main", text: "MAIN" }, { value: "amp", text: "AMP OUT" }]} onChange={(next) => setOutput(next as Output)}/>
      <span className="rp-grow"/>
      <button type="button" className="rp-ibtn" aria-label="Reset flat" onClick={() => void reset()}><RotateCcw size={14}/></button>
    </header>
    <div className="rp-geq__screen"><EqGraph parameters={graph} onParameterChange={(parameter, next) => change(parameter.id, next)}/></div>
    {error && <p className="rp-pcard__error" role="status">{error}</p>}
    {parameters.length > 0 && <ParamPanel parameters={parameters} groups={GROUPS} colour={COLOUR} onChange={change}/>}
  </section>;
}

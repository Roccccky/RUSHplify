import { useAppStore } from "../stores/app-store";
import { colorForIndex } from "../domain/headrush-reflection";
import { expressionPedalCapabilities } from "../domain/expression-pedal";
import { cn } from "../lib/utils";
import { FOOTSWITCH, numeric } from "./inspector";
import { Footswitch, Sep } from "../components/rp/controls";
import { switchPress } from "./switch-press";

const SCENES = "ABCDEF";

/** Bottom of RIG: the rig's hardware assignments. All six footswitches (banks A and B
 * side by side, whatever the pedal) and the expression pedal (plus the external one when it is in use).
 * Clicking one opens it in the inspector; clicking the selected one again presses it where the app can
 * (see `switchPress`): a block switch toggles its block, a scene switch recalls its scene (A–F = switch 1–6). */
export function AssignStrip({ selectedSwitch, selectedPedal, onSwitch, onPedal }: { selectedSwitch: number | null; selectedPedal: 1 | 2 | null; onSwitch: (number: number) => void; onPedal: (pedal: 1 | 2) => void }) {
  const tree = useAppStore((store) => store.liveSubtree) ?? {};
  const fs = tree[FOOTSWITCH]?.value ?? {};
  const rig = useAppStore((store) => store.liveSnapshot?.rig ?? store.rigs.find((item) => item.id === store.selectedRigId) ?? store.rigs[0]);
  // One pedal like HeadRush; the external input only when the pedal is set to use it.
  const external = tree["/Evil/Engine/Settings/ExpressionPedal"]?.value?.ExternalPedalMode === true || tree["/Evil/Engine/Pedal1"]?.value?.ExternalPedalMode === true;
  const pedals: Array<1 | 2> = external ? [1, 2] : [1];
  return <section className="rp-zone rp-assign" aria-label="Hardware assignments">
    {(["A", "B"] as const).map((bank) => <div key={bank} className="rp-assign__group" role="group" aria-label={`Footswitch bank ${bank}`}>
      <b className="rp-assign__bank" aria-hidden="true">{bank}</b>
      <div className="rp-assign__switches">{(bank === "A" ? [1, 2, 3] : [4, 5, 6]).map((number, index) => {
        const mode = numeric(fs[`ModeNew${number}`]); const module = String(fs[`Module${number}`] ?? "Unassigned"); const operation = String(fs[`Operation${number}`] ?? "");
        const { on, press } = switchPress(fs, number, rig?.blocks ?? []); const label = String(fs[`FootSwitchText${number}`] ?? `FS ${index + 1}`);
        const detail = mode === 2 ? `Scene ${SCENES[number - 1]}` : module === "Unassigned" ? "" : operation ? `${module} · ${operation}` : module;
        const states = numeric(fs[`SceneNumberOfStates${number}`], 1) === 2 ? 2 : 1;
        const sceneLive = mode === 2 && on;
        return <div key={number} className="rp-assign__fs" title={detail || undefined}>
          <Footswitch label={`Footswitch ${index + 1}, bank ${bank}`} caption={label} on={on} selected={selectedSwitch === number} colour={mode === 2 || module !== "Unassigned" ? colorForIndex(numeric(fs[`FootSwitchColour${number}`])) : undefined} onClick={() => { if (selectedSwitch !== number) onSwitch(number); else void press?.().catch(() => undefined); }}/>
          {mode === 2 && <small className="rp-assign__scene" data-live={sceneLive || undefined}>SCENE {SCENES[number - 1]}{states === 2 ? ` · ${numeric(fs[`SceneState${number}`]) === 1 ? 2 : 1}/2` : ""}</small>}
        </div>;
      })}</div>
    </div>)}
    <Sep/>
    <div className="rp-assign__pedals">{pedals.map((pedal) => {
      const values = tree[`/Evil/Engine/Pedal${pedal}`]?.value ?? {};
      const mode = pedal === 1 ? Math.max(0, Math.min(2, numeric(values.PedalMode))) as 0 | 1 | 2 : null;
      const { supportsBankSwitching, assignmentLimit } = expressionPedalCapabilities(pedal, mode);
      const targets = Array.from({ length: assignmentLimit }, (_, index) => index + 1)
        .map((lane) => String(values[`Param${lane}`] ?? "").trim() || String(values[`Module${lane}`] ?? "").trim())
        .filter((name) => name && name.toLowerCase() !== "unassigned");
      const bank = supportsBankSwitching && "PedalAssignment" in values ? (values.PedalAssignment === true ? "B" : "A") : null;
      return <button key={pedal} type="button" className={cn("rp-exp-pedal", selectedPedal === pedal && "selected", targets.length > 0 && "on")} onClick={() => onPedal(pedal)} aria-label={pedal === 1 ? "Expression pedal" : "External pedal"} title={targets.join(" · ") || undefined}>
        <span className="rp-exp-pedal__shape" aria-hidden="true"/>
        <span className="rp-exp-pedal__text"><b>{pedal === 1 ? "EXP" : "EXT"}{bank && <em>{bank}</em>}</b><small>{targets[0] ?? "—"}{targets.length > 1 ? ` +${targets.length - 1}` : ""}</small></span>
      </button>;
    })}</div>
  </section>;
}

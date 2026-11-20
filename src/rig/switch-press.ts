import type { RigBlock } from "../domain/types";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";

const numeric = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

const MIX = "/Evil/Engine/Patch/Mix";
const CHAIN = "/Evil/Engine/Patch/Chain";
const TUNER_INPUT = "/Evil/Engine/AudioCtrl/Input";

/** What pressing footswitch n does from the app, and whether it is lit.
 *
 *  The pedal has no "press footswitch" call. `FootSwitchOn<n>` is the LED the pedal works out itself: writing
 *  it switches nothing (and flips the LEDs of the other assigned switches with it). So a press goes to the
 *  thing the switch controls, where that is known: a block's On, the tuner, a scene, path mix, doubling.
 *  Other targets (looper, tempo, hold functions, MIDI) can be assigned here but only pressed on the pedal. */
export function switchPress(fs: Record<string, unknown>, number: number, blocks: RigBlock[]): { on: boolean; press?: () => Promise<unknown> } {
  const led = fs[`FootSwitchOn${number}`] === true;
  const mode = numeric(fs[`ModeNew${number}`]);
  if (mode === 2) {
    const active = fs[`SceneActive${number}`] === true || numeric(fs.LastScene, -1) + 1 === number;
    return { on: active, press: () => useAppStore.getState().selectScene(number - 1) };
  }
  const module = String(fs[`Module${number}`] ?? "Unassigned");
  const operation = String(fs[`Operation${number}`] ?? "");
  const block = blocks.find((item) => !item.empty && item.name === module);
  if (block && operation === "On") return { on: block.enabled, press: () => useAppStore.getState().toggleBlock(block.id) };
  if (module === "Signal Chain") {
    const tree = useAppStore.getState().liveSubtree ?? {};
    const write = async (path: string, properties: Record<string, unknown>) => { await deviceApi.setProperties(path, properties); await useAppStore.getState().refreshPage("editor", "manual"); };
    if (operation.startsWith("Path Mix")) {
      // The pedal keeps this switch lit and shows the path by its colour (green A, orange A+B, red B).
      const fade = tree[MIX]?.value?.ParaXFade;
      if (typeof fade !== "number") return { on: led };
      return { on: true, press: () => write(MIX, { ParaXFade: fade >= 0.5 ? 0 : 1 }) };
    }
    if (operation.startsWith("Doubling")) {
      const doubled = tree[CHAIN]?.value?.DoubleSwitch === true;
      return { on: doubled, press: () => write(CHAIN, { DoubleSwitch: !doubled }) };
    }
  }
  if (module === "Tuner" || operation === "AccessTuner") {
    // Not the LED: it can stay lit while the tuner is off.
    const tuning = useAppStore.getState().liveSubtree?.[TUNER_INPUT]?.value?.TunerOn === true;
    return { on: tuning, press: async () => { await deviceApi.setDeviceTuner(!tuning); await useAppStore.getState().refreshPage("editor", "manual"); } };
  }
  return { on: led };
}

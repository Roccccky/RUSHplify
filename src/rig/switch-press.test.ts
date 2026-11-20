import { afterEach, describe, expect, it, vi } from "vitest";
import { switchPress } from "./switch-press";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";

const MIX = "/Evil/Engine/Patch/Mix";
const CHAIN = "/Evil/Engine/Patch/Chain";
const INPUT = "/Evil/Engine/AudioCtrl/Input";
const pedal = (tree: Record<string, Record<string, unknown>>) => {
  useAppStore.setState({ liveSubtree: Object.fromEntries(Object.entries(tree).map(([path, value]) => [path, { value }])), refreshPage: async () => {} } as never);
  return vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} } as never);
};
afterEach(() => { vi.restoreAllMocks(); useAppStore.setState({ liveSubtree: null } as never); });

describe("footswitch press from the app", () => {
  it("path switch: always lit (the colour shows the path), a press goes to the other path", async () => {
    const write = pedal({ [MIX]: { ParaXFade: 0 } });
    const fs = { Module4: "Signal Chain", Operation4: "Path Mix: A <Switch> B", ModeNew4: 0, FootSwitchOn4: true };
    const onA = switchPress(fs, 4, []);
    expect(onA.on).toBe(true);
    await onA.press?.();
    expect(write).toHaveBeenCalledWith(MIX, { ParaXFade: 1 });
    const back = pedal({ [MIX]: { ParaXFade: 1 } });
    await switchPress(fs, 4, []).press?.();
    expect(back).toHaveBeenCalledWith(MIX, { ParaXFade: 0 });
  });

  it("doubling switch toggles the chain's doubling", async () => {
    const write = pedal({ [CHAIN]: { DoubleSwitch: false } });
    const press = switchPress({ Module2: "Signal Chain", Operation2: "Doubling: A <Switch> B", ModeNew2: 0 }, 2, []);
    expect(press.on).toBe(false);
    await press.press?.();
    expect(write).toHaveBeenCalledWith(CHAIN, { DoubleSwitch: true });
  });

  it("tuner switch follows the pedal's tuner, not the LED", async () => {
    pedal({ [INPUT]: { TunerOn: false } });
    const tuner = vi.spyOn(deviceApi, "setDeviceTuner").mockResolvedValue();
    const press = switchPress({ Module3: "Unassigned", Operation3: "AccessTuner", ModeNew3: 0, FootSwitchOn3: true }, 3, []);
    expect(press.on).toBe(false);
    await press.press?.();
    expect(tuner).toHaveBeenCalledWith(true);
  });

  it("leaves other chain operations to the pedal", () => {
    pedal({ [MIX]: { ParaXFade: 0 } });
    expect(switchPress({ Module1: "Signal Chain", Operation1: "Both: A-B-C-D", ModeNew1: 0, FootSwitchOn1: true }, 1, []).press).toBeUndefined();
  });
});

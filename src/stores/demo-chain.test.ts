import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceApi } from "../services/device-api";
import type { LiveDeviceSnapshot, Rig, RigBlock } from "../domain/types";
import { chainRouting, useAppStore } from "./app-store";
import { demoDevice } from "../data/demo-data";

const block = (slot: number, name: string, category: RigBlock["category"]): RigBlock => ({ id: `b-${name}`, name, model: name, category, color: "", enabled: true, slot, parameters: [] });
const rig: Rig = {
  id: "rig", name: "Rig", author: "", color: "", tags: [], tempo: 120, favorite: false, modified: "",
  blocks: [block(0, "In", "input"), block(0, "Drive", "overdrive"), block(1, "Amp", "amp"), block(5, "Chorus", "chorus"), block(13, "Out", "output")],
} as Rig;
const routing: LiveDeviceSnapshot["routing"] = { id: 0, label: "Straight", stereo: false, tails: false, locked: false };

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
  useAppStore.setState({ rigs: [rig], selectedRigId: rig.id, liveSnapshot: { rig, routing } as LiveDeviceSnapshot, device: { ...demoDevice, status: "demo" }, rigHistory: {}, demoRouting: routing });
});
afterEach(() => vi.restoreAllMocks());

const chainAt = (slot: number) => useAppStore.getState().liveSnapshot?.rig.blocks.filter((item) => item.slot === slot && item.category !== "input" && item.category !== "output").map((item) => item.name);

describe("browser demo chain", () => {
  it("moves a block to an empty slot and swaps with an occupied one, without the pedal", async () => {
    const call = vi.spyOn(deviceApi, "callMethod");
    await useAppStore.getState().moveBlock(5, 9);
    expect(chainAt(9)).toEqual(["Chorus"]);
    expect(chainAt(5)).toEqual([]);
    expect(useAppStore.getState().selectedBlockId).toBe("slot-10");
    await useAppStore.getState().moveBlock(0, 1);
    expect(chainAt(1)).toEqual(["Drive"]);
    expect(chainAt(0)).toEqual(["Amp"]);
    expect(useAppStore.getState().liveSnapshot?.rig.blocks.filter((item) => item.category === "input" || item.category === "output")).toHaveLength(2);
    expect(useAppStore.getState().rigs[0].blocks).toEqual(useAppStore.getState().liveSnapshot?.rig.blocks);
    expect(useAppStore.getState().rigHistory.rig).toHaveLength(2);
    expect(call).not.toHaveBeenCalled();
  });

  it("applies routing, stereo and effect tails to the snapshot", async () => {
    const write = vi.spyOn(deviceApi, "setProperties");
    await useAppStore.getState().updateRouting({ Routing: 2 });
    await useAppStore.getState().updateRouting({ Tails: true });
    await useAppStore.getState().updateRouting({ RigIsStereo: true });
    expect(useAppStore.getState().liveSnapshot?.routing).toEqual({ id: 2, label: "Middle Split 5-3-3", stereo: true, tails: true, locked: false });
    expect(write).not.toHaveBeenCalled();
  });

  it("keeps its own routing when the demo has no live snapshot", async () => {
    useAppStore.setState({ liveSnapshot: null });
    await useAppStore.getState().updateRouting({ Routing: 4, Tails: true });
    expect(chainRouting(useAppStore.getState())).toEqual({ id: 4, label: "Immediate Split", stereo: false, tails: true, locked: false });
  });
});

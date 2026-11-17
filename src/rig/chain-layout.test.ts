import { describe, expect, it } from "vitest";
import { cablePath, chainLayout, mixAvailableForRouting, type Box } from "./chain-layout";

describe("HeadRush chain layout", () => {
  it("runs a straight chain as a Z: both rows left to right, IN top-left, OUT bottom-right", () => {
    const layout = chainLayout(0);
    expect(layout.columns).toBe(7);
    expect(layout.slots.slice(0, 7).map((slot) => [slot.row, slot.column])).toEqual([[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8]]);
    expect(layout.slots.slice(7).map((slot) => [slot.row, slot.column])).toEqual([[2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8]]);
    expect([layout.inRow, layout.outRow]).toEqual([1, 2]);
    expect(mixAvailableForRouting(0)).toBe(false);
  });

  it.each([[1, 3, 4, 3], [2, 5, 3, 3], [3, 7, 2, 3], [4, 0, 7, 0]])("places split %i as serial / A over B / serial", (routing, before, branch, after) => {
    const layout = chainLayout(routing);
    expect(layout.columns).toBe(before + branch + after);
    expect(layout.slots).toHaveLength(14);
    const lanes = layout.slots.map((slot) => slot.lane);
    expect(lanes.filter((lane) => lane === "a")).toHaveLength(branch);
    expect(lanes.filter((lane) => lane === "b")).toHaveLength(branch);
    expect(lanes.filter((lane) => lane === "serial")).toHaveLength(before + after);
    const a = layout.slots.filter((slot) => slot.lane === "a"); const b = layout.slots.filter((slot) => slot.lane === "b");
    expect(b.map((slot) => slot.column)).toEqual(a.map((slot) => slot.column));
    expect(new Set(layout.slots.map((slot) => `${slot.row}:${slot.column}`)).size).toBe(14);
    expect(mixAvailableForRouting(routing)).toBe(true);
  });

  it("draws the return cable from the end of row 1 back to the left edge before slot 8", () => {
    const tile = (row: number, column: number): Box => ({ left: 60 + column * 100, right: 140 + column * 100, top: row * 120, bottom: row * 120 + 90 });
    const slots = Array.from({ length: 14 }, (_, index) => index < 7 ? tile(0, index) : tile(1, index - 7));
    const path = cablePath(chainLayout(0), { left: 0, right: 44, top: 20, bottom: 70 }, { left: 800, right: 844, top: 140, bottom: 190 }, slots);
    expect(path).toMatch(/^M44 45 L/);
    expect(path).toContain("L22 165");
    expect(path.trim().endsWith("L800 165")).toBe(true);
  });
});

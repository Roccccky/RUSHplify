import { describe, expect, it } from "vitest";
import { setlistRowsAfterRefresh } from "./app-store";

describe("setlists after a full refresh", () => {
  const read = { id: "marty", name: "00 MARTY RIGS", items: [{ id: "marty-0", rigId: "r1", title: "Victory G1 Clean" }, { id: "marty-1", rigId: "r2", title: "Orange OR30 Drive" }] };

  it("keeps the rig names of a setlist that was already read", () => {
    expect(setlistRowsAfterRefresh([read], [{ id: "marty", name: "00 MARTY RIGS", count: 2 }])[0].items.map((item) => item.title)).toEqual(["Victory G1 Clean", "Orange OR30 Drive"]);
  });

  it("keeps them when the pedal counts fewer rigs than the setlist names (rigs that no longer exist)", () => {
    expect(setlistRowsAfterRefresh([read], [{ id: "marty", name: "00 MARTY", count: 1 }])[0].items.map((item) => item.title)).toEqual(["Victory G1 Clean", "Orange OR30 Drive"]);
  });

  it("numbers a setlist that was not read yet", () => {
    expect(setlistRowsAfterRefresh([], [{ id: "factory", name: "Factory", count: 2 }])[0].items.map((item) => item.title)).toEqual(["Rig 1", "Rig 2"]);
    const placeholders = setlistRowsAfterRefresh([], [{ id: "marty", name: "00 MARTY", count: 2 }]);
    expect(setlistRowsAfterRefresh(placeholders, [{ id: "marty", name: "00 MARTY", count: 2 }])[0].items.every((item) => !item.rigId)).toBe(true);
  });
});

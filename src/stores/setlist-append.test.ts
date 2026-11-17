import { describe, expect, it } from "vitest";
import { appendRigToHeadRushSetlist } from "./app-store";

describe("adding a saved rig to a setlist", () => {
  it("takes the document as FW 5.2.0 returns it: no name, a deleted rig with an empty name", () => {
    const fromPedal = { author: "", id: "marty", readonly: false, version: "1.0.0", rigs: ["r1", "gone", "r2"], rig_names: ["Clean", "", "Drive"] };
    expect(appendRigToHeadRushSetlist(fromPedal, "marty", "00 MARTY", "new", "TEST Pedaltest")).toEqual({
      id: "marty", name: "00 MARTY", data: [{ id: "r1", order: 0 }, { id: "gone", order: 1 }, { id: "r2", order: 2 }, { id: "new", order: 3 }],
    });
  });
});

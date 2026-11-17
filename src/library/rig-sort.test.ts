import { describe, expect, it } from "vitest";
import { sortRigs, toneFamily } from "./rig-sort";

const rigs = [
  { name: "Lead 2", color: "#e0453c", tempo: 140 },
  { name: "bass groove", color: "#4caf6d", tempo: 100 },
  { name: "Lead 10", color: "#f08a3c", tempo: 120 },
  { name: "Clean", color: "#4f8fe8", tempo: 90 },
  { name: "Hot", color: "#e8c547", tempo: 90 },
  { name: "Grey", color: "#8b96a7", tempo: 60 },
];

describe("rig sort", () => {
  it("reads the HeadRush tone families from the colour", () => {
    expect(rigs.map((rig) => toneFamily(rig.color))).toEqual(["drive", "bass", "crunch", "clean", "hot", "other"]);
    expect(toneFamily("#6ee7f2")).toBe("clean");
    expect(toneFamily("nope")).toBe("other");
  });

  it("sorts by name (numbers in order), colour (clean to heavy) and tempo", () => {
    expect(sortRigs(rigs, "name").map((rig) => rig.name)).toEqual(["bass groove", "Clean", "Grey", "Hot", "Lead 2", "Lead 10"]);
    expect(sortRigs(rigs, "colour").map((rig) => rig.name)).toEqual(["Clean", "Hot", "Lead 10", "Lead 2", "bass groove", "Grey"]);
    expect(sortRigs(rigs, "tempo").map((rig) => rig.name)).toEqual(["Grey", "Clean", "Hot", "bass groove", "Lead 10", "Lead 2"]);
    expect(sortRigs(rigs, "pedal")).toEqual(rigs);
  });
});

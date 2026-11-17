import { describe, expect, it } from "vitest";
import { DEMO_BLOCK_TYPES } from "../rig/block-catalogue";
import { inspirationFor, inspiredBy, inspiredByLabel } from "./block-inspiration";

describe("block inspiration", () => {
  it("names the original a model is inspired by, for the pedal's own spelling", () => {
    expect(inspiredBy("Green JRC-OD")).toBe("Ibanez TS808");
    expect(inspiredBy("K Drive 2")).toBe("Klon Centaur");
    expect(inspiredBy("Acoust Sim")).toBe("Boss Acoustic Simulator");
    expect(inspiredBy("Party Verb")).toBeNull();
    expect(inspiredByLabel("Green JRC-OD")).toBe("≈ Ibanez TS808");
    expect(inspiredByLabel("Party Verb")).toBeNull();
  });

  it("draws each model like it looks on the pedal", () => {
    expect(inspirationFor("Green JRC-OD").art).toMatchObject({ shape: "stomp", body: "#3aa64a", rows: [2, 1] });
    expect(inspirationFor("Wham").art.shape).toBe("whammy");
    expect(inspirationFor("IR (1024)").art.shape).toBe("ir");
    expect(inspirationFor("ReValver Cab").art.shape).toBe("cab");
  });

  it("draws every catalogue block with some shape", () => {
    for (const name of DEMO_BLOCK_TYPES) expect(inspirationFor(name).art.shape).toBeTruthy();
    expect(inspirationFor("Neural Amp Modeler").art.shape).toBe("nam");
    expect(inspirationFor("Black Wah").art.shape).toBe("wah");
  });
});

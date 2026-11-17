import { describe, expect, it } from "vitest";
import type { Parameter, RigBlock } from "./types";
import { SUGGESTION_MAX_LENGTH, pedalSafeName, rigNameParts, suggestRigName } from "./rig-name";
import { pedalFileKey } from "../services/device-api";

const knob = (id: string, value: number, label = id): Parameter => ({ id, label, value, min: 0, max: 10 });
let slot = 0;
const block = (name: string, category: RigBlock["category"], extra: Partial<RigBlock> = {}): RigBlock =>
  ({ id: `b${slot}`, name, model: name, category, color: "#888", enabled: true, slot: slot++, parameters: [], ...extra });

describe("rig name suggestion", () => {
  it("names a factory amp chain by amp, gain character and standout effects", () => {
    const chain = [block("Noise Gate", "dynamics"), block("B2 Drive", "overdrive"), block("67 Black Duo", "amp", { parameters: [knob("GainA", 3, "Volume")] }), block("Analog Delay", "delay"), block("Spring Reverb", "reverb")];
    expect(rigNameParts(chain)).toEqual({ core: "67 Black Duo", gain: "Crunch", effects: ["B2 Drive", "Delay", "Verb"] });
    expect(suggestRigName(chain)).toBe("67 Black Duo Crunch - B2 Drive");
    expect(suggestRigName(chain, { variant: 1 })).toBe("67 Black Duo Crunch - Delay Verb");
    expect(suggestRigName(chain, { variant: 2 })).toBe("67 Black Duo Crunch");
    expect(suggestRigName(chain, { variant: 3 })).toBe("Crunch B2 Drive - 67 Black Duo");
    expect(suggestRigName(chain, { variant: 4 })).toBe(suggestRigName(chain));
  });

  it("reads the gain knob: low is clean, high is lead, a drive pedal pushes one step", () => {
    expect(rigNameParts([block("Plexi", "amp", { parameters: [knob("Gain", 2)] })]).gain).toBe("Clean");
    expect(rigNameParts([block("Brit 800", "amp", { parameters: [knob("Gain", 8)] })]).gain).toBe("Lead");
    expect(rigNameParts([block("Green JRC-OD", "overdrive"), block("Brit 800", "amp", { parameters: [knob("Gain", 5)] })]).gain).toBe("Lead");
  });

  it("prefers the NAM capture (TONE3000 title, else the loaded .nam file) and leaves out bypassed blocks", () => {
    const nam = block("Neural Amp Modeler", "amp", { sourcePath: "/Evil/Engine/Patch/Neural_Amp_Modeler", parameters: [{ id: "LoadedClone", label: "Capture", value: "Neural Amp Modeler/Marty/Amp/Fortin_Lonestar_Clean_A2.nam" }] });
    const off = block("Tape Echo", "delay", { enabled: false });
    expect(suggestRigName([nam, off])).toBe("Fortin Lonestar Clean");
    expect(suggestRigName([nam], { captures: { "/Evil/Engine/Patch/Neural_Amp_Modeler": "JCM800 2203 — Hot Lead (NAM)" } })).toBe("JCM800 2203 Hot Lead");
  });

  it("keeps only characters the pedal stores, stays short and avoids names in use", () => {
    const chain = [block("Überdrive “Klon” Ⅱ", "overdrive"), block("Amp & Cab / 4x12 Mega Super Long Model Name", "amp", { parameters: [knob("Gain", 9)] }), block("Hall", "reverb")];
    for (let variant = 0; variant < 4; variant += 1) {
      const name = suggestRigName(chain, { variant });
      expect(name.length).toBeLessThanOrEqual(SUGGESTION_MAX_LENGTH);
      expect(pedalFileKey(name)).toBe(name.toLocaleLowerCase());
    }
    expect(pedalSafeName("  .Café — Nr.1 / Lead.  ")).toBe("Cafe Nr.1 Lead");
    expect(suggestRigName([block("Duo", "amp")], { taken: ["duo", "Duo 2"] })).toBe("Duo 3");
    expect(suggestRigName([])).toBe("New Rig");
  });
});

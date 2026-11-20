import { describe, expect, it } from "vitest";
import { initialSource } from "./inspector";

describe("NAM card SOURCE", () => {
  it("shows a capture stored on the pedal as On pedal, even after browsing TONE3000", () => {
    expect(initialSource(false, "tone3000", "Neural Amp Modeler/Tone 3000/Fender _62 Deluxe.nam")).toBe("local");
    expect(initialSource(false, undefined, "Neural Amp Modeler/Amp/JCM800.nam")).toBe("local");
  });

  it("stays on TONE3000 while a preview plays or nothing is stored yet", () => {
    expect(initialSource(true, undefined, "Neural Amp Modeler/Tone 3000/.demo/Fender.nam")).toBe("tone3000");
    expect(initialSource(false, "tone3000", "Neural Amp Modeler/Tone 3000/.demo/Fender.nam")).toBe("tone3000");
    expect(initialSource(false, "tone3000", "")).toBe("tone3000");
  });
});

import { describe, expect, it } from "vitest";
import { deviceLibrary, fileFolder, fileRowLabel, fileStem } from "./device-library";

describe("device library", () => {
  it("names the screen row after the file kind", () => {
    expect(fileRowLabel({ id: "IR", label: "IR File", value: "" })).toBe("IR");
    expect(fileRowLabel({ id: "LoadedClone", label: "Clone File", value: "" })).toBe("Clone");
    expect(fileRowLabel({ id: "ReverbFile", label: "Reverb File", value: "" })).toBe("Reverb");
    expect(fileRowLabel({ id: "X", label: "File", value: "" })).toBe("File");
  });

  it("shows the file without extension and its folder below the start folder", () => {
    expect(fileStem("Impulse Responses/Marty/V30 57.wav")).toBe("V30 57");
    expect(fileFolder("Impulse Responses/Marty/V30 57.wav", "Impulse Responses")).toBe("Marty");
    expect(fileFolder("Impulse Responses/V30.wav", "Impulse Responses")).toBe("Impulse Responses");
  });

  it("lists sorted demo IRs without a pedal and leaves the demo list untouched", async () => {
    const first = await deviceLibrary("Impulse Responses", 2);
    expect(first.length).toBeGreaterThan(1);
    expect([...first].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }))).toEqual(first);
    expect(await deviceLibrary("Impulse Responses", 2, true)).toEqual(first);
    expect(await deviceLibrary("Reverbs", 12)).toEqual([]);
  });
});

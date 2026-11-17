import { describe, expect, it } from "vitest";
import { NAME_MAX_LENGTH, nameProblem } from "./names";

describe("rig, setlist and preset names", () => {
  it("accepts the characters factory and user names use", () => {
    for (const name of ["Clean", "## Victory + G7 -clean", "65-SYN-Organ & Hold", "24-GTR-Ambient '67", "#HR - 04 Brave Match Drive (TJ)", "PRS15_FORTIN", "Ä Ö Ü ß"]) expect(nameProblem(name)).toBeNull();
  });

  it("refuses empty names, file-system characters, long names and leading/trailing dots", () => {
    expect(nameProblem("   ")).toBe("empty");
    for (const bad of ["a/b", "a\\b", "a:b", "a*b", "a?b", "a\"b", "a<b", "a>b", "a|b", "a\tb"]) expect(nameProblem(bad)).toBe("characters");
    expect(nameProblem("x".repeat(NAME_MAX_LENGTH))).toBeNull();
    expect(nameProblem("x".repeat(NAME_MAX_LENGTH + 1))).toBe("length");
    expect(nameProblem(".hidden")).toBe("dots");
    expect(nameProblem("Lead.")).toBe("dots");
  });

  it("refuses a name another item already uses, ignoring case, but not the item's own name", () => {
    expect(nameProblem("polar clean", ["Polar Clean", "Lead"])).toBe("taken");
    expect(nameProblem("POLAR CLEAN", ["Polar Clean"], "Polar Clean")).toBeNull();
    expect(nameProblem(" Lead ", ["Polar Clean", "Lead"], "Polar Clean")).toBe("taken");
  });
});

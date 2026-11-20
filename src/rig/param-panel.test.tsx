import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Parameter } from "../domain/types";
import { ParamPanel, autoGroups, leverText, namGroups } from "./param-panel";

const p = (id: string, label: string, value: Parameter["value"]): Parameter => ({ id, label, value, min: 0, max: 10 });
afterEach(cleanup);

describe("knob panel", () => {
  it("groups the NAM host like the pedal and switches a section from its head", () => {
    const change = vi.fn();
    render(<ParamPanel groups={namGroups("")} onChange={change} parameters={[p("Input", "Input", 5), p("Gate", "Gate", true), p("Threshold", "Threshold", 2), p("EQ", "EQ", false), p("Bass", "Bass", 5), p("Middle", "Middle", 5), p("Treble", "Treble", 5), p("Output", "Output", 5), p("Input2", "Input 2", 5)]}/>);
    const eq = screen.getByRole("region", { name: "EQ" });
    expect(within(eq).getAllByRole("slider").map((knob) => knob.getAttribute("aria-label"))).toEqual(["Bass", "Middle", "Treble"]);
    fireEvent.click(within(eq).getByRole("switch", { name: "EQ on" }));
    expect(change).toHaveBeenCalledWith("EQ", true);
    expect(screen.queryByRole("slider", { name: "Input 2" })).toBeNull();
  });

  it("shows short choices as a pedal lever, not a dropdown", () => {
    const change = vi.fn();
    render(<ParamPanel onChange={change} parameters={[{ id: "Mode", label: "Mode", value: "OD", choices: ["OD", "Boost", "Dist"] }]}/>);
    const lever = screen.getByRole("radiogroup", { name: "Mode" });
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(within(lever).getByRole("radio", { name: "Dist" }));
    expect(change).toHaveBeenCalledWith("Mode", "Dist");
  });
});

describe("leverText", () => {
  it("keeps every lever name short enough for the fixed lever width", () => {
    expect(leverText("Calibrated", 3)).toBe("CAL");
    expect(leverText("Normalize", 3)).toBe("NORM");
    expect(leverText("Raw", 3)).toBe("RAW");
    expect(leverText("Full", 2)).toBe("FULL");
  });
});

describe("autoGroups", () => {
  it("sorts any block into pedal sections with the output last", () => {
    const groups = autoGroups([p("Mix", "Mix", 5), p("Tone", "Tone", 5), p("Gain", "Gain", 5), p("Time", "Time", 5), p("Mode", "Mode", 5)]);
    expect(groups.map((group) => group.label)).toEqual(["DRIVE", "TONE", "TIME", "MORE", "OUTPUT"]);
    expect(groups.at(-1)!.ids).toEqual(["Mix"]);
  });
});

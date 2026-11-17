import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToolsPage, noteFrequency, strobeRate } from "./tools-page";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("TOOLS · TUNER strobe", () => {
  it("reads note names with and without octave", () => {
    expect(noteFrequency("A4")).toBeCloseTo(440);
    expect(noteFrequency("A")).toBeCloseTo(110);
    expect(noteFrequency("E2")).toBeCloseTo(82.41, 1);
    expect(noteFrequency("Bb2", 442)).toBeCloseTo(117.07, 1);
    expect(noteFrequency("")).toBe(110);
  });

  it("stands still in tune and drifts by the beat frequency, sharp one way and flat the other", () => {
    expect(strobeRate(110, 0)).toBe(0);
    expect(strobeRate(110, 10)).toBeGreaterThan(0);
    expect(strobeRate(110, -10)).toBeLessThan(0);
    expect(strobeRate(110, 1200)).toBeCloseTo(110);
  });

  it("switches between needle and strobe and remembers the choice", () => {
    const { container, unmount } = render(<ToolsPage/>);
    expect(container.querySelector(".rp-tuner__track")).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "STROBE" }));
    expect(container.querySelector(".rp-strobe")).not.toBeNull();
    expect(container.querySelector(".rp-tuner__track")).toBeNull();
    unmount();
    const again = render(<ToolsPage/>);
    expect(again.container.querySelector(".rp-strobe")).not.toBeNull();
  });
});

describe("strobe rows", () => {
  it("has two rows of their own: wide blocks at the bottom, half as wide at the top", async () => {
    const { Strobe } = await import("./tuner-display");
    const { container } = render(<Strobe note="E" cents={-12} reference={440}>E</Strobe>);
    const rows = [...container.querySelectorAll<HTMLElement>(".rp-strobe__row > span")];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.style.getPropertyValue("--strobe-period"))).toEqual(["96px", "192px"]);
    expect(container.querySelector(".rp-strobe")).toHaveAttribute("data-lit");
    expect(container.querySelector(".rp-strobe__readout")).toHaveTextContent("E");
  });
});

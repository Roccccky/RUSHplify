import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = (name: string) => readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");

describe("text fields use the RUSHplify field font", () => {
  it("defines one field font token on the RUSHplify font", () => {
    expect(css("rp-tokens.css")).toMatch(/--rp-field-font:\s*\d{3} 1[1-9]px\/[\d.]+ var\(--rp-font\);/);
  });

  it("applies it to search, picker search, name fields and well selects, placeholder included", () => {
    const controls = css("rp-controls.css");
    for (const field of [".rp-search", ".rp-drawer__search", ".rp-picker__search", ".rp-side__select", ".rp-namefield"]) expect(controls).toContain(field);
    expect(controls).toMatch(/:is\(input, select, \.ui-input\) \{ font: var\(--rp-field-font\);/);
    expect(controls).toMatch(/input::placeholder \{ font: var\(--rp-field-font\);/);
  });
});

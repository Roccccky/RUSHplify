import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { APP_NAME, APP_VERSION, Brand } from "./brand";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("brand and version", () => {
  it("keeps name and version identical across manifests", () => {
    const pkg = JSON.parse(read("package.json"));
    const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
    const cargo = read("src-tauri/Cargo.toml");
    expect(pkg.version).toBe(APP_VERSION);
    expect(tauri.version).toBe(APP_VERSION);
    expect(cargo).toMatch(new RegExp(`^version = "${APP_VERSION.replaceAll(".", "\\.")}"`, "m"));
    expect(tauri.productName).toBe(APP_NAME);
    expect(tauri.identifier).toBe("de.martinmaiwald.rushplify");
  });

  it("renders the wordmark with an accessible name", () => {
    render(<Brand mark/>);
    expect(screen.getByRole("img", { name: APP_NAME })).toHaveTextContent("RUSHPLIFY");
  });
});

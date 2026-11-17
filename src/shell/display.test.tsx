import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Display } from "./display";

afterEach(() => cleanup());
const items = ["Clean", "Crunch", "Lead"].map((label, index) => ({ id: `r${index}`, label, tag: String(index + 1).padStart(3, "0") }));

describe("header display", () => {
  it("opens the whole list on a click and applies the picked item", () => {
    const commit = vi.fn();
    render(<Display name="Rig" items={items} index={0} onCommit={commit}/>);
    fireEvent.click(screen.getByRole("button", { name: /^Rig: 001 Clean/ }));
    const list = screen.getByRole("listbox", { name: "Rig list" });
    expect(within(list).getAllByRole("option")).toHaveLength(3);
    expect(within(list).getByRole("option", { name: /Clean/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(list).getByRole("option", { name: /Lead/ }));
    expect(commit).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("listbox", { name: "Rig list" })).toBeNull();
  });

  it("ignores the wheel on the closed display; arrow keys open the list", () => {
    const commit = vi.fn();
    render(<Display name="Rig" items={items} index={0} onCommit={commit}/>);
    const value = screen.getByRole("button", { name: /^Rig: 001 Clean/ });
    fireEvent.wheel(value, { deltaY: 120 });
    expect(value).toHaveAccessibleName(/^Rig: 001 Clean/);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(value, { key: "ArrowDown" });
    expect(screen.getByRole("listbox", { name: "Rig list" })).toBeInTheDocument();
    expect(commit).not.toHaveBeenCalled();
  });

  it("closes the list with Escape", () => {
    render(<Display name="Scene" items={items} index={1} onCommit={() => undefined}/>);
    fireEvent.click(screen.getByRole("button", { name: /^Scene:/ }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Scene list" })).toBeNull();
  });
});

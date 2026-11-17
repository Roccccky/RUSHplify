import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoRigs, demoSetlists } from "../data/demo-data";
import { useAppStore } from "../stores/app-store";
import { SetlistsPage } from "./library-pages";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ rigs: structuredClone(demoRigs), selectedRigId: demoRigs[0].id, setlists: structuredClone(demoSetlists), selectedSetlistId: demoSetlists[0].id, liveSnapshot: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const titles = () => within(screen.getByRole("region", { name: "Setlist" })).getAllByRole("listitem").map((row) => row.querySelector(".rp-lib__name")?.textContent);

describe("LIBRARY · SETLISTS organizer", () => {
  it("creates and renames setlists in place, without window.prompt", async () => {
    const prompt = vi.spyOn(window, "prompt");
    const create = vi.spyOn(useAppStore.getState(), "createSetlist").mockResolvedValue();
    const rename = vi.spyOn(useAppStore.getState(), "renameSetlist").mockResolvedValue();
    render(<SetlistsPage/>);
    fireEvent.click(screen.getByRole("button", { name: "New setlist" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New setlist name" }), { target: { value: "Gig 12" } });
    await act(async () => fireEvent.keyDown(screen.getByRole("textbox", { name: "New setlist name" }), { key: "Enter" }));
    expect(create).toHaveBeenCalledWith("Gig 12");

    fireEvent.doubleClick(screen.getByText("Friday — The Foundry", { selector: ".rp-lib__title span" }));
    const field = screen.getByRole("textbox", { name: "Setlist name" });
    expect(field).toHaveValue("Friday — The Foundry");
    fireEvent.change(field, { target: { value: "Friday: Foundry" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("Not allowed");
    fireEvent.change(field, { target: { value: "Friday Foundry" } });
    await act(async () => fireEvent.keyDown(field, { key: "Enter" }));
    expect(rename).toHaveBeenCalledWith(demoSetlists[0].id, "Friday Foundry");
    expect(prompt).not.toHaveBeenCalled();
  });

  it("sorts the setlist A–Z and by colour, and sorts and filters the rig column", () => {
    render(<SetlistsPage/>);
    fireEvent.click(screen.getByRole("button", { name: "Sort setlist A–Z" }));
    const sorted = titles(); expect(sorted).toEqual([...sorted].sort((a, b) => a!.localeCompare(b!)));
    expect(screen.getByRole("button", { name: /SAVE/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Sort setlist by colour" }));
    expect(titles()[0]).toBe("Glass Cathedral");

    const rigs = screen.getByRole("complementary", { name: "All rigs" });
    fireEvent.click(within(rigs).getByRole("radio", { name: "A–Z" }));
    const names = within(rigs).getAllByRole("button", { name: /^Add / }).map((button) => button.textContent);
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!)));
    fireEvent.click(within(rigs).getByRole("button", { name: "Clean" }));
    expect(within(rigs).getAllByRole("button", { name: /^Add / }).map((button) => button.textContent)).toEqual(["Glass Cathedral", "Polar Clean"]);
  });

  it("shows setlists, the ordered setlist and all rigs side by side", () => {
    render(<SetlistsPage/>);
    expect(within(screen.getByRole("complementary", { name: "Setlists" })).getByRole("button", { name: /Friday — The Foundry/ })).toHaveAttribute("aria-current", "true");
    expect(titles()).toEqual(["Neon Boulevard", "Rust & Thunder", "Glass Cathedral", "Black Horizon"]);
    expect(within(screen.getByRole("complementary", { name: "All rigs" })).getAllByRole("button", { name: /^Add / })).toHaveLength(demoRigs.length);
    expect(screen.getByRole("button", { name: /SAVE/ })).toBeDisabled();
  });

  it("loads a setlist rig to hear it, the loaded one marked", () => {
    render(<SetlistsPage/>);
    const setlist = within(screen.getByRole("region", { name: "Setlist" }));
    expect(setlist.getAllByRole("listitem")[0]).toHaveTextContent("LOADED");
    fireEvent.click(setlist.getByRole("button", { name: "Load Black Horizon" }));
    expect(useAppStore.getState().selectedRigId).toBe("rig-6");
    expect(setlist.getAllByRole("listitem")[3]).toHaveTextContent("LOADED");
  });

  it("reorders, adds, removes and saves", () => {
    const save = vi.spyOn(useAppStore.getState(), "saveSelectedSetlist").mockResolvedValue();
    render(<SetlistsPage/>);
    fireEvent.click(screen.getByRole("button", { name: "Move Rust & Thunder up" }));
    expect(titles().slice(0, 2)).toEqual(["Rust & Thunder", "Neon Boulevard"]);
    fireEvent.click(screen.getByRole("button", { name: "Add Polar Clean to setlist" }));
    expect(titles().at(-1)).toBe("Polar Clean");
    fireEvent.click(screen.getByRole("button", { name: "Remove Black Horizon" }));
    expect(titles()).not.toContain("Black Horizon");
    fireEvent.click(screen.getByRole("button", { name: /SAVE/ }));
    expect(save).toHaveBeenCalled();
  });

  it("switches setlists and filters the rig column", () => {
    render(<SetlistsPage/>);
    fireEvent.click(screen.getByRole("button", { name: /Practice — New Material/ }));
    expect(titles()).toEqual(["Velvet Static", "Polar Clean"]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search rigs" }), { target: { value: "glass" } });
    expect(within(screen.getByRole("complementary", { name: "All rigs" })).getAllByRole("button", { name: /^Add / })).toHaveLength(1);
  });
});

describe("LIBRARY · SETLISTS rig column", () => {
  it("lists rigs with the loaded one marked and loads another", () => {
    render(<SetlistsPage/>);
    const rows = within(screen.getByRole("complementary", { name: "All rigs" })).getAllByRole("listitem");
    expect(rows).toHaveLength(demoRigs.length);
    expect(rows[0]).toHaveTextContent("LOADED");
    expect(screen.getByRole("button", { name: "Delete Neon Boulevard" })).toBeDisabled();
    fireEvent.click(within(screen.getByRole("complementary", { name: "All rigs" })).getByRole("button", { name: "Load Black Horizon" }));
    expect(useAppStore.getState().selectedRigId).toBe("rig-6");
  });

  it("renames in place (pencil or double-click), duplicates and deletes through the store", async () => {
    const prompt = vi.spyOn(window, "prompt");
    const rename = vi.spyOn(useAppStore.getState(), "renameRig").mockResolvedValue();
    const duplicate = vi.spyOn(useAppStore.getState(), "duplicateRig").mockResolvedValue();
    const remove = vi.spyOn(useAppStore.getState(), "deleteRig").mockResolvedValue();
    render(<SetlistsPage/>);
    const column = within(screen.getByRole("complementary", { name: "All rigs" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename Neon Boulevard" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Rig name" }), { target: { value: "Neon Avenue" } });
    await act(async () => fireEvent.keyDown(screen.getByRole("textbox", { name: "Rig name" }), { key: "Enter" }));
    expect(rename).toHaveBeenCalledWith("rig-1", "Neon Avenue");
    expect(screen.queryByRole("textbox", { name: "Rig name" })).not.toBeInTheDocument();

    fireEvent.doubleClick(column.getByText("Polar Clean"));
    fireEvent.change(screen.getByRole("textbox", { name: "Rig name" }), { target: { value: "Black Horizon" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rig name" }), { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("Name already used");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rig name" }), { key: "Escape" });
    expect(rename).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Neon Boulevard" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New rig name" }), { target: { value: "Neon Copy" } });
    await act(async () => fireEvent.keyDown(screen.getByRole("textbox", { name: "New rig name" }), { key: "Enter" }));
    expect(duplicate).toHaveBeenCalledWith("Neon Copy");

    fireEvent.click(screen.getByRole("button", { name: "Delete Polar Clean" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm: Delete Polar Clean" }));
    expect(remove).toHaveBeenCalledWith("rig-5");
    expect(prompt).not.toHaveBeenCalled();
  });
});

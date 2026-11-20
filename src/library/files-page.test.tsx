import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoRigs } from "../data/demo-data";
import { useAppStore } from "../stores/app-store";
import { FilesPage, folderTree } from "./files-page";

const nam = ["Neural Amp Modeler/Marty/Amp/JCM800.nam", "Neural Amp Modeler/Marty/Amp/Marshall JMP/JMP Clean.nam", "Neural Amp Modeler/Tone 3000/Mesa.nam", "Neural Amp Modeler/Tone 3000/.demo/Preview.nam"];

beforeEach(() => {
  const rigs = structuredClone(demoRigs);
  rigs[0].blocks = [...rigs[0].blocks, { id: "nam-host", name: "Neural Amp Modeler", model: "Neural Amp Modeler", category: "clone", color: "", enabled: true, slot: 13, parameters: [], sourcePath: "/Evil/Engine/Patch/Neural_Amp_Modeler" } as never];
  useAppStore.setState({ rigs, selectedRigId: demoRigs[0].id, liveSnapshot: null, namLibrary: nam, irLibrary: ["Impulse Responses/Marty/V30.wav"], slotError: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("LIBRARY · FILES", () => {
  it("builds the folder tree with nested folders and counts, hiding dot folders", () => {
    expect(folderTree(nam.filter((path) => !path.includes("/.")), "Neural Amp Modeler").map((node) => [node.name, node.depth, node.count])).toEqual([
      ["All", 0, 3], ["Marty", 1, 2], ["Amp", 2, 2], ["Marshall JMP", 3, 1], ["Tone 3000", 1, 1],
    ]);
  });

  it("lists the files of a folder and plays one in the chosen NAM slot", async () => {
    const load = vi.spyOn(useAppStore.getState(), "loadLocalCapture").mockResolvedValue();
    render(<FilesPage/>);
    fireEvent.click(within(screen.getByRole("complementary", { name: "Folders" })).getByRole("button", { name: /Marshall JMP/ }));
    const files = within(screen.getByRole("region", { name: "Files" }));
    expect(files.getAllByRole("listitem")).toHaveLength(1);
    const slots = within(screen.getByRole("complementary", { name: "Slots" })).queryAllByRole("button");
    expect(slots.length).toBeGreaterThan(0);
    fireEvent.click(files.getByRole("button", { name: "Play JMP Clean" }));
    await waitFor(() => expect(load).toHaveBeenCalledWith("nam-host", "Neural Amp Modeler/Marty/Amp/Marshall JMP/JMP Clean.nam"));
  });

  it("searches across folders and switches to IRs", () => {
    render(<FilesPage/>);
    fireEvent.change(screen.getByRole("textbox", { name: "Search files" }), { target: { value: "mesa" } });
    expect(within(screen.getByRole("region", { name: "Files" })).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "IR" }));
    expect(within(screen.getByRole("region", { name: "Files" })).getByText("V30")).toBeInTheDocument();
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoDevice, demoRigs } from "../data/demo-data";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";
import { Display } from "../shell/display";
import { useRigNavigator } from "../shell/navigators";
import { ChainPage } from "./chain-page";
import { RigList } from "./rig-sidebar";
import { RushShell } from "../shell/rush-shell";
import { suggestRigName } from "../domain/rig-name";

const enter = async (field: HTMLElement, value: string) => {
  fireEvent.change(field, { target: { value } });
  await act(async () => fireEvent.keyDown(field, { key: "Enter" }));
};

function HeaderRig() {
  const rig = useRigNavigator();
  return <Display name="Rig" items={rig.items} index={rig.index} onCommit={rig.commit} onRename={rig.rename} taken={rig.names} suggest={rig.suggest}/>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  const rigs = structuredClone(demoRigs);
  Object.assign(rigs[0].blocks.find((block) => block.id === "b-drive")!, { moduleTypeId: 17, presetName: "Crunch" });
  useAppStore.setState({ device: { ...demoDevice, status: "ready" }, rigs, selectedRigId: rigs[0].id, selectedBlockId: null, liveSnapshot: null, liveSubtree: null, rigHistory: {}, historyPreview: null, pendingWrites: [], favoriteBlockNames: [], setlists: [] });
  vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
  vi.spyOn(window, "prompt").mockImplementation(() => { throw new Error("window.prompt is not available in the Tauri WebView"); });
});
afterEach(cleanup);

describe("rename the loaded rig in the RIG room", () => {
  it("header display: double-click or F2 opens a name field, Enter renames on the pedal", async () => {
    const rename = vi.spyOn(useAppStore.getState(), "renameRig");
    render(<HeaderRig/>);
    const value = screen.getByRole("button", { name: /^Rig: 001 Neon Boulevard/ });
    fireEvent.doubleClick(value);
    await enter(screen.getByRole("textbox", { name: "Rig name" }), "Neon Avenue");
    expect(rename).toHaveBeenCalledWith("rig-1", "Neon Avenue");
    expect(useAppStore.getState().rigs[0].name).toBe("Neon Avenue");
    expect(screen.getByRole("button", { name: /^Rig: 001 Neon Avenue/ })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button", { name: /^Rig: 001/ }), { key: "F2" });
    const field = screen.getByRole("textbox", { name: "Rig name" });
    await enter(field, "Polar Clean");
    expect(screen.getByRole("alert")).toHaveTextContent("Name already used");
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it("rig list: only the loaded row turns into a name field", async () => {
    render(<RigList/>);
    fireEvent.doubleClick(screen.getByRole("button", { name: "Polar Clean" }));
    expect(screen.queryByRole("textbox", { name: "Rig name" })).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("button", { name: "Neon Boulevard" }));
    await enter(screen.getByRole("textbox", { name: "Rig name" }), "Neon Avenue");
    expect(useAppStore.getState().rigs[0].name).toBe("Neon Avenue");
    expect(screen.getByRole("button", { name: "Neon Avenue" })).toHaveAttribute("aria-current", "true");
  });
});

describe("rig name suggestions from the chain", () => {
  it("header rename: the wand fills in a name built from the loaded chain", async () => {
    render(<HeaderRig/>);
    fireEvent.doubleClick(screen.getByRole("button", { name: /^Rig: 001 Neon Boulevard/ }));
    fireEvent.click(screen.getByRole("button", { name: "Suggest name" }));
    const expected = suggestRigName(useAppStore.getState().rigs[0].blocks, { taken: useAppStore.getState().rigs.slice(1).map((rig) => rig.name) });
    expect(expected).not.toBe("New Rig");
    expect(screen.getByRole("textbox", { name: "Rig name" })).toHaveValue(expected);
  });

  it("SAVE of a new rig opens with a suggestion, the wand changes it, a taken name is refused", async () => {
    const save = vi.spyOn(useAppStore.getState(), "saveCurrentRig").mockResolvedValue();
    useAppStore.setState({ rigNaming: { then: undefined } } as never);
    render(<RushShell>{null}</RushShell>);
    const field = await screen.findByRole("textbox", { name: "Rig name" });
    const first = (field as HTMLInputElement).value;
    expect(first).toBe(suggestRigName(useAppStore.getState().rigs[0].blocks, { taken: useAppStore.getState().rigs.map((rig) => rig.name) }));
    fireEvent.click(screen.getByRole("button", { name: "Suggest name" }));
    expect(field).not.toHaveValue(first);
    fireEvent.change(field, { target: { value: "polar clean" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Name already used");
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "Duo Edge" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(save).toHaveBeenCalledWith("Duo Edge", 9, undefined);
  });
});

describe("preset names in the card", () => {
  it("renames the loaded preset and saves a new one in place", async () => {
    vi.spyOn(deviceApi, "blockPresets").mockResolvedValue(["Crunch", "Solo"]);
    const rename = vi.spyOn(deviceApi, "renameBlockPreset").mockResolvedValue();
    const create = vi.spyOn(deviceApi, "createBlockPreset").mockResolvedValue();
    render(<ChainPage/>);
    const drive = useAppStore.getState().rigs[0].blocks.find((block) => block.id === "b-drive")!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${drive.name}, slot`) }));
    const card = screen.getByRole("complementary", { name: "Inspector" });
    fireEvent.click(within(card).getByRole("button", { name: "Preset" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "Solo" })).toBeInTheDocument());
    fireEvent.keyDown(window, { key: "Escape" });

    fireEvent.click(within(card).getByRole("button", { name: "Rename preset" }));
    const field = within(card).getByRole("textbox", { name: "Preset name" });
    expect(field).toHaveValue("Crunch");
    expect(within(card).queryByRole("button", { name: "Preset" })).not.toBeInTheDocument();
    await enter(field, "solo");
    expect(within(card).getByRole("alert")).toHaveTextContent("Name already used");
    await enter(field, "Crunch 2");
    expect(rename).toHaveBeenCalledWith(drive.name, "Crunch", "Crunch 2");
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Save preset" }));
    await enter(within(card).getByRole("textbox", { name: "New preset name" }), "Edge");
    expect(create).toHaveBeenCalledWith(drive.name, 17, "Edge");
  });
});

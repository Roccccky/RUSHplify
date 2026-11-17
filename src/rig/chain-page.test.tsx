import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoDevice, demoRigs } from "../data/demo-data";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";
import { ChainPage, pathState } from "./chain-page";
import { FOOTSWITCH } from "./inspector";
import { chainSlots } from "./block-catalogue";

function rig() {
  const value = structuredClone(demoRigs[0]);
  const drive = value.blocks.find((block) => block.id === "b-drive")!;
  Object.assign(drive, { moduleTypeId: 17, presetName: "Crunch" });
  return value;
}

describe("RIG · CHAIN (HeadRush layout)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const value = rig();
    useAppStore.setState({ device: { ...demoDevice, status: "ready" }, rigs: [value], selectedRigId: value.id, selectedBlockId: null, liveSnapshot: null, liveSubtree: null, rigHistory: {}, historyPreview: null, pendingWrites: [], favoriteBlockNames: [] });
    vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
    vi.spyOn(deviceApi, "blockPresets").mockResolvedValue(["Crunch", "Solo"]);
  });
  afterEach(cleanup);

  it("renders fourteen slots in Z order with small IN and OUT and none of the RUSHplify editor chrome", () => {
    const { container } = render(<ChainPage/>);
    const slots = [...container.querySelectorAll<HTMLElement>("[data-chain-slot]")];
    expect(slots.map((slot) => slot.dataset.chainSlot)).toEqual(Array.from({ length: 14 }, (_, index) => String(index)));
    expect(slots.slice(7).every((slot) => slot.style.gridRow === "2")).toBe(true);
    expect(screen.getByRole("button", { name: "Input" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Output" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Guitar In, slot/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Main Out, slot/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Editing rig/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Signal path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/A\/B/)).not.toBeInTheDocument();
  });

  it("shows the selected block's parameters in the inspector, not on the tile", async () => {
    const { container } = render(<ChainPage/>);
    const drive = useAppStore.getState().rigs[0].blocks.find((block) => block.id === "b-drive")!;
    expect(container.querySelector(".rp-tile .parameter-control, .rp-tile input")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${drive.name}, slot`) }));
    const panel = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(panel).getByText(drive.name)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Preset" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "Solo" })).toBeInTheDocument());
  });

  it("bypasses with the switch in the card head, stacks category, model and preset, and moves with Alt+arrows", () => {
    const toggle = vi.spyOn(useAppStore.getState(), "toggleBlock").mockResolvedValue(true);
    const move = vi.spyOn(useAppStore.getState(), "moveBlock").mockResolvedValue();
    render(<ChainPage/>);
    const drive = useAppStore.getState().rigs[0].blocks.find((block) => block.id === "b-drive")!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${drive.name}, slot`) }));
    const card = screen.getByRole("complementary", { name: "Inspector" });
    fireEvent.click(within(card).getByRole("switch", { name: new RegExp(`(Bypass|Enable) ${drive.name}`) }));
    expect(toggle).toHaveBeenCalledWith("b-drive");
    expect(within(card).getByRole("button", { name: "Category" })).toHaveAttribute("aria-haspopup", "listbox");
    fireEvent.click(within(card).getByRole("button", { name: "Model" }));
    expect(screen.getByRole("listbox", { name: "Model" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Preset" })).toHaveAttribute("aria-haspopup", "listbox");
    expect(within(card).getByRole("button", { name: "Next Model" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: new RegExp(`^${drive.name}, slot`) }), { key: "ArrowRight", altKey: true });
    expect(move).toHaveBeenCalledWith(drive.slot, drive.slot + 1);
  });

  it("keeps rigs left and the block browser right; an empty slot adds model and preset in one click", async () => {
    const addBlock = vi.spyOn(useAppStore.getState(), "addBlock").mockResolvedValue();
    const preset = vi.spyOn(useAppStore.getState(), "loadBlockPreset").mockResolvedValue();
    render(<ChainPage/>);
    const browser = screen.getByRole("complementary", { name: "Browser" });
    fireEvent.click(within(browser).getByRole("radio", { name: "TONES" }));
    fireEvent.click(screen.getByRole("button", { name: "Empty slot 14" }));
    expect(within(browser).getByRole("radio", { name: "BLOCKS" })).toHaveAttribute("aria-checked", "true");
    expect(within(browser).getByRole("button", { name: "NAM" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add block to slot 14" })).toBeInTheDocument();
    fireEvent.change(within(browser).getByRole("textbox", { name: "Search blocks" }), { target: { value: "tape" } });
    fireEvent.click(screen.getByRole("button", { name: "Show presets for Tape Echo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Solo" }));
    await waitFor(() => expect(addBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "Tape Echo", slot: 13, enabled: true })));
    await waitFor(() => expect(preset).toHaveBeenCalledWith("slot-14", "Solo"));
  });

  it("opens a picker over an empty slot: category, then model with its original", async () => {
    const addBlock = vi.spyOn(useAppStore.getState(), "addBlock").mockResolvedValue();
    render(<ChainPage/>);
    fireEvent.click(screen.getByRole("button", { name: "Empty slot 14" }));
    const picker = screen.getByRole("dialog", { name: "Add block to slot 14" });
    expect(within(picker).getAllByRole("listitem").length).toBeGreaterThan(5);
    fireEvent.change(within(picker).getByRole("textbox", { name: "Search blocks" }), { target: { value: "green" } });
    expect(within(picker).getByText("≈ Ibanez TS808")).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: /Green JRC-OD/ }));
    await waitFor(() => expect(addBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "Green JRC-OD", slot: 13 })));
  });

  it("shows all six footswitches, banks A and B side by side, on every pedal", () => {
    useAppStore.setState({ device: { ...useAppStore.getState().device!, model: "Prime Flex" } });
    render(<ChainPage/>);
    expect(within(screen.getByRole("group", { name: "Footswitch bank A" })).getAllByRole("button")).toHaveLength(3);
    expect(within(screen.getByRole("group", { name: "Footswitch bank B" })).getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Bank down" })).not.toBeInTheDocument();
  });

  it("reads the playing path of a split from the mix crossfade and the doubling switch", () => {
    expect(pathState(undefined, undefined)).toBeNull();
    expect(pathState({ ParaXFade: 0 }, { DoubleSwitch: false })).toEqual({ path: "A", doubling: false });
    expect(pathState({ ParaXFade: 1 }, { DoubleSwitch: true })).toEqual({ path: "B", doubling: true });
    expect(pathState({ ParaXFade: 0.5 }, {})).toEqual({ path: "A+B", doubling: false });
  });

  it("renames a footswitch on the pedal from its card", async () => {
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    render(<ChainPage/>);
    if (!screen.queryByRole("group", { name: "Footswitch bank A" })) fireEvent.click(screen.getByRole("button", { name: "Bank down" }));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename footswitch" }));
    const field = screen.getByRole("textbox", { name: "Footswitch name" });
    fireEvent.change(field, { target: { value: "Lead Boost" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(write).toHaveBeenCalledWith(FOOTSWITCH, { FootSwitchText2: "Lead Boost" }));
  });

  it("edits a scene switch in its card and marks its changes in the chain", async () => {
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    const method = vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: {} });
    vi.spyOn(useAppStore.getState(), "refreshPage").mockResolvedValue();
    const used = chainSlots(useAppStore.getState().rigs[0].blocks).filter((block) => !block.empty).map((block) => ({ block, slot: block.slot + 1 })).sort((a, b) => a.slot - b.slot);
    useAppStore.setState({ liveSubtree: { [FOOTSWITCH]: { value: { ModeNew2: 2, Module2: "Unassigned", [`Scene2_${used[0].slot}_Mode`]: 1, [`Scene2_${used[1].slot}_Mode`]: 2 } } } as never });
    const { container } = render(<ChainPage/>);
    if (!screen.queryByRole("group", { name: "Footswitch bank A" })) fireEvent.click(screen.getByRole("button", { name: "Bank down" }));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    const marks = [...container.querySelectorAll<HTMLElement>(".rp-ptile__scene")].map((mark) => mark.textContent);
    expect(marks).toEqual(["ON", "OFF"]);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: `${used[0].block.name} in scene` })).getByRole("radio", { name: "OFF" }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(FOOTSWITCH, { [`Scene2_${used[0].slot}_Mode`]: 2 }));
    // The strip names the scene; clicking the selected scene switch again recalls it.
    expect(screen.getByText("SCENE B")).toBeInTheDocument();
    const recall = vi.spyOn(useAppStore.getState(), "selectScene").mockResolvedValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    expect(recall).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Add switch state" }));
    await waitFor(() => expect(method).toHaveBeenCalledWith(FOOTSWITCH, "createNewSceneState", [1, 0]));
    await waitFor(() => expect(write).toHaveBeenCalledWith(FOOTSWITCH, { SceneNumberOfStates2: 2, SceneState2: 1 }));
  });

  it("a block switch toggles its block when the selected one is clicked again, and never writes the LED", async () => {
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    const used = chainSlots(useAppStore.getState().rigs[0].blocks).filter((block) => !block.empty);
    const toggle = vi.spyOn(useAppStore.getState(), "toggleBlock").mockResolvedValue(true);
    useAppStore.setState({ liveSubtree: { [FOOTSWITCH]: { value: { ModeNew1: 0, Module1: used[0].name, Operation1: "On", FootSwitchOn1: false, ModeNew2: 0, Module2: "Looper", Operation2: "Start/Stop", FootSwitchOn2: true } } } as never });
    render(<ChainPage/>);
    if (!screen.queryByRole("group", { name: "Footswitch bank A" })) fireEvent.click(screen.getByRole("button", { name: "Bank down" }));
    // Lit follows the block, not the LED flag.
    expect(screen.getByRole("button", { name: "Footswitch 1, bank A" })).toHaveAttribute("data-on", String(used[0].enabled));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 1, bank A" }));
    expect(toggle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 1, bank A" }));
    expect(toggle).toHaveBeenCalledWith(used[0].id);
    // A looper switch cannot be pressed from the app: it shows the pedal's LED and writes nothing.
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    expect(screen.getByRole("button", { name: "Footswitch 2, bank A" })).toHaveAttribute("data-on", "true");
    expect(write).not.toHaveBeenCalledWith(FOOTSWITCH, expect.objectContaining({ FootSwitchOn1: expect.anything() }));
    expect(write).not.toHaveBeenCalledWith(FOOTSWITCH, expect.objectContaining({ FootSwitchOn2: expect.anything() }));
  });

  it("lists rigs in the left column and opens footswitches in the inspector", () => {
    render(<ChainPage/>);
    const rigs = screen.getByRole("complementary", { name: "Rigs" });
    expect(within(rigs).getByRole("button", { name: useAppStore.getState().rigs[0].name })).toBeInTheDocument();
    if (!screen.queryByRole("group", { name: "Footswitch bank A" })) fireEvent.click(screen.getByRole("button", { name: "Bank down" }));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 2, bank A" }));
    expect(within(screen.getByRole("complementary", { name: "Inspector" })).getByText("FOOTSWITCH 2 · BANK A")).toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: "Inspector" })).getByRole("group", { name: "Rig tempo and MIDI" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "External pedal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expression pedal" }));
    expect(within(screen.getByRole("complementary", { name: "Inspector" })).getByText("Expression pedal")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pedal mode" })).toBeInTheDocument();
  });

  it("drives tails, stereo and routing from the chain header; MIX only with a split", () => {
    const routing = vi.spyOn(useAppStore.getState(), "updateRouting").mockResolvedValue();
    render(<ChainPage/>);
    expect(screen.queryByRole("button", { name: "MIX" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Effect tails" }));
    fireEvent.click(screen.getByRole("switch", { name: "Stereo" }));
    fireEvent.click(screen.getByRole("radio", { name: "Middle Split 3-4-3" }));
    expect(routing).toHaveBeenCalledWith({ Tails: true });
    expect(routing).toHaveBeenCalledWith({ RigIsStereo: true });
    expect(routing).toHaveBeenCalledWith({ Routing: 1 });
  });

  it("marks an audition as a read-only PREVIEW chain with a way back to the own rig", async () => {
    const stop = vi.spyOn(useAppStore.getState(), "stopAudition").mockResolvedValue();
    vi.spyOn(useAppStore.getState(), "refreshPage").mockResolvedValue();
    const tone = { id: "cloud-7", title: "Crystal Ambient Chain", source: "HeadRush Cloud" };
    useAppStore.setState({ auditioningToneId: "cloud-7", auditionBusy: false, testRigReturn: { id: "r", name: "Mine", audition: { tone } } as never });
    render(<ChainPage/>);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("PREVIEW");
    expect(status).toHaveTextContent("Crystal Ambient Chain");
    expect(screen.getByRole("region", { name: "Chain" }).querySelector(".rp-zone__chain")).toHaveAttribute("inert");
    fireEvent.click(within(status).getByRole("button", { name: /MY RIG/ }));
    await waitFor(() => expect(stop).toHaveBeenCalled());
    useAppStore.setState({ auditioningToneId: null, testRigReturn: null });
  });

  it("names the browser tabs BLOCKS, TONES and CLOUD", () => {
    render(<ChainPage/>);
    const tabs = within(screen.getByRole("radiogroup", { name: "Browser" })).getAllByRole("radio").map((tab) => tab.getAttribute("aria-label") ?? tab.textContent);
    expect(tabs).toEqual(["BLOCKS", "TONES", "CLOUD"]);
  });
});

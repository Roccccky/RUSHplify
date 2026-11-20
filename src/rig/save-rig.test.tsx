import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoDevice, demoRigs } from "../data/demo-data";
import { UNSAVED_RIG_ID } from "../domain/headrush-reflection";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";
import { ChainPage } from "./chain-page";
import { RigFileActions } from "../shell/rush-shell";

/** SAVE sits in the header (one place); the RIG room renders with it. */
const Rig = () => <><RigFileActions/><ChainPage/></>;

const RIGS = "/Evil/API/Rigs";
const FOOTSWITCH = "/Evil/Engine/FootSwitch";
const LOOPER_ACTIONS = ["Start/Stop", "Rec/Od", "Mute"];

/** The pedal as seen through the bridge: reflected methods answer `methodReturnValue`. */
function pedal(result: (path: string, method: string) => unknown = () => true) {
  return vi.spyOn(deviceApi, "callMethod").mockImplementation(async (path, method) => {
    if (path === FOOTSWITCH && method === "operationList") return { status: 200, body: { methodReturnValue: LOOPER_ACTIONS } };
    if (path === FOOTSWITCH && method === "operationEnableList") return { status: 200, body: { methodReturnValue: LOOPER_ACTIONS.map(() => true) } };
    return { status: 200, body: { methodReturnValue: result(path, method) } };
  });
}

function loadedRig(id: string, modified = "Unsaved changes") {
  return { ...structuredClone(demoRigs[0]), id, name: id === UNSAVED_RIG_ID ? "" : "Marty Clean", modified };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  const rig = structuredClone(demoRigs[0]);
  vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
  vi.spyOn(deviceApi, "properties").mockResolvedValue({});
  vi.spyOn(deviceApi, "blockPresets").mockResolvedValue([]);
  useAppStore.setState({
    device: { ...demoDevice, status: "ready" }, rigs: [rig], selectedRigId: rig.id, selectedBlockId: null,
    rigGuard: null, rigNaming: null, slotCaptures: {}, historyPreview: null, pendingWrites: [],
    liveSnapshot: { rig: loadedRig("4b1d-rig"), routing: { id: 0, label: "Straight", stereo: false, tails: false, locked: false } } as never,
    liveSubtree: { [FOOTSWITCH]: { value: { Module1: "Unassigned", Operation1: "", ModeNew1: 0, ModuleList1: ["Unassigned", "Looper", "Tempo"], FootSwitchText1: "" } } } as never,
    refreshPage: vi.fn().mockResolvedValue(undefined), refreshFull: vi.fn().mockResolvedValue(undefined),
  });
});
afterEach(cleanup);

describe("SAVE reaches the pedal", () => {
  it("after a footswitch assignment: the target takes its first action and SAVE sends saveRig", async () => {
    const call = pedal();
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    render(<Rig/>);
    if (!screen.queryByRole("group", { name: "Footswitch bank A" })) fireEvent.click(screen.getByRole("button", { name: "Bank down" }));
    fireEvent.click(screen.getByRole("button", { name: "Footswitch 1, bank A" }));
    const card = screen.getByRole("complementary", { name: "Inspector" });
    fireEvent.change(within(card).getByRole("combobox", { name: "Footswitch target" }), { target: { value: "Looper" } });
    // A target without an action is dropped by the pedal when the rig is stored.
    await waitFor(() => expect(write).toHaveBeenCalledWith(FOOTSWITCH, { Module1: "Looper", Operation1: "Start/Stop" }));

    fireEvent.click(screen.getByRole("button", { name: /SAVE/ }));
    // A stored rig asks first: overwrite it or keep it and save as new.
    expect(call).not.toHaveBeenCalledWith(RIGS, "saveRig", []);
    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));
    await waitFor(() => expect(call).toHaveBeenCalledWith(RIGS, "saveRig", []));
    expect(useAppStore.getState().rigNaming).toBeNull();
  });

  it("SAVE offers the rig colour and writes it before the pedal stores the rig", async () => {
    const call = pedal();
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    useAppStore.setState({ liveSubtree: { ...useAppStore.getState().liveSubtree, [RIGS]: { value: { loadedColor: 9 } } } as never });
    render(<Rig/>);
    fireEvent.click(screen.getByRole("button", { name: /SAVE/ }));
    const colours = screen.getByRole("radiogroup", { name: "Rig colour" });
    expect(within(colours).getByRole("radio", { name: "Light blue · clean" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(colours).getByRole("radio", { name: "Orange · crunch" }));
    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));
    await waitFor(() => expect(call).toHaveBeenCalledWith(RIGS, "saveRig", []));
    expect(write).toHaveBeenCalledWith(RIGS, { loadedColor: 4 });
    expect(write.mock.invocationCallOrder[0]).toBeLessThan(call.mock.invocationCallOrder[call.mock.calls.findIndex((args) => args[1] === "saveRig")]);
  });

  it("Save as new keeps the stored rig and stores the changes under a new name", async () => {
    const call = pedal();
    render(<Rig/>);
    fireEvent.click(screen.getByRole("button", { name: /SAVE/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save as new" }));
    expect(useAppStore.getState().rigNaming).toEqual({ asNew: true, colour: 9, setlistId: undefined });
    expect(call).not.toHaveBeenCalled();
    await useAppStore.getState().saveCurrentRig("Marty Clean Bright");
    expect(call).toHaveBeenCalledWith(RIGS, "saveRigAs", ["Marty Clean Bright", -1]);
    expect(call).not.toHaveBeenCalledWith(RIGS, "saveRig", []);
    expect(useAppStore.getState().rigNaming).toBeNull();
  });

  it("Save as new can put the rig at the end of a setlist", async () => {
    const SETLISTS = "/Evil/API/Setlists";
    const call = pedal((path, method) => path === SETLISTS && method === "getSetlist"
      ? JSON.stringify({ id: "gig", name: "Gig", author: "", readonly: false, version: "1", rigs: ["r1"], rig_names: ["Opener"] })
      : path === SETLISTS && method === "saveSetlist" ? "gig" : true);
    vi.spyOn(deviceApi, "properties").mockImplementation(async (path) => path === RIGS ? { loadedID: "r9", loadedName: "Marty Clean Bright" } : {});
    useAppStore.setState({ setlists: [{ id: "gig", name: "Gig", items: [{ id: "a", rigId: "r1", title: "Opener" }] }] });
    render(<Rig/>);
    fireEvent.click(screen.getByRole("button", { name: /SAVE/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Add to setlist" }), { target: { value: "gig" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as new" }));
    expect(useAppStore.getState().rigNaming).toEqual({ asNew: true, colour: 9, setlistId: "gig" });
    await useAppStore.getState().saveCurrentRig("Marty Clean Bright", 9, "gig");
    const saved = call.mock.calls.find((args) => args[0] === SETLISTS && args[1] === "saveSetlist");
    expect(JSON.parse(String(saved?.[2]?.[0]))).toEqual({ id: "gig", name: "Gig", data: [{ id: "r1", order: 0 }, { id: "r9", order: 1 }] });
    expect(useAppStore.getState().setlists[0].items.map((item) => item.rigId)).toEqual(["r1", "r9"]);
  });

  it("a rig already in the setlist is not added twice", async () => {
    const SETLISTS = "/Evil/API/Setlists";
    const call = pedal((path, method) => path === SETLISTS && method === "getSetlist"
      ? JSON.stringify({ id: "gig", name: "Gig", author: "", readonly: false, version: "1", rigs: ["4b1d-rig"], rig_names: ["Marty Clean"] })
      : true);
    vi.spyOn(deviceApi, "properties").mockImplementation(async (path) => path === RIGS ? { loadedID: "4b1d-rig", loadedName: "Marty Clean" } : {});
    useAppStore.setState({ setlists: [{ id: "gig", name: "Gig", items: [{ id: "a", rigId: "4b1d-rig", title: "Marty Clean" }] }] });
    await useAppStore.getState().saveCurrentRig(undefined, undefined, "gig");
    expect(call).toHaveBeenCalledWith(RIGS, "saveRig", []);
    expect(call).not.toHaveBeenCalledWith(SETLISTS, "saveSetlist", expect.anything());
    expect(useAppStore.getState().setlists[0].items).toHaveLength(1);
  });

  it("a rig made with NEW asks for a name and is stored with saveRigAs, never with the no-op saveRig", async () => {
    const call = pedal();
    useAppStore.setState({ liveSnapshot: { rig: loadedRig(UNSAVED_RIG_ID) } as never });
    await useAppStore.getState().saveCurrentRig();
    expect(useAppStore.getState().rigNaming).toEqual({ then: undefined });
    expect(call).not.toHaveBeenCalled();

    await useAppStore.getState().saveCurrentRig("  Marty Lead ");
    expect(call).toHaveBeenCalledWith(RIGS, "saveRigAs", ["Marty Lead", -1]);
    expect(call).not.toHaveBeenCalledWith(RIGS, "saveRig", []);
    expect(useAppStore.getState().rigNaming).toBeNull();
  });

  it("does not store a rig whose NAM slot still plays a preview file", async () => {
    const call = pedal(() => true);
    const live = useAppStore.getState().liveSnapshot!;
    useAppStore.setState({ liveSnapshot: { ...live, rig: { ...live.rig, blocks: [...live.rig.blocks, { id: "nam", name: "Neural Amp Modeler", model: "Neural Amp Modeler", category: "clone", color: "", enabled: true, slot: 13, parameters: [], sourcePath: "/Evil/Engine/Patch/Neural_Amp_Modeler" }] } } as never });
    vi.spyOn(deviceApi, "properties").mockResolvedValue({ LoadedClone: "Neural Amp Modeler/Tone 3000/.demo/Mesa.nam" });
    await expect(useAppStore.getState().saveCurrentRig()).rejects.toThrow(/preview that is not stored/);
    expect(call).not.toHaveBeenCalledWith(RIGS, "saveRig", []);
    expect(useAppStore.getState().diagnostics[0]).toMatchObject({ level: "error", message: "Could not save the rig" });
  });

  it("reports a refused save instead of swallowing it", async () => {
    pedal((path, method) => !(path === RIGS && method === "saveRig"));
    await expect(useAppStore.getState().saveCurrentRig()).rejects.toThrow(/refused/);
    expect(useAppStore.getState().diagnostics[0]).toMatchObject({ level: "error", message: "Could not save the rig" });
  });

  it("Save in the unsaved-changes dialog names a NEW rig first, then switches rigs", async () => {
    const call = pedal();
    useAppStore.setState({ liveSnapshot: { rig: loadedRig(UNSAVED_RIG_ID) } as never, preferences: { ...useAppStore.getState().preferences, confirmRigReplacement: true } });
    await useAppStore.getState().loadRig("rig-2", "sr-2");
    await useAppStore.getState().resolveRigGuard("save");
    expect(useAppStore.getState().rigNaming).toEqual({ then: { kind: "load", rigId: "rig-2", srId: "sr-2" } });
    expect(call).not.toHaveBeenCalledWith(RIGS, "loadRigConfirm", expect.anything());

    await useAppStore.getState().saveCurrentRig("Marty Lead");
    expect(call).toHaveBeenCalledWith(RIGS, "saveRigAs", ["Marty Lead", -1]);
    expect(call).toHaveBeenCalledWith(RIGS, "loadRigConfirm", ["rig-2", "sr-2"]);
  });

  it("the pedal's own prompt for a NEW rig is answered with its saveRigAs", async () => {
    const call = pedal();
    useAppStore.setState({ liveSnapshot: { rig: loadedRig(UNSAVED_RIG_ID) } as never, liveSubtree: { "/Evil/API/RigSaveDialog": { value: { displayDialog: true } } } as never });
    await useAppStore.getState().resolveRigGuard("save");
    expect(useAppStore.getState().rigNaming).toEqual({ then: { kind: "pedal" } });
    await useAppStore.getState().saveCurrentRig("Marty Lead");
    expect(call).toHaveBeenCalledWith("/Evil/API/RigSaveDialog", "saveRigAs", ["Marty Lead"]);
    expect(call).not.toHaveBeenCalledWith(RIGS, "saveRigAs", expect.anything());
  });
});

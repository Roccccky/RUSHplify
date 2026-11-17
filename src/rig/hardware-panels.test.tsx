import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MidiOutEditor, PedalCard, RigMidi, bpmOf, rawBpm } from "./hardware-panels";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";

const RIG = "/Evil/Engine/Patch/Rig";
const RIGS = "/Evil/API/Rigs";
const MIDI_OUT = "/Evil/Engine/MIDIOutCtrl";
const pedal = (tree: Record<string, Record<string, unknown>>) => {
  useAppStore.setState({ liveSubtree: Object.fromEntries(Object.entries(tree).map(([path, value]) => [path, { value }])), refreshPage: async () => {} } as never);
  vi.spyOn(deviceApi, "midiOutPresets").mockResolvedValue(["Amp A", "Looper"]);
  vi.spyOn(deviceApi, "pedalParams").mockResolvedValue([]);
  return {
    write: vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} } as never),
    call: vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: { methodReturnValue: true } } as never),
  };
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); useAppStore.setState({ liveSubtree: null } as never); });

describe("RIG · hardware assign", () => {
  it("reads and writes tempo over 30–240 BPM", () => {
    expect(bpmOf(0.4280952215194702)).toBeCloseTo(119.9, 1);
    expect(rawBpm(120)).toBeCloseTo(0.42857, 4);
    expect(rawBpm(10)).toBe(0);
    expect(rawBpm(300)).toBe(1);
  });

  it("switches the rig to a fixed tempo, sets its program and MIDI Out preset", async () => {
    const { write } = pedal({ [RIG]: { TempoFromMaster: true, Tempo: 0.4280952215194702, MIDIOut: "" }, [RIGS]: { loadedProgMIDICC: -1, availableProgMIDICC: [0, 1, 2] } });
    render(<RigMidi/>);
    await act(async () => {});
    expect(screen.getByLabelText("Current tempo").textContent).toBe("119.9");
    await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "FIXED" })); });
    expect(write).toHaveBeenCalledWith(RIG, { TempoFromMaster: false, Tempo: expect.closeTo(0.428095, 4) });
    await act(async () => { fireEvent.change(screen.getByLabelText("MIDI program"), { target: { value: "2" } }); });
    expect(write).toHaveBeenCalledWith(RIGS, { loadedProgMIDICC: 2 });
    await act(async () => { fireEvent.change(screen.getByLabelText("MIDI send"), { target: { value: "Amp A" } }); });
    expect(write).toHaveBeenCalledWith(RIG, { MIDIOut: "Amp A" });
  });

  it("edits a MIDI Out message by type and applies the preset", async () => {
    const { write, call } = pedal({ [MIDI_OUT]: { LoadedPreset: "Amp A", Type1: 2, Chan1: 1, Val11: 7, Val21: 100 } });
    const assign = vi.fn().mockResolvedValue(undefined);
    render(<MidiOutEditor assigned="" onAssign={assign}/>);
    await act(async () => {});
    expect(screen.getByLabelText("CC number")).toHaveValue("7");
    expect(screen.queryByLabelText("Bank MSB")).toBeNull();
    const cc = screen.getByLabelText("CC value");
    fireEvent.change(cc, { target: { value: "300" } });
    await act(async () => { fireEvent.blur(cc); });
    expect(write).toHaveBeenCalledWith(MIDI_OUT, { Val21: 127 });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "APPLY" })); });
    expect(call).toHaveBeenCalledWith(MIDI_OUT, "saveCurrentPreset", []);
    expect(assign).toHaveBeenCalledWith("Amp A");
  });

  it("shows one target in Classic and two plus Off Position in Auto-Engage", async () => {
    pedal({ "/Evil/Engine/Pedal1": { PedalMode: 0, PedalAssignmentEdit: 0, Module1: "Unassigned" } });
    const { container, unmount } = render(<PedalCard pedal={1}/>);
    await act(async () => {});
    expect(container.querySelectorAll(".rp-exp__lane")).toHaveLength(1);
    expect(screen.queryByLabelText("Off position")).toBeNull();
    unmount();
    pedal({ "/Evil/Engine/Pedal1": { PedalMode: 2, PedalAssignmentEdit: 1, AutoEngageMode: 1 } });
    const second = render(<PedalCard pedal={1}/>);
    await act(async () => {});
    expect(second.container.querySelectorAll(".rp-exp__lane")).toHaveLength(2);
    expect(screen.getByLabelText("Off position")).toHaveValue("1");
    expect(screen.getByRole("radiogroup", { name: "Pedal bank" })).toBeInTheDocument();
  });
});

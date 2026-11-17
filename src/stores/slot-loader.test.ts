import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceApi } from "../services/device-api";
import type { CloudTone, Rig, RigBlock, ToneModel } from "../domain/types";
import { useAppStore } from "./app-store";
import { demoDevice } from "../data/demo-data";

const block = (slot: number, name: string, category: RigBlock["category"], sourcePath: string, enabled = true): RigBlock => ({ id: `slot-${slot + 1}`, name, model: name, category, color: "", enabled, slot, parameters: [], sourcePath });
const rig: Rig = {
  id: "rig", name: "Rig", author: "", color: "", tags: [], tempo: 120, favorite: false, modified: "",
  blocks: [block(0, "Neural Amp Modeler", "clone", "/Evil/Engine/Patch/Neural_Amp_Modeler"), block(1, "IR", "ir", "/Evil/Engine/Patch/IR", false), block(2, "Cab", "cab", "/Evil/Engine/Patch/Cab")],
} as Rig;
const tone = (title: string, detectedType: CloudTone["detectedType"]): CloudTone => ({ id: title, title, author: "", description: "", captureType: detectedType, detectedType, tags: [], rating: 0, downloads: 0, source: "Tone3000", imageColor: "", remoteId: 7 });
const model: ToneModel = { id: "m1", remoteId: 11, name: "Standard", architecture: "A2", url: "https://www.tone3000.com/m1.nam" };

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
  useAppStore.setState({ rigs: [rig], selectedRigId: rig.id, liveSnapshot: null, device: null, slotCaptures: {}, slotError: null, irLibrary: ["Impulse Responses/Choptones/CT-Brit412G12M.wav", "Impulse Responses/Marty/MESA RECTO V30.wav"] });
});
afterEach(() => vi.restoreAllMocks());

describe("NAM slot loads TONE3000 captures live", () => {
  it("loads the preview under the name the pedal actually stored", async () => {
    vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: { methodReturnValue: JSON.stringify({ success: true }) } });
    vi.spyOn(deviceApi, "listDeviceFiles").mockResolvedValue(["Other.nam", "Recto - RHYTHM _3.nam"]);
    await expect(deviceApi.previewTone3000Model({ ...model, name: "RHYTHM #3" }, "Recto - RHYTHM #3")).resolves.toBe("Neural Amp Modeler/Tone 3000/.demo/Recto - RHYTHM _3.nam");
  });

  it("previews the capture into the slot's host and gives an amp a matching cab", async () => {
    useAppStore.setState({ toneModels: { "Mesa Rectifier": [model] } });
    const preview = vi.spyOn(deviceApi, "previewTone3000Model").mockResolvedValue("Neural Amp Modeler/Tone 3000/.demo/Mesa Rectifier.nam");
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    await useAppStore.getState().loadToneIntoSlot("slot-1", tone("Mesa Rectifier", "amp"));
    expect(preview).toHaveBeenCalledWith(model, "Mesa Rectifier");
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Neural_Amp_Modeler", { LoadedClone: "Neural Amp Modeler/Tone 3000/.demo/Mesa Rectifier.nam" });
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/IR", { On: true });
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/IR", { IR: "Impulse Responses/Marty/MESA RECTO V30.wav" });
    expect(useAppStore.getState().slotCaptures["/Evil/Engine/Patch/Neural_Amp_Modeler"]?.file).toContain(".demo/");
    expect(useAppStore.getState().rigs[0].blocks[1].enabled).toBe(true);
  });

  it("turns the cab off behind a full rig", async () => {
    useAppStore.setState({ toneModels: { "Full Stack": [model] } });
    vi.spyOn(deviceApi, "previewTone3000Model").mockResolvedValue("Neural Amp Modeler/Tone 3000/.demo/Full Stack.nam");
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    await useAppStore.getState().loadToneIntoSlot("slot-1", tone("Full Stack", "full-rig"));
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Cab", { On: false });
    expect(write).not.toHaveBeenCalledWith("/Evil/Engine/Patch/IR", expect.objectContaining({ IR: expect.anything() }));
    expect(useAppStore.getState().rigs[0].blocks[2].enabled).toBe(false);
  });

  it("keeps previews as regular files before the rig is saved", async () => {
    useAppStore.setState({ slotCaptures: { "/Evil/Engine/Patch/Neural_Amp_Modeler": { tone: tone("Mesa", "amp"), model, name: "Mesa", file: "Neural Amp Modeler/Tone 3000/.demo/Mesa.nam" } } });
    vi.spyOn(deviceApi, "properties").mockResolvedValue({ LoadedClone: "Neural Amp Modeler/Tone 3000/.demo/Mesa.nam" });
    const download = vi.spyOn(deviceApi, "downloadTone").mockResolvedValue();
    vi.spyOn(deviceApi, "listDeviceFiles").mockResolvedValue(["Mesa.nam"]);
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    await useAppStore.getState().keepSlotCaptures();
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ title: "Mesa" }), model, "Mesa");
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Neural_Amp_Modeler", { LoadedClone: "Neural Amp Modeler/Tone 3000/Mesa.nam" });
    expect(useAppStore.getState().slotCaptures).toEqual({});
  });
});

describe("NAM slot loads files from the pedal", () => {
  it("reads the role from Marty's folders", async () => {
    const { localCaptureRole } = await import("../domain/cab-match");
    expect(localCaptureRole("Neural Amp Modeler/Marty/Full Rig/5150.nam")).toBe("fullrig");
    expect(localCaptureRole("Neural Amp Modeler/Marty/Amp/JCM800.nam")).toBe("amp");
    expect(localCaptureRole("Neural Amp Modeler/Marty/Pedal/Klon.nam")).toBe("pedal");
    expect(localCaptureRole("Neural Amp Modeler/Tone 3000/Some.nam")).toBeNull();
  });

  it("turns the cab off for a full rig and on again for an amp, keeping a loaded IR", async () => {
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    await useAppStore.getState().loadLocalCapture("slot-1", "Neural Amp Modeler/Marty/Full Rig/5150 V30.nam");
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Neural_Amp_Modeler", { LoadedClone: "Neural Amp Modeler/Marty/Full Rig/5150 V30.nam" });
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Cab", { On: false });
    expect(useAppStore.getState().rigs[0].blocks[2].enabled).toBe(false);

    write.mockClear();
    useAppStore.setState({ rigs: [{ ...useAppStore.getState().rigs[0], blocks: useAppStore.getState().rigs[0].blocks.map((item) => item.category === "ir" ? { ...item, parameters: [{ id: "IR", label: "IR", value: "Impulse Responses/Marty/Own.wav" }] } : item) }] });
    await useAppStore.getState().loadLocalCapture("slot-1", "Neural Amp Modeler/Marty/Amp/Mesa Mark IIC.nam");
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/IR", { On: true });
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Cab", { On: true });
    expect(write).not.toHaveBeenCalledWith("/Evil/Engine/Patch/IR", expect.objectContaining({ IR: expect.anything() }));
  });

  it("puts an IR block into the next free slot when an amp has no cab behind it", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
    useAppStore.setState({ rigs: [{ ...rig, blocks: [rig.blocks[0]] }], liveSnapshot: null, device: { ...demoDevice, status: "demo" } });
    await useAppStore.getState().loadLocalCapture("slot-1", "Neural Amp Modeler/Marty/Amp/Mesa Mark IIC.nam");
    const added = useAppStore.getState().rigs[0].blocks.find((item) => item.category === "ir");
    expect(added?.slot).toBe(1);
    expect(added?.presetName).toBe("MESA RECTO V30");
    expect(useAppStore.getState().selectedBlockId).not.toBe("slot-2");
  });
});

describe("Keep a TONE3000 preview on the pedal", () => {
  it("drops the preview when another rig is loaded or selected", async () => {
    const capture = { tone: tone("Mesa", "amp"), model, name: "Mesa", file: "Neural Amp Modeler/Tone 3000/.demo/Mesa.nam" };
    useAppStore.setState({ slotCaptures: { "/Evil/Engine/Patch/Neural_Amp_Modeler": capture } });
    useAppStore.getState().selectRig(rig.id);
    expect(Object.keys(useAppStore.getState().slotCaptures)).toHaveLength(1);
    useAppStore.getState().selectRig("other");
    expect(useAppStore.getState().slotCaptures).toEqual({});
    useAppStore.setState({ slotCaptures: { "/Evil/Engine/Patch/Neural_Amp_Modeler": capture } });
    vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: {} });
    vi.spyOn(useAppStore.getState(), "refreshFull").mockResolvedValue();
    await useAppStore.getState().loadRig("other");
    expect(useAppStore.getState().slotCaptures).toEqual({});
  });

  it("downloads every variant, then plays the stored file of the previewed one", async () => {
    const variants: ToneModel[] = [{ ...model, id: "m1", name: "Clean" }, { ...model, id: "m2", remoteId: 12, name: "Crunch" }];
    useAppStore.setState({ toneModels: { Mesa: variants }, namLibrary: [], slotCaptures: { "/Evil/Engine/Patch/Neural_Amp_Modeler": { tone: tone("Mesa", "amp"), model: variants[1], name: "Mesa - Crunch", file: "Neural Amp Modeler/Tone 3000/.demo/Mesa - Crunch.nam" } } });
    const download = vi.spyOn(deviceApi, "downloadTone").mockResolvedValue();
    vi.spyOn(deviceApi, "listDeviceFiles").mockResolvedValue(["Mesa - Clean.nam", "Mesa - Crunch.nam"]);
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    await expect(useAppStore.getState().keepToneOnPedal("slot-1")).resolves.toBe("Neural Amp Modeler/Tone 3000/Mesa - Crunch.nam");
    expect(download).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledWith("/Evil/Engine/Patch/Neural_Amp_Modeler", { LoadedClone: "Neural Amp Modeler/Tone 3000/Mesa - Crunch.nam" });
    expect(useAppStore.getState().slotCaptures).toEqual({});
    expect(useAppStore.getState().namLibrary).toEqual(["Neural Amp Modeler/Tone 3000/Mesa - Clean.nam", "Neural Amp Modeler/Tone 3000/Mesa - Crunch.nam"]);
  });
});

describe("HeadRush Cloud preview", () => {
  it("plays a cloud rig through the pedal's demo and refreshes the chain", async () => {
    const demo = vi.spyOn(deviceApi, "startToneDemo").mockResolvedValue();
    const refresh = vi.spyOn(useAppStore.getState(), "refreshPage").mockResolvedValue();
    const cloudRig: CloudTone = { ...tone("Stadium Lead", "full-rig"), id: "cloud-1", source: "HeadRush Cloud", remoteKind: "rig", remoteId: 42 } as CloudTone;
    await useAppStore.getState().previewCloudTone(cloudRig);
    expect(demo).toHaveBeenCalledWith(cloudRig);
    expect(refresh).toHaveBeenCalledWith("editor", "manual");
    expect(useAppStore.getState().cloudPreviewId).toBe("cloud-1");
  });

  it("shows the pedal's refusal and leaves TONE3000 tones alone", async () => {
    const demo = vi.spyOn(deviceApi, "startToneDemo").mockRejectedValue(new Error("Not signed in"));
    await useAppStore.getState().previewCloudTone({ ...tone("Stadium Lead", "full-rig"), source: "HeadRush Cloud" } as CloudTone);
    expect(useAppStore.getState().slotError).toContain("Stadium Lead");
    demo.mockClear();
    await useAppStore.getState().previewCloudTone(tone("Mesa Rectifier", "amp"));
    expect(demo).not.toHaveBeenCalled();
  });
});

describe("TONE3000 variants", () => {
  it("does not keep an empty answer: the next load asks TONE3000 again", async () => {
    const fetch = vi.spyOn(deviceApi, "fetchTone3000Models")
      .mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: false })
      .mockResolvedValue({ success: true, result: [{ id: 5, name: "Standard", url: "https://www.tone3000.com/5.nam" }] });
    const amp = tone("Amp", "amp");
    useAppStore.setState({ toneModels: {} });
    await useAppStore.getState().loadToneModels(amp);
    expect(useAppStore.getState().toneModels[amp.id]).toBeUndefined();
    expect(useAppStore.getState().toneModelError).toBe("TONE3000 did not answer. Try again.");
    await useAppStore.getState().loadToneModels(amp);
    expect(useAppStore.getState().toneModels[amp.id]).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});

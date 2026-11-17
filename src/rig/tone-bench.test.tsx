import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloudTones } from "../data/demo-data";
import { useAppStore } from "../stores/app-store";
import { deviceApi } from "../services/device-api";
import { demoDevice } from "../data/demo-data";
import type { RigBlock } from "../domain/types";
import { IrBrowser, ToneBrowser, ToneCard, categoryOf, useToneBench } from "./tone-bench";

const NAM: RigBlock = { id: "slot-3", name: "Neural Amp Modeler", model: "Neural Amp Modeler", category: "clone", color: "", enabled: true, slot: 2, parameters: [], sourcePath: "/Evil/Engine/Patch/Neural_Amp_Modeler" };

function Tones({ target = null, namSlots = [] }: { target?: RigBlock | null; namSlots?: RigBlock[] }) {
  const bench = useToneBench(true, target);
  return <><ToneCard bench={bench} namSlots={namSlots}/><ToneBrowser bench={bench}/></>;
}

beforeEach(() => { localStorage.clear(); useAppStore.setState({ tones: structuredClone(cloudTones), selectedToneId: null, auditioningToneId: null, favoriteToneIds: [], device: null }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("RIG · TONES (browser right, tone card centre)", () => {
  it("lists TONE3000 tones with category, filters by category and picks one onto the card", () => {
    render(<Tones/>);
    const list = screen.getByRole("region", { name: "Tone browser" });
    const amp = cloudTones.filter((tone) => tone.source === "Tone3000" && categoryOf(tone) === "amp");
    fireEvent.click(within(list).getByRole("button", { name: "AMP" }));
    expect(within(list).getAllByRole("listitem").filter((row) => row.classList.contains("rp-row"))).toHaveLength(amp.length);
    fireEvent.click(within(list).getByRole("button", { name: new RegExp(`^${amp[0].title}`) }));
    expect(useAppStore.getState().selectedToneId).toBe(amp[0].id);
    expect(document.querySelector(".rp-tone__title")).toHaveTextContent(amp[0].title);
  });

  it("loads a picked tone into the NAM slot it targets", () => {
    const load = vi.spyOn(useAppStore.getState(), "loadToneIntoSlot").mockResolvedValue();
    const tones = cloudTones.filter((tone) => tone.source === "Tone3000");
    render(<Tones target={NAM}/>);
    fireEvent.click(within(screen.getByRole("region", { name: "Tone browser" })).getByRole("button", { name: new RegExp(`^${tones[0].title}`) }));
    expect(load).toHaveBeenCalledWith("slot-3", expect.objectContaining({ id: tones[0].id }), undefined);
  });

  it("without a NAM slot only selects; the info card offers the chain's NAM slots", () => {
    const load = vi.spyOn(useAppStore.getState(), "loadToneIntoSlot").mockResolvedValue();
    const tones = cloudTones.filter((tone) => tone.source === "Tone3000");
    render(<Tones namSlots={[NAM]}/>);
    expect(screen.queryByRole("button", { name: "LOAD INTO SLOT 3" })).toBeNull();
    fireEvent.click(within(screen.getByRole("region", { name: "Tone browser" })).getByRole("button", { name: new RegExp(`^${tones[0].title}`) }));
    expect(load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "LOAD INTO SLOT 3" }));
    expect(load).toHaveBeenCalledWith("slot-3", expect.objectContaining({ id: tones[0].id }), undefined);
    expect(screen.queryByLabelText("Test chain blocks")).toBeNull();
  });

  const titles = () => within(screen.getByRole("region", { name: "Tone browser" })).getAllByRole("listitem").filter((row) => row.classList.contains("rp-row")).map((row) => row.querySelector("strong")!.textContent);
  const sortBy = (value: string) => fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value } });

  it("reorders the list for every sort (amps and full rigs only; pedal captures do not work on the pedal)", () => {
    render(<Tones/>);
    const trending = titles();
    expect(trending).toEqual(cloudTones.filter((tone) => tone.source === "Tone3000" && categoryOf(tone) !== "pedal" && categoryOf(tone) !== "ir" && categoryOf(tone) !== "outboard").map((tone) => tone.title));
    expect(trending).not.toContain("Green Screamer 808");
    sortBy("newest");
    expect(titles()).toEqual(["Nashville Sparkle", "German Metal 100", "Brit 800 — Hot Mod"]);
    sortBy("oldest");
    expect(titles()).toEqual(["Brit 800 — Hot Mod", "German Metal 100", "Nashville Sparkle"]);
    sortBy("downloads");
    expect(titles()).toEqual(["Brit 800 — Hot Mod", "German Metal 100", "Nashville Sparkle"]);
    sortBy("trending");
    expect(titles()).toEqual(trending);
  });

  it("asks TONE3000 for the chosen sort (sortMode as the pedal takes it)", () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    useAppStore.setState({ device: demoDevice });
    const refresh = vi.spyOn(useAppStore.getState(), "refreshToneServices").mockResolvedValue();
    render(<Tones target={NAM}/>);
    // Opening asks once with what the browser shows, so a list kept from another search is replaced.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenLastCalledWith("", false, expect.objectContaining({ sortMode: 0, gear: ["amp", "full-rig"] }), "Tone3000");
    for (const [value, mode] of [["newest", 1], ["oldest", 2], ["downloads", 3], ["trending", 0]] as const) {
      sortBy(value);
      expect(refresh).toHaveBeenLastCalledWith("", false, expect.objectContaining({ sortMode: mode, gear: ["amp", "full-rig"] }), "Tone3000");
    }
    expect(refresh).toHaveBeenCalledTimes(5);
  });

  it("lists the pedal's IRs by folder and loads a click into the IR slot", async () => {
    const load = vi.spyOn(useAppStore.getState(), "loadIrIntoSlot").mockResolvedValue();
    useAppStore.setState({ irLibrary: ["Impulse Responses/Marty/MESA RECTO V30.wav", "Impulse Responses/Choptones/CT-Brit412G12M-421160.wav"] });
    render(<IrBrowser block={{ ...NAM, id: "slot-5", name: "IR", category: "ir", sourcePath: "/Evil/Engine/Patch/IR" }}/>);
    expect(screen.getByText("MARTY")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "MESA RECTO V30" }));
    expect(load).toHaveBeenCalledWith("slot-5", "Impulse Responses/Marty/MESA RECTO V30.wav");
  });
});

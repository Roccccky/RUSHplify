import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { deviceApi } from "../services/device-api";
import { DRUMS, DrumsZone } from "./drums-zone";
import { DEMO_DRUMS } from "./drums-demo";

afterEach(() => vi.restoreAllMocks());

describe("DRUMS", () => {
  it("shows style, pattern and kit on the screen and the knobs in sections", () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
    render(<DrumsZone/>);
    expect(screen.getByRole("button", { name: "Style" })).toHaveTextContent("Metal F");
    expect(screen.getByRole("button", { name: "Pattern" })).toHaveTextContent("Bounce");
    for (const section of ["TEMPO", "MIX", "SOUND", "GROOVE", "FILLS", "ACCENT"]) expect(screen.getByRole("region", { name: section })).toBeInTheDocument();
  });

  it("plays, fills and holds the accent through the pedal's own methods", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    vi.spyOn(deviceApi, "properties").mockResolvedValue({});
    const call = vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: { methodReturnValue: [] } });
    render(<DrumsZone object={DEMO_DRUMS}/>);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    const accent = screen.getByRole("button", { name: "Accent" });
    fireEvent.pointerDown(accent); fireEvent.pointerUp(accent);
    await waitFor(() => expect(call).toHaveBeenCalledWith(DRUMS, "stopAccent", []));
    expect(call).toHaveBeenCalledWith(DRUMS, "togglePlay", []);
    expect(call).toHaveBeenCalledWith(DRUMS, "playFill", []);
    expect(call).toHaveBeenCalledWith(DRUMS, "playAccent", []);
    expect(call).toHaveBeenCalledWith(DRUMS, "drumsPageOpened");
  });

  it("writes a pattern change as the pedal's own value", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: {} });
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    render(<DrumsZone object={DEMO_DRUMS}/>);
    fireEvent.click(screen.getByRole("button", { name: "Next Pattern" }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(DRUMS, { StyleVari: "Move" }));
  });
});

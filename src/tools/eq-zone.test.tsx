import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { deviceApi } from "../services/device-api";
import { AMP_EQ, EqZone, MAIN_EQ } from "./eq-zone";
import { DEMO_EQ } from "./eq-demo";

afterEach(() => vi.restoreAllMocks());

describe("GLOBAL EQ", () => {
  it("shows one section per band and switches between main and amp output", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    const write = vi.spyOn(deviceApi, "setProperties").mockResolvedValue({ status: 200, body: {} });
    render(<EqZone tree={{ [MAIN_EQ]: DEMO_EQ.main, [AMP_EQ]: DEMO_EQ.amp }}/>);
    for (const band of ["LOW", "LOW MID", "HIGH MID", "HIGH", "MASTER"]) expect(screen.getByRole("region", { name: band })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Global EQ on" }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(MAIN_EQ, { On: true }));
    fireEvent.click(screen.getByRole("radio", { name: "AMP OUT" }));
    fireEvent.click(screen.getByRole("switch", { name: "Global EQ on" }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(AMP_EQ, { On: true }));
  });

  it("resets the main EQ with the pedal's own method", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    const call = vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: {} });
    render(<EqZone tree={{ [MAIN_EQ]: DEMO_EQ.main }}/>);
    fireEvent.click(screen.getByRole("button", { name: "Reset flat" }));
    await waitFor(() => expect(call).toHaveBeenCalledWith(MAIN_EQ, "reset"));
  });
});

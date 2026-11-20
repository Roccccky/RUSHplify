import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceApi } from "../services/device-api";
import { useAppStore } from "../stores/app-store";
import { SettingsPage } from "./system-pages";

describe("SYSTEM · SETTINGS (minimal rows)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(deviceApi, "callMethod").mockResolvedValue({ status: 200, body: { methodReturnValue: "[]" } });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("lists categories on the left and opens connection rows by default", () => {
    render(<SettingsPage/>);
    const nav = screen.getByRole("navigation", { name: "Settings" });
    expect(within(nav).getAllByRole("button").map((button) => button.textContent)).toEqual(["Connection", "Pedal", "Audio", "MIDI", "Expression", "Editing", "Interface", "Services", "About"]);
    expect(screen.getByRole("textbox", { name: "HeadRush address" })).toBeInTheDocument();
    expect(document.querySelector(".card, .settings-section")).toBeNull();
  });

  it("remembers the section and keeps MIDI controller input apart from pedal MIDI", () => {
    render(<SettingsPage/>);
    fireEvent.click(screen.getByRole("button", { name: "MIDI" }));
    expect(screen.getByText("CONTROLLER INPUT")).toBeInTheDocument();
    expect(screen.getByText("PEDAL MIDI")).toBeInTheDocument();
    expect(localStorage.getItem("rushplify-settings-section")).toBe("midi");
  });

  it("starts the pedal's own TONE3000 sign-in instead of a RUSHplify login", () => {
    useAppStore.setState({ liveSnapshot: { cloud: { loggedIn: false }, tone3000: { loggedIn: false } } as never });
    render(<SettingsPage/>);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    const rows = screen.getAllByRole("button", { name: "Sign in" });
    fireEvent.click(rows[1]);
    expect(deviceApi.callMethod).toHaveBeenCalledWith("/Evil/API/Tone3000", "startLogin");
    useAppStore.setState({ liveSnapshot: null });
  });
});

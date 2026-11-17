import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { demoCapabilities, demoDevice, demoRigs, demoSetlists } from "./data/demo-data";
import { deviceApi } from "./services/device-api";
import { midiConnection } from "./services/midi-connection";
import { useAppStore } from "./stores/app-store";

function resetApp() {
  localStorage.clear(); midiConnection.disconnect();
  useAppStore.setState((state) => ({
    page: "dashboard", sidebarCollapsed: false, device: { ...demoDevice, status: "demo" }, capabilities: structuredClone(demoCapabilities), liveSubtree: null, liveSnapshot: null,
    connectionBusy: false, connectionError: null, syncBusy: false, pendingWrites: [], diagnostics: [],
    rigs: structuredClone(demoRigs), selectedRigId: demoRigs[0].id, selectedBlockId: null,
    setlists: structuredClone(demoSetlists), selectedSetlistId: demoSetlists[0].id,
    preferences: {
      ...state.preferences,
      address: "headrushflexprime.local",
      firstWriteResolved: true,
      writeMode: "immediate",
      autoDiscovery: false,
    },
  }));
}

function pageTitle(container: HTMLElement) {
  return container.querySelector(".page-title h1")?.textContent;
}

describe("RUSHplify application integration", () => {
  beforeEach(() => {
    resetApp();
    vi.spyOn(deviceApi, "isNative").mockReturnValue(false);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("navigates every room and section through the real shell and Zustand store", async () => {
    const { container } = render(<App/>);
    await waitFor(() => expect(container.querySelector(".page-dashboard")).toBeInTheDocument());
    const rooms = within(screen.getByRole("navigation", { name: "Rooms" }));
    const sections = () => within(container.querySelector(".rp-sections") as HTMLElement);
    const journeys = [
      ["LIBRARY", "SETLISTS", "setlists"], ["LIBRARY", "BACKUP", "library"],
      ["System", "SETTINGS", "settings"], ["System", "DIAGNOSTICS", "diagnostics"],
    ] as const;
    // RIG has one view (chain, controls and tones together), so no section bar.
    fireEvent.click(rooms.getByRole("button", { name: "RIG" }));
    await waitFor(() => expect(useAppStore.getState().page).toBe("editor"));
    expect(container.querySelector(".rp-sections")).toBeNull();
    expect(rooms.queryByRole("button", { name: "TONES" })).not.toBeInTheDocument();
    // TOOLS: tuner, drums, EQ listed on the left, STAGE (Stage) as second section; no LIVE room.
    expect(rooms.queryByRole("button", { name: "LIVE" })).not.toBeInTheDocument();
    fireEvent.click(rooms.getByRole("button", { name: "TOOLS" }));
    await waitFor(() => expect(useAppStore.getState().page).toBe("tools"));
    expect(sections().getByRole("button", { name: "STAGE" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("complementary", { name: "Tools" })).toBeInTheDocument(), { timeout: 3_000 });
    for (const [room, section, page] of journeys) {
      fireEvent.click(room === "System" ? screen.getByRole("button", { name: "System" }) : rooms.getByRole("button", { name: room }));
      fireEvent.click(sections().getByRole("button", { name: section }));
      await waitFor(() => expect(useAppStore.getState().page).toBe(page));
      expect(sections().getByRole("button", { name: section })).toHaveAttribute("aria-current", "page");
      await waitFor(() => expect(container.querySelector(".app-content")?.querySelector(".page-loading")).not.toBeInTheDocument(), { timeout: 3_000 });
    }
    // A room remembers its last section.
    fireEvent.click(rooms.getByRole("button", { name: "LIBRARY" }));
    await waitFor(() => expect(useAppStore.getState().page).toBe("library"));
  }, 20_000);

  it("marks every populated Rig Editor effect as movable without native webview drag", async () => {
    useAppStore.setState({ page: "editor" });
    const move = vi.spyOn(useAppStore.getState(), "moveBlock").mockResolvedValue();
    const { container } = render(<App/>);
    await waitFor(() => expect(container.querySelector(".rp-chain")).toBeInTheDocument());
    const effects = [...container.querySelectorAll<HTMLButtonElement>(".block-node:not(.block-node--empty)")];
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((effect) => effect.getAttribute("draggable") === null)).toBe(true);
    expect(effects.every((effect) => effect.getAttribute("aria-label")?.includes("Drag to move"))).toBe(true);
    expect(move).not.toHaveBeenCalled();
  });

  it("moves Rig Editor effects with pointer gestures used by the desktop webview", async () => {
    useAppStore.setState({ page: "editor" });
    const move = vi.spyOn(useAppStore.getState(), "moveBlock").mockResolvedValue();
    const { container } = render(<App/>);
    await waitFor(() => expect(container.querySelector(".rp-chain")).toBeInTheDocument());

    const source = container.querySelectorAll<HTMLElement>(".chain-item")[6].querySelector<HTMLButtonElement>(".block-node")!;
    const target = container.querySelectorAll<HTMLElement>(".chain-item")[10];
    const originalHitTest = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => target) });
    const pointerEvent = (type: "pointerDown" | "pointerMove" | "pointerUp", node: Element | Window, clientX: number, clientY: number) => {
      const event = createEvent[type](node, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { pointerId: { value: 4 }, button: { value: 0 }, clientX: { value: clientX }, clientY: { value: clientY } });
      fireEvent(node, event);
    };
    pointerEvent("pointerDown", source, 20, 20);
    pointerEvent("pointerMove", source, 80, 80);
    expect(target).toHaveClass("drop-target");
    expect(document.querySelector(".slot-drag-preview")).toHaveTextContent(/DROP INTO SLOT 11/i);
    pointerEvent("pointerUp", source, 80, 80);

    await waitFor(() => expect(move).toHaveBeenCalledWith(6, 10));
    expect(target).not.toHaveClass("drop-target");
    expect(document.querySelector(".slot-drag-preview")).not.toBeInTheDocument();
    if (originalHitTest) Object.defineProperty(document, "elementFromPoint", { configurable: true, value: originalHitTest });
    else Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("softly mutes stale content while presenting one friendly connection action", async () => {
    useAppStore.setState({ device: null, capabilities: null, rigs: structuredClone(demoRigs), connectionError: null });
    const connect = vi.spyOn(deviceApi, "connect").mockResolvedValue({ device: { ...demoDevice, status: "demo" }, capabilities: structuredClone(demoCapabilities) });
    const { container } = render(<App/>);

    expect(screen.getByRole("dialog", { name: "Connect to your device" })).toBeInTheDocument();
    expect(container.querySelector(".app")).toHaveClass("app--offline");
    expect(container.querySelector(".app-workspace")).toHaveAttribute("inert");
    expect(container.querySelector(".app-workspace")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".rp-top")).toHaveAttribute("inert");
    expect(screen.queryByRole("combobox", { name: "HeadRush model" })).not.toBeInTheDocument();
    expect(screen.queryByText(/DEVICE OFFLINE/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Connect to your device$/i }));
    await waitFor(() => expect(connect).toHaveBeenCalledWith("headrushflexprime.local"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Connect to your device" })).not.toBeInTheDocument());
    expect(container.querySelector(".app")).not.toHaveClass("app--offline");
    expect(useAppStore.getState().rigs).toHaveLength(demoRigs.length);
  });

  it("reveals model and custom-address recovery only after a connection failure", async () => {
    useAppStore.setState((state) => ({ device: null, capabilities: null, connectionError: null, preferences: { ...state.preferences, address: "headrushflexprime.local" } }));
    const connect = vi.spyOn(deviceApi, "connect").mockRejectedValue(new Error("Device did not answer"));
    render(<App/>);

    fireEvent.click(screen.getByRole("button", { name: /^Connect to your device$/i }));
    await waitFor(() => expect(connect).toHaveBeenCalledWith("headrushflexprime.local"));
    await waitFor(() => expect(useAppStore.getState().connectionError).toMatch(/Device did not answer/i), { timeout: 3_000 });
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "HeadRush model" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Check advanced settings/i }));

    const model = screen.getByRole("combobox", { name: "HeadRush model" });
    expect(model).toBeInTheDocument();
    fireEvent.change(model, { target: { value: "core" } });
    expect(screen.getAllByText("headrushcore.local").length).toBeGreaterThan(0);
    fireEvent.change(model, { target: { value: "custom" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Custom HeadRush address" }), { target: { value: "192.168.1.129" } });
    connect.mockResolvedValueOnce({ device: { ...demoDevice, host: "192.168.1.129", status: "demo" }, capabilities: structuredClone(demoCapabilities) });
    fireEvent.click(screen.getByRole("button", { name: /^Connect to your device$/i }));

    await waitFor(() => expect(connect).toHaveBeenLastCalledWith("192.168.1.129"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Connect to your device" })).not.toBeInTheDocument());
  });

  it("renders and switches Settings, Diagnostics and assignment sub-workspaces", async () => {
    const { container } = render(<App/>);
    act(() => useAppStore.getState().setPage("settings"));
    await waitFor(() => expect(container.querySelector(".rp-settings")).toBeInTheDocument());
    const settingsNav = screen.getByRole("navigation", { name: "Settings" });
    for (const section of ["Pedal", "Audio", "MIDI", "Expression", "Editing", "Interface", "Services", "About", "Connection"]) {
      fireEvent.click(within(settingsNav).getByRole("button", { name: section }));
      expect(container.querySelector(".rp-settings__body")).not.toBeEmptyDOMElement();
    }
    fireEvent.click(screen.getByRole("button", { name: "DIAGNOSTICS" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Diagnostics" })).toBeInTheDocument());
    expect(screen.queryByText(/EVENT STREAM/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /API console/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/raw API requests/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Capabilities/i }));
    expect(screen.queryByText("/Evil/API/Rigs")).not.toBeInTheDocument();
    for (const tab of ["Capabilities", "Event log"]) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(tab, "i") }));
    }
    act(() => useAppStore.getState().setPage("assignments"));
    await waitFor(() => expect(pageTitle(container)).toBe("Hardware assignments"));
    for (const tab of ["Scenes", "Expression", "Footswitches"]) fireEvent.click(screen.getByRole("tab", { name: tab }));
  });

  it("connects from plain Settings rows: model, address and network scan", async () => {
    useAppStore.setState((state) => ({ page: "settings", preferences: { ...state.preferences, address: "headrushflexprime.local" } }));
    const discover = vi.spyOn(deviceApi, "discover").mockResolvedValue([{ ...demoDevice, name: "Studio Flex", host: "headrushflexprime.local" }]);
    render(<App/>);

    const address = await screen.findByRole("textbox", { name: "HeadRush address" });
    expect(address).toHaveValue("headrushflexprime.local");
    fireEvent.change(screen.getByRole("combobox", { name: "HeadRush model" }), { target: { value: "core" } });
    expect(address).toHaveValue("headrushcore.local");
    fireEvent.change(screen.getByRole("combobox", { name: "HeadRush model" }), { target: { value: "custom" } });
    expect(address).toHaveValue("");
    fireEvent.change(address, { target: { value: "192.168.1.129" } });
    expect(address).toHaveValue("192.168.1.129");

    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    await waitFor(() => expect(discover).toHaveBeenCalledOnce());
    expect(await screen.findByText("Studio Flex")).toBeInTheDocument();
  });

  it("supports room shortcuts and dashboard shortcuts", async () => {
    const { container } = render(<App/>);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useAppStore.getState().page).toBe("rigs");
    fireEvent.keyDown(window, { key: "3", metaKey: true });
    expect(useAppStore.getState().page).toBe("tools");
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(useAppStore.getState().page).toBe("settings");
    act(() => useAppStore.getState().setPage("dashboard"));
    await waitFor(() => expect(container.querySelector(".page-dashboard")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Open editor/i }));
    expect(useAppStore.getState().page).toBe("editor");
  });

  it("steps rigs and scenes from the header displays in the demo session", async () => {
    render(<App/>);
    const rig = screen.getByRole("group", { name: "Rig" });
    expect(within(rig).getByRole("button", { name: new RegExp(`Rig: 001 ${demoRigs[0].name}`) })).toBeInTheDocument();
    fireEvent.click(within(rig).getByRole("button", { name: "Next rig" }));
    expect(useAppStore.getState().selectedRigId).toBe(demoRigs[1].id);
    const scene = screen.getByRole("group", { name: "Scene" });
    fireEvent.click(within(scene).getByRole("button", { name: "Next scene" }));
    await waitFor(() => expect(useAppStore.getState().demoScene).toBe(2));
    expect(within(scene).getByRole("button", { name: /Scene: SCENE B/ })).toBeInTheDocument();
  });

  it("starts with immediate writes and no welcome dialog", async () => {
    vi.useFakeTimers();
    useAppStore.setState((state) => ({ preferences: { ...state.preferences, firstWriteResolved: false, writeMode: "ask" } }));
    render(<App/>);
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(screen.queryByRole("dialog", { name: /Welcome/i })).not.toBeInTheDocument();
    expect(useAppStore.getState().preferences).toMatchObject({ firstWriteResolved: true, writeMode: "immediate" });
    vi.useRealTimers();
  });

  it("warns before closing only while a temporary Tones rig must be restored", () => {
    useAppStore.setState({ testRigReturn: { id: "return-rig", name: "Original rig", auditionSource: "Tone3000" } });
    const view = render(<App/>);
    const protectedClose = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(protectedClose);
    expect(protectedClose.defaultPrevented).toBe(true);

    view.unmount();
    const ordinaryClose = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ordinaryClose);
    expect(ordinaryClose.defaultPrevented).toBe(false);
  });

  it("uses realtime device events, reports stream errors, and releases the listener", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    let onEvent: ((event: unknown) => void) | undefined;
    let onError: ((error: unknown) => void) | undefined;
    const stop = vi.fn();
    vi.spyOn(deviceApi, "onDeviceEvent").mockImplementation(async (event, error) => { onEvent = event; onError = error; return stop; });
    const refreshPage = vi.spyOn(useAppStore.getState(), "refreshPage").mockResolvedValue();
    const view = render(<App/>);
    await waitFor(() => expect(onEvent).toBeTypeOf("function"));
    refreshPage.mockClear();

    act(() => onEvent?.({ type: "rig-changed" }));
    await waitFor(() => expect(refreshPage).toHaveBeenCalledWith(undefined, "websocket"));
    refreshPage.mockRejectedValueOnce(new Error("refresh snapshot rejected"));
    act(() => onEvent?.({ type: "parameter-changed" }));
    await waitFor(() => expect(useAppStore.getState().diagnostics.at(-1)).toMatchObject({
      source: "Live updates",
      message: "Could not apply a realtime device update",
      detail: expect.stringMatching(/refresh snapshot rejected/i),
    }), { timeout: 1_500 });

    refreshPage.mockResolvedValueOnce(undefined);
    act(() => onEvent?.({ type: "rig-changed" }));
    await waitFor(() => expect(refreshPage).toHaveBeenCalledTimes(3), { timeout: 1_500 });
    act(() => onError?.(new Error("socket closed")));
    expect(useAppStore.getState().diagnostics).toContainEqual(expect.objectContaining({ source: "Live updates", message: expect.stringMatching(/HTTP polling is still active/i) }));

    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("falls back cleanly when realtime subscription cannot start", async () => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    vi.spyOn(deviceApi, "onDeviceEvent").mockRejectedValue(new Error("upgrade rejected"));
    render(<App/>);
    await waitFor(() => expect(useAppStore.getState().diagnostics.some((entry) => entry.message.includes("Could not start realtime updates"))).toBe(true));
  });

  it.each(["headrushflexprime.local", "192.168.1.129"])("automatically attempts the model hostname once with saved address %s", async (address) => {
    vi.spyOn(deviceApi, "isNative").mockReturnValue(true);
    vi.spyOn(deviceApi, "onDeviceEvent").mockResolvedValue(() => undefined);
    const connect = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState((state) => ({
      device: null,
      connect,
      preferences: { ...state.preferences, address, modelAddress: "headrushflexprime.local", autoDiscovery: true },
    }));
    const view = render(<App/>);
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    expect(connect).toHaveBeenCalledWith("headrushflexprime.local");
    view.rerender(<App/>);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("routes a valid page query and ignores unknown routes", async () => {
    window.history.replaceState({}, "", "/?page=settings");
    const first = render(<App/>);
    await waitFor(() => expect(useAppStore.getState().page).toBe("settings"));
    first.unmount(); resetApp();
    window.history.replaceState({}, "", "/?page=not-a-page");
    render(<App/>);
    expect(useAppStore.getState().page).toBe("dashboard");
    window.history.replaceState({}, "", "/");
  });
});

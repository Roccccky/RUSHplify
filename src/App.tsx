import { lazy, Suspense, useEffect, useRef } from "react";
import { RushShell } from "./shell/rush-shell";
import { DeviceConnectionGate } from "./components/system/device-connection-gate";
import { RushplifyContextMenu } from "./components/system/rushplify-context-menu";
import { BrandMark } from "./components/system/brand";
import { useAppStore } from "./stores/app-store";
import { deviceApi } from "./services/device-api";
import { createAsyncRefreshScheduler } from "./services/device-sync-scheduler";
import { deviceErrorDetail } from "./services/device-errors";
import { loadAssignmentsPage, loadDashboardPage, loadEditorPage, loadRigsPages, loadStagePage, loadSystemPages, loadToolsPage } from "./page-loaders";
import { primaryConnectionAddress } from "./domain/connection-address";

const DashboardPage = lazy(() => loadDashboardPage().then((module) => ({ default: module.DashboardPage })));
const ChainPage = lazy(() => loadEditorPage().then((module) => ({ default: module.ChainPage })));
const AssignmentsPage = lazy(() => loadAssignmentsPage().then((module) => ({ default: module.AssignmentsPage })));
const BackupPage = lazy(() => loadRigsPages().then((module) => ({ default: module.BackupPage })));
const FilesPage = lazy(() => loadRigsPages().then((module) => ({ default: module.FilesPage })));
const SetlistsPage = lazy(() => loadRigsPages().then((module) => ({ default: module.SetlistsPage })));
const LivePlayPage = lazy(() => loadStagePage().then((module) => ({ default: module.LivePlayPage })));
const DiagnosticsPage = lazy(() => loadSystemPages().then((module) => ({ default: module.DiagnosticsPage })));
const SettingsPage = lazy(() => loadSystemPages().then((module) => ({ default: module.SettingsPage })));
const ToolsPage = lazy(() => loadToolsPage().then((module) => ({ default: module.ToolsPage })));

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage, editor: ChainPage, rigs: SetlistsPage, setlists: SetlistsPage, files: FilesPage,
  live: LivePlayPage, "tone-cloud": ChainPage, assignments: AssignmentsPage,
  tools: ToolsPage,
  library: BackupPage, settings: SettingsPage, diagnostics: DiagnosticsPage,
};

function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading"><span className="brand__mark"><BrandMark/></span></div>;
}

export default function App() {
  const page = useAppStore((s) => s.page); const preferences = useAppStore((s) => s.preferences); const device = useAppStore((s) => s.device); const testRigReturn = useAppStore((s) => s.testRigReturn); const resolve = useAppStore((s) => s.resolveFirstWrite); const autoConnectAttempted = useRef(false); const lastRealtimeEventAt = useRef(0);
  const Page = pages[page] ?? DashboardPage;
  const deviceReady = Boolean(device && ["ready", "demo"].includes(device.status));
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("page");
    if (requested && pages[requested] && requested !== useAppStore.getState().page) useAppStore.getState().setPage(requested);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); useAppStore.getState().setPage("rigs"); }
    }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!testRigReturn) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [testRigReturn]);
  useEffect(() => {
    if (deviceReady && !preferences.firstWriteResolved) {
      // No welcome dialog: edits go to the pedal right away; Settings → Editing can switch to review first.
      resolve(preferences.writeMode === "staged" ? "staged" : "immediate");
    }
  }, [deviceReady, page, preferences.writeMode, preferences.firstWriteResolved]);
  useEffect(() => {
    if (!deviceApi.isNative()) return;
    let disposed = false;
    let unlisten: () => void = () => undefined;
    const refreshScheduler = createAsyncRefreshScheduler(
      () => useAppStore.getState().refreshPage(undefined, "websocket"),
      {
        debounceMs: 100,
        minIntervalMs: 600,
        onError: (error) => useAppStore.getState().addDiagnostic({
          level: "warning",
          source: "Live updates",
          message: "Could not apply a realtime device update",
          detail: deviceErrorDetail(error),
        }),
      },
    );
    void deviceApi.onDeviceEvent(() => {
      if (disposed) return;
      const liveState = useAppStore.getState();
      if (liveState.page === "tools" && liveState.performanceTunerActive) return;
      lastRealtimeEventAt.current = Date.now();
      refreshScheduler.trigger();
    }, (error) => {
      const state = useAppStore.getState();
      state.addDiagnostic({ level: "warning", source: "Live updates", message: "Realtime updates paused; HTTP polling is still active", detail: deviceErrorDetail(error) });
    }).then((stop) => { if (disposed) stop(); else unlisten = stop; })
      .catch((error) => { if (!disposed) useAppStore.getState().addDiagnostic({ level: "warning", source: "Live updates", message: "Could not start realtime updates; HTTP polling is active", detail: deviceErrorDetail(error) }); });
    return () => { disposed = true; refreshScheduler.cancel(); unlisten(); };
  }, []);
  useEffect(() => {
    if (!deviceApi.isNative() || !preferences.autoDiscovery || device || autoConnectAttempted.current) return;
    if (useAppStore.getState().connectionBusy) return;
    autoConnectAttempted.current = true;
    void useAppStore.getState().connect(primaryConnectionAddress(preferences.address, preferences.modelAddress));
  }, [device, preferences.address, preferences.modelAddress, preferences.autoDiscovery]);
  useEffect(() => {
    if (!deviceApi.isNative() || !device) return;
    const fast = ["dashboard", "editor", "live", "assignments", "tools"].includes(page);
    const poll = window.setInterval(() => {
      const state = useAppStore.getState();
      const realtimeIsHealthy = Date.now() - lastRealtimeEventAt.current < 5_000;
      if (document.visibilityState === "visible" && !realtimeIsHealthy && !(page === "tools" && state.performanceTunerActive)) void state.refreshPage(page, "poll");
    }, fast ? 2_500 : 6_000);
    const reconcile = window.setInterval(() => {
      const state = useAppStore.getState();
      if (document.visibilityState === "visible" && !(page === "tools" && state.performanceTunerActive)) void state.refreshFull("poll");
    }, 120_000);
    void useAppStore.getState().refreshPage(page, "manual");
    return () => { window.clearInterval(poll); window.clearInterval(reconcile); };
  }, [device, page]);
  return <RushShell overlay={!deviceReady ? <DeviceConnectionGate/> : undefined}><Suspense fallback={<PageLoading/>}><Page /></Suspense><RushplifyContextMenu/></RushShell>;
}

import { describe, expect, it } from "vitest";
import {
  loadAssignmentsPage,
  loadDashboardPage,
  loadEditorPage,
  loadLibraryPage,
  loadPerformancePage,
  loadRigsPages,
  loadStagePage,
  loadSystemPages,
  loadToolsPage,
  preloadPage,
} from "./page-loaders";

describe("workspace code splitting", () => {
  it.each([
    ["dashboard", loadDashboardPage, "DashboardPage"],
    ["editor", loadEditorPage, "ChainPage"],
    ["rig library", loadRigsPages, "SetlistsPage"],
    ["Stage", loadStagePage, "LivePlayPage"],
    ["performance tools", loadPerformancePage, "PerformanceToolsPage"],
    ["tools", loadToolsPage, "ToolsPage"],
    ["library", loadLibraryPage, "LibraryBackupPage"],
    ["system pages", loadSystemPages, "SettingsPage"],
    ["assignments", loadAssignmentsPage, "AssignmentsPage"],
  ] as const)("loads the %s chunk with its expected public page", async (_name, loader, exportName) => {
    const module = await loader();
    expect(module).toHaveProperty(exportName);
    expect(typeof module[exportName as keyof typeof module]).toBe("function");
  });

  it.each([
    ["dashboard", "DashboardPage"],
    ["editor", "ChainPage"],
    ["rigs", "SetlistsPage"],
    ["setlists", "SetlistsPage"],
    ["live", "LivePlayPage"],
    ["tone-cloud", "ChainPage"],
    ["tools", "ToolsPage"],
    ["library", "BackupPage"],
    ["settings", "SettingsPage"],
    ["diagnostics", "DiagnosticsPage"],
    ["assignments", "AssignmentsPage"],
    ["future-workspace", "DashboardPage"],
  ] as const)("preloads route %s from the correct chunk", async (route, exportName) => {
    const module = await preloadPage(route);
    expect(module).toHaveProperty(exportName);
    expect(typeof module[exportName as keyof typeof module]).toBe("function");
  });
});

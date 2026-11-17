export const loadDashboardPage = () => import("./pages/dashboard");
export const loadEditorPage = () => import("./rig/chain-page");
export const loadRigsPages = () => import("./library/library-pages");
export const loadStagePage = () => import("./pages/live-play");
export const loadPerformancePage = () => import("./pages/performance-studio");
export const loadToolsPage = () => import("./tools/tools-page");
export const loadLibraryPage = () => import("./pages/library-backup");
export const loadSystemPages = () => import("./pages/system-pages");
export const loadAssignmentsPage = () => import("./pages/assignments");

const loaderFor = (page: string) => {
  if (page === "dashboard") return loadDashboardPage;
  if (page === "editor" || page === "tone-cloud") return loadEditorPage;
  if (page === "rigs" || page === "setlists" || page === "files" || page === "library") return loadRigsPages;
  if (page === "live") return loadStagePage;
  if (page === "tools") return loadToolsPage;
  if (page === "settings" || page === "diagnostics") return loadSystemPages;
  if (page === "assignments") return loadAssignmentsPage;
  return loadDashboardPage;
};

/** Begin fetching a workspace before it is selected. Browser module imports are
 * cached, so calling this on hover/focus makes the eventual navigation instant. */
export const preloadPage = (page: string) => loaderFor(page)();

import { assertRushplifySyncDocument, createRushplifySyncDocument, portablePatchFromSyncDocument, type RushplifySyncDocument } from "../domain/rushplify-sync";
import { migratePersistedTestRigIrFiles, useAppStore } from "./app-store";

export function captureRushplifySyncDocument(accountId: string, clientId: string, previous?: RushplifySyncDocument | null, now?: string) {
  return createRushplifySyncDocument(useAppStore.getState(), { accountId, clientId, previous, now });
}

export function applyRushplifySyncDocument(value: unknown) {
  assertRushplifySyncDocument(value);
  const state = useAppStore.getState();
  const patch = portablePatchFromSyncDocument(value, state.liveStages);
  const { sidebarCollapsed: _sidebarCollapsed, ...interfacePreferences } = patch.preferences;
  useAppStore.setState({
    liveStages: patch.liveStages, selectedLiveStageId: patch.selectedLiveStageId, liveLayout: patch.liveLayout,
    testRigs: migratePersistedTestRigIrFiles(patch.testRigs), selectedTestRigId: patch.selectedTestRigId,
    testRigSets: patch.testRigSets, selectedTestRigSetId: patch.selectedTestRigSetId,
    favoriteRigIds: patch.favoriteRigIds, favoriteToneIds: patch.favoriteToneIds, favoriteBlockNames: patch.favoriteBlockNames,
    favoriteLiveControlKeys: patch.favoriteLiveControlKeys, liveControlPresets: patch.liveControlPresets,
    preferences: { ...state.preferences, ...interfacePreferences }, sidebarCollapsed: patch.sidebarCollapsed,
    savedWorkflows: patch.savedWorkflows,
  });
  return value;
}

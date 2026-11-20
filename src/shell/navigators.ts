import { useCallback, useMemo } from "react";
import { useAppStore } from "../stores/app-store";
import { deviceErrorDetail } from "../services/device-errors";
import type { DisplayItem } from "./display";
import { useRigNameSuggestion } from "../rig/use-rig-name-suggestion";

export const SCENE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

const rigTag = (index: number) => String(index + 1).padStart(3, "0");

/** Rigs as the header display shows them: the pedal's rig list when connected, the local
 * library in the browser demo. Committing loads the rig on the pedal. */
export function useRigNavigator() {
  const live = useAppStore((state) => state.liveSnapshot);
  const rigs = useAppStore((state) => state.rigs);
  const selectedRigId = useAppStore((state) => state.selectedRigId);

  const items = useMemo<DisplayItem[]>(() => live
    ? live.rigLibrary.map((rig, index) => ({ id: rig.id, label: rig.name, tag: rigTag(index), color: rig.color }))
    : rigs.map((rig, index) => ({ id: rig.id, label: rig.name, tag: rigTag(index), color: rig.color })), [live, rigs]);

  const index = live
    ? live.rigLibrary.findIndex((rig) => rig.loaded || rig.id === live.rig.id)
    : rigs.findIndex((rig) => rig.id === selectedRigId);

  const commit = useCallback(async (target: number) => {
    const state = useAppStore.getState();
    const snapshot = state.liveSnapshot;
    if (!snapshot) {
      const rig = state.rigs[target];
      if (rig) state.selectRig(rig.id);
      return;
    }
    const rig = snapshot.rigLibrary[target];
    if (!rig) return;
    try {
      await state.loadRig(rig.id, rig.srId ?? "");
    } catch (error) {
      state.addDiagnostic({ level: "warning", source: "Rig", message: `Could not load ${rig.name}`, detail: deviceErrorDetail(error) });
    }
  }, []);

  /** Rename the loaded rig (its file on the pedal). Errors reach the name field. */
  const rename = useCallback(async (name: string) => {
    const target = items[index];
    if (target) await useAppStore.getState().renameRig(target.id, name);
  }, [items, index]);

  const suggest = useRigNameSuggestion(items[index]?.label ?? "");

  return { items, index, commit, rename, suggest, names: items.map((item) => item.label), dirty: live?.rig.modified === "Unsaved changes" };
}

/** Scenes A–F of the loaded rig. */
export function useSceneNavigator() {
  const currentScene = useAppStore((state) => state.liveSnapshot?.currentScene ?? state.demoScene);
  const items = useMemo<DisplayItem[]>(() => SCENE_LETTERS.map((letter) => ({ id: letter, label: `SCENE ${letter}` })), []);
  const commit = useCallback((target: number) => useAppStore.getState().selectScene(target), []);
  return { items, index: Math.max(0, Math.min(5, currentScene - 1)), commit };
}

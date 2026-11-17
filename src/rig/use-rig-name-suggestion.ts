import { useCallback } from "react";
import { useAppStore } from "../stores/app-store";
import { suggestRigName, type CaptureNames } from "../domain/rig-name";

/** Name suggestions for the loaded rig (the pedal's, or the selected one in the demo), built from its chain.
 *  `exceptName` is the rig's own name, which the suggestion may repeat. */
export function useRigNameSuggestion(exceptName = "") {
  return useCallback((variant: number) => {
    const state = useAppStore.getState();
    const rig = state.liveSnapshot?.rig ?? state.rigs.find((item) => item.id === state.selectedRigId) ?? state.rigs[0];
    const captures: CaptureNames = Object.fromEntries(Object.entries(state.slotCaptures).map(([host, capture]) => [host, capture.tone.title]));
    const names = state.liveSnapshot?.rigLibrary.map((item) => item.name) ?? state.rigs.map((item) => item.name);
    const own = exceptName.trim().toLocaleLowerCase();
    return suggestRigName(rig?.blocks ?? [], { captures, variant, taken: names.filter((name) => name.trim().toLocaleLowerCase() !== own) });
  }, [exceptName]);
}

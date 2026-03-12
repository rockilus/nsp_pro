import { useState, useCallback } from "react";
import { SelectedScheduleCell } from "../../../types/scheduleSelection";
import { SolveScopeType } from "../../../types/solveTaskStatus";

interface GenerationSelectionState {
  cells: SelectedScheduleCell[];
  scopeType: SolveScopeType;
}

const DEFAULT_STATE: GenerationSelectionState = {
  cells: [],
  scopeType: "FULL",
};

function loadFromStorage(campaignId: string): GenerationSelectionState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const item = localStorage.getItem(`generateSelection_${campaignId}`);
    if (!item) return DEFAULT_STATE;
    const parsed = JSON.parse(item);
    // Handle legacy format (plain array of cells without scopeType)
    if (Array.isArray(parsed)) {
      return { cells: parsed as SelectedScheduleCell[], scopeType: "FULL" };
    }
    return {
      cells: Array.isArray(parsed.cells) ? parsed.cells : [],
      scopeType: parsed.scopeType ?? "FULL",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveToStorage(
  campaignId: string,
  state: GenerationSelectionState,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `generateSelection_${campaignId}`,
      JSON.stringify(state),
    );
  } catch (error) {
    console.warn("Error saving generation selection to localStorage:", error);
  }
}

/** Removes the generation selection entry for a campaign from localStorage. */
export function clearGenerationSelection(campaignId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`generateSelection_${campaignId}`);
}

/**
 * Persists the custom-solve cell selection and solve scope type in localStorage
 * keyed by campaign ID. When the campaign changes, the previous campaign's
 * selection is preserved in storage and the new campaign's selection is loaded
 * automatically. When campaignId is null, an empty selection is returned and
 * writes are ignored.
 */
export function useGenerationSelection(
  campaignId: string | null,
): [
  SelectedScheduleCell[],
  (
    update:
      | SelectedScheduleCell[]
      | ((prev: SelectedScheduleCell[]) => SelectedScheduleCell[]),
  ) => void,
  SolveScopeType,
  (scope: SolveScopeType) => void,
] {
  const [state, setState] = useState<GenerationSelectionState>(() =>
    campaignId ? loadFromStorage(campaignId) : DEFAULT_STATE,
  );
  const [trackedCampaignId, setTrackedCampaignId] = useState(campaignId);

  // Reset state when campaignId changes (render-phase update avoids useEffect)
  if (trackedCampaignId !== campaignId) {
    setTrackedCampaignId(campaignId);
    setState(campaignId ? loadFromStorage(campaignId) : DEFAULT_STATE);
  }

  const updateCells = useCallback(
    (
      update:
        | SelectedScheduleCell[]
        | ((prev: SelectedScheduleCell[]) => SelectedScheduleCell[]),
    ) => {
      setState((prev) => {
        const newCells =
          typeof update === "function" ? update(prev.cells) : update;
        const newState = { ...prev, cells: newCells };
        if (campaignId) saveToStorage(campaignId, newState);
        return newState;
      });
    },
    [campaignId],
  );

  const setScopeType = useCallback(
    (scope: SolveScopeType) => {
      setState((prev) => {
        const newState = { ...prev, scopeType: scope };
        if (campaignId) saveToStorage(campaignId, newState);
        return newState;
      });
    },
    [campaignId],
  );

  return [state.cells, updateCells, state.scopeType, setScopeType];
}

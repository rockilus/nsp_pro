import { useState, useCallback } from "react";
import { SelectedScheduleCell } from "../../../types/scheduleSelection";
import { SolveScopeType } from "../../../types/solveTaskStatus";

interface GenerationSelectionState {
  workerCells: SelectedScheduleCell[];
  shiftCells: SelectedScheduleCell[];
  scopeType: SolveScopeType;
}

const DEFAULT_STATE: GenerationSelectionState = {
  workerCells: [],
  shiftCells: [],
  scopeType: "FULL",
};

function loadFromStorage(campaignId: string): GenerationSelectionState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const item = localStorage.getItem(`generateSelection_${campaignId}`);
    if (!item) return DEFAULT_STATE;
    const parsed = JSON.parse(item);
    // Handle legacy format: plain array of cells (map to workerCells)
    if (Array.isArray(parsed)) {
      return {
        workerCells: parsed as SelectedScheduleCell[],
        shiftCells: [],
        scopeType: "FULL",
      };
    }
    // Handle previous single-array format with `cells` key (map to workerCells)
    if (Array.isArray(parsed.cells)) {
      return {
        workerCells: parsed.cells,
        shiftCells: [],
        scopeType: parsed.scopeType ?? "FULL",
      };
    }
    return {
      workerCells: Array.isArray(parsed.workerCells) ? parsed.workerCells : [],
      shiftCells: Array.isArray(parsed.shiftCells) ? parsed.shiftCells : [],
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
 * keyed by campaign ID. Selections are stored per-view (worker / shift) so
 * switching views never wipes the other view's selection.
 *
 * Returns a 6-tuple:
 * [workerCells, updateWorkerCells, shiftCells, updateShiftCells, scopeType, setScopeType]
 *
 * When campaignId is null, empty selections are returned and writes are ignored.
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

  const updateWorkerCells = useCallback(
    (
      update:
        | SelectedScheduleCell[]
        | ((prev: SelectedScheduleCell[]) => SelectedScheduleCell[]),
    ) => {
      setState((prev) => {
        const newCells =
          typeof update === "function" ? update(prev.workerCells) : update;
        const newState = { ...prev, workerCells: newCells };
        if (campaignId) saveToStorage(campaignId, newState);
        return newState;
      });
    },
    [campaignId],
  );

  const updateShiftCells = useCallback(
    (
      update:
        | SelectedScheduleCell[]
        | ((prev: SelectedScheduleCell[]) => SelectedScheduleCell[]),
    ) => {
      setState((prev) => {
        const newCells =
          typeof update === "function" ? update(prev.shiftCells) : update;
        const newState = { ...prev, shiftCells: newCells };
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

  return [
    state.workerCells,
    updateWorkerCells,
    state.shiftCells,
    updateShiftCells,
    state.scopeType,
    setScopeType,
  ];
}

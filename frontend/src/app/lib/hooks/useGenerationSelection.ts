import { useState, useEffect, useCallback } from "react";
import { SelectedScheduleCell } from "../../../types/scheduleSelection";

function loadFromStorage(campaignId: string): SelectedScheduleCell[] {
  if (typeof window === "undefined") return [];
  try {
    const item = localStorage.getItem(`generateSelection_${campaignId}`);
    return item ? (JSON.parse(item) as SelectedScheduleCell[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(
  campaignId: string,
  cells: SelectedScheduleCell[],
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `generateSelection_${campaignId}`,
      JSON.stringify(cells),
    );
  } catch (error) {
    console.warn("Error saving generation selection to localStorage:", error);
  }
}

/**
 * Persists the custom-solve cell selection in localStorage keyed by campaign ID.
 * When the campaign changes, the previous campaign's selection is preserved in
 * storage and the new campaign's selection is loaded automatically.
 * When campaignId is null, an empty selection is returned and writes are ignored.
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
] {
  const [selectedCells, setSelectedCells] = useState<SelectedScheduleCell[]>(
    () => {
      if (!campaignId) return [];
      return loadFromStorage(campaignId);
    },
  );

  // Reload selection whenever the active campaign changes
  useEffect(() => {
    setSelectedCells(campaignId ? loadFromStorage(campaignId) : []);
  }, [campaignId]);

  const updateCells = useCallback(
    (
      update:
        | SelectedScheduleCell[]
        | ((prev: SelectedScheduleCell[]) => SelectedScheduleCell[]),
    ) => {
      setSelectedCells((prev) => {
        const newCells = typeof update === "function" ? update(prev) : update;
        if (campaignId) {
          saveToStorage(campaignId, newCells);
        }
        return newCells;
      });
    },
    [campaignId],
  );

  return [selectedCells, updateCells];
}

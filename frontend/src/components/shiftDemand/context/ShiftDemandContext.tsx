/**
 * Shift demand context for optimized state management
 * Provides optimistic updates, conflict resolution, and performance optimizations
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  ShiftDemandMatrix,
  CellChange,
  OptimisticUpdate,
  ConflictResolution,
  GridDisplayOptions,
  ShiftDemandContextState,
  ShiftDemandContextActions,
} from "@/types/shiftDemand";

// Action types for the reducer
type ShiftDemandAction =
  | { type: "SET_MATRIX"; payload: ShiftDemandMatrix }
  | { type: "OPTIMISTIC_UPDATE"; payload: OptimisticUpdate }
  | { type: "CONFIRM_UPDATE"; payload: string } // updateId
  | { type: "REVERT_UPDATE"; payload: string } // updateId
  | { type: "SET_CONFLICT"; payload: ConflictResolution }
  | { type: "RESOLVE_CONFLICT"; payload: string } // conflictId
  | { type: "SET_LOADING"; payload: { key: string; loading: boolean } }
  | { type: "SET_ERROR"; payload: { key: string; error: string | null } }
  | { type: "BATCH_OPTIMISTIC_UPDATES"; payload: OptimisticUpdate[] }
  | { type: "CLEAR_ALL_OPTIMISTIC" }
  | { type: "SET_DISPLAY_OPTIONS"; payload: Partial<GridDisplayOptions> };

// Initial state
const initialState: ShiftDemandContextState = {
  matrix: {},
  optimisticUpdates: new Map(),
  conflicts: new Map(),
  loadingStates: new Map(),
  errors: new Map(),
  displayOptions: {
    showWeekends: true,
    showEmptyCells: true,
    highlightChanges: true,
    compactView: false,
    showShiftTotals: true,
    showDateTotals: true,
  },
  isOptimisticUpdating: false,
  conflictCount: 0,
};

// Reducer function
function shiftDemandReducer(
  state: ShiftDemandContextState,
  action: ShiftDemandAction
): ShiftDemandContextState {
  switch (action.type) {
    case "SET_MATRIX":
      return {
        ...state,
        matrix: action.payload,
      };

    case "OPTIMISTIC_UPDATE": {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(action.payload.id, action.payload);

      // Apply optimistic update to matrix
      const newMatrix = { ...state.matrix };
      action.payload.changes.forEach((change) => {
        if (!newMatrix[change.shiftId]) {
          newMatrix[change.shiftId] = {};
        }
        newMatrix[change.shiftId][change.date] = change.newValue;
      });

      return {
        ...state,
        matrix: newMatrix,
        optimisticUpdates: newOptimisticUpdates,
        isOptimisticUpdating: true,
      };
    }

    case "CONFIRM_UPDATE": {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(action.payload);

      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates,
        isOptimisticUpdating: newOptimisticUpdates.size > 0,
      };
    }

    case "REVERT_UPDATE": {
      const updateToRevert = state.optimisticUpdates.get(action.payload);
      if (!updateToRevert) return state;

      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(action.payload);

      // Revert matrix changes
      const newMatrix = { ...state.matrix };
      updateToRevert.changes.forEach((change) => {
        if (newMatrix[change.shiftId]) {
          if (change.oldValue === undefined) {
            delete newMatrix[change.shiftId][change.date];
          } else {
            newMatrix[change.shiftId][change.date] = change.oldValue;
          }
        }
      });

      return {
        ...state,
        matrix: newMatrix,
        optimisticUpdates: newOptimisticUpdates,
        isOptimisticUpdating: newOptimisticUpdates.size > 0,
      };
    }

    case "BATCH_OPTIMISTIC_UPDATES": {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      const newMatrix = { ...state.matrix };

      action.payload.forEach((update) => {
        newOptimisticUpdates.set(update.id, update);
        update.changes.forEach((change) => {
          if (!newMatrix[change.shiftId]) {
            newMatrix[change.shiftId] = {};
          }
          newMatrix[change.shiftId][change.date] = change.newValue;
        });
      });

      return {
        ...state,
        matrix: newMatrix,
        optimisticUpdates: newOptimisticUpdates,
        isOptimisticUpdating: true,
      };
    }

    case "CLEAR_ALL_OPTIMISTIC": {
      // Rebuild matrix from base state without optimistic updates
      let baseMatrix = { ...state.matrix };

      // Revert all optimistic updates
      state.optimisticUpdates.forEach((update) => {
        update.changes.forEach((change) => {
          if (baseMatrix[change.shiftId]) {
            if (change.oldValue === undefined) {
              delete baseMatrix[change.shiftId][change.date];
            } else {
              baseMatrix[change.shiftId][change.date] = change.oldValue;
            }
          }
        });
      });

      return {
        ...state,
        matrix: baseMatrix,
        optimisticUpdates: new Map(),
        isOptimisticUpdating: false,
      };
    }

    case "SET_CONFLICT": {
      const newConflicts = new Map(state.conflicts);
      newConflicts.set(action.payload.id, action.payload);

      return {
        ...state,
        conflicts: newConflicts,
        conflictCount: newConflicts.size,
      };
    }

    case "RESOLVE_CONFLICT": {
      const newConflicts = new Map(state.conflicts);
      newConflicts.delete(action.payload);

      return {
        ...state,
        conflicts: newConflicts,
        conflictCount: newConflicts.size,
      };
    }

    case "SET_LOADING": {
      const newLoadingStates = new Map(state.loadingStates);
      if (action.payload.loading) {
        newLoadingStates.set(action.payload.key, true);
      } else {
        newLoadingStates.delete(action.payload.key);
      }

      return {
        ...state,
        loadingStates: newLoadingStates,
      };
    }

    case "SET_ERROR": {
      const newErrors = new Map(state.errors);
      if (action.payload.error) {
        newErrors.set(action.payload.key, action.payload.error);
      } else {
        newErrors.delete(action.payload.key);
      }

      return {
        ...state,
        errors: newErrors,
      };
    }

    case "SET_DISPLAY_OPTIONS":
      return {
        ...state,
        displayOptions: {
          ...state.displayOptions,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

// Context creation
const ShiftDemandContext = createContext<
  (ShiftDemandContextState & ShiftDemandContextActions) | undefined
>(undefined);

// Provider component
interface ShiftDemandProviderProps {
  children: React.ReactNode;
  initialMatrix?: ShiftDemandMatrix;
  teamId: string;
  debounceMs?: number;
}

export const ShiftDemandProvider: React.FC<ShiftDemandProviderProps> = ({
  children,
  initialMatrix = {},
  teamId,
  debounceMs = 500,
}) => {
  const [state, dispatch] = useReducer(shiftDemandReducer, {
    ...initialState,
    matrix: initialMatrix,
  });

  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const updateCounter = useRef(0);

  // Generate unique update ID
  const generateUpdateId = useCallback(() => {
    return `update-${teamId}-${Date.now()}-${++updateCounter.current}`;
  }, [teamId]);

  // Actions
  const setMatrix = useCallback((matrix: ShiftDemandMatrix) => {
    dispatch({ type: "SET_MATRIX", payload: matrix });
  }, []);

  const applyOptimisticUpdate = useCallback(
    (changes: CellChange[], metadata?: any) => {
      const updateId = generateUpdateId();
      const optimisticUpdate: OptimisticUpdate = {
        id: updateId,
        timestamp: Date.now(),
        changes,
        metadata,
        status: "pending",
      };

      dispatch({ type: "OPTIMISTIC_UPDATE", payload: optimisticUpdate });
      return updateId;
    },
    [generateUpdateId]
  );

  const confirmUpdate = useCallback((updateId: string) => {
    dispatch({ type: "CONFIRM_UPDATE", payload: updateId });
  }, []);

  const revertUpdate = useCallback((updateId: string) => {
    dispatch({ type: "REVERT_UPDATE", payload: updateId });
  }, []);

  const batchOptimisticUpdates = useCallback(
    (updatesBatch: { changes: CellChange[]; metadata?: any }[]) => {
      const optimisticUpdates = updatesBatch.map((batch) => ({
        id: generateUpdateId(),
        timestamp: Date.now(),
        changes: batch.changes,
        metadata: batch.metadata,
        status: "pending" as const,
      }));

      dispatch({
        type: "BATCH_OPTIMISTIC_UPDATES",
        payload: optimisticUpdates,
      });
      return optimisticUpdates.map((update) => update.id);
    },
    [generateUpdateId]
  );

  const clearAllOptimistic = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_OPTIMISTIC" });
  }, []);

  const setConflict = useCallback((conflict: ConflictResolution) => {
    dispatch({ type: "SET_CONFLICT", payload: conflict });
  }, []);

  const resolveConflict = useCallback((conflictId: string) => {
    dispatch({ type: "RESOLVE_CONFLICT", payload: conflictId });
  }, []);

  const setLoading = useCallback((key: string, loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: { key, loading } });
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: { key, error } });
  }, []);

  const updateDisplayOptions = useCallback(
    (options: Partial<GridDisplayOptions>) => {
      dispatch({ type: "SET_DISPLAY_OPTIONS", payload: options });
    },
    []
  );

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    const timeouts = debounceTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  // Context value
  const contextValue = useMemo(
    () => ({
      ...state,
      // Actions
      setMatrix,
      applyOptimisticUpdate,
      confirmUpdate,
      revertUpdate,
      batchOptimisticUpdates,
      clearAllOptimistic,
      setConflict,
      resolveConflict,
      setLoading,
      setError,
      updateDisplayOptions,
    }),
    [
      state,
      setMatrix,
      applyOptimisticUpdate,
      confirmUpdate,
      revertUpdate,
      batchOptimisticUpdates,
      clearAllOptimistic,
      setConflict,
      resolveConflict,
      setLoading,
      setError,
      updateDisplayOptions,
    ]
  );

  return (
    <ShiftDemandContext.Provider value={contextValue}>
      {children}
    </ShiftDemandContext.Provider>
  );
};

// Hook to use the context
export const useShiftDemandContext = () => {
  const context = useContext(ShiftDemandContext);
  if (context === undefined) {
    throw new Error(
      "useShiftDemandContext must be used within a ShiftDemandProvider"
    );
  }
  return context;
};

// Performance utilities
export const useShiftDemandPerformance = () => {
  const context = useShiftDemandContext();

  const isOptimizing = context.isOptimisticUpdating;
  const hasConflicts = context.conflictCount > 0;
  const hasErrors = context.errors.size > 0;
  const isLoading = context.loadingStates.size > 0;

  const metrics = useMemo(
    () => ({
      optimisticUpdatesCount: context.optimisticUpdates.size,
      conflictsCount: context.conflictCount,
      errorsCount: context.errors.size,
      loadingOperationsCount: context.loadingStates.size,
      isHealthy: !hasConflicts && !hasErrors,
      needsAttention: hasConflicts || hasErrors,
    }),
    [context, hasConflicts, hasErrors]
  );

  return {
    metrics,
    isOptimizing,
    hasConflicts,
    hasErrors,
    isLoading,
  };
};

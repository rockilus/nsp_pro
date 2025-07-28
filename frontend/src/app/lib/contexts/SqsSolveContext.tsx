/**
 * Context and provider for managing SQS solve state
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { AssignmentT } from "@/types/assignment";
import { BreachT } from "@/types/breach";
import { RequestT } from "@/types/request";
import { ScheduleT } from "@/types/schedule";
import {
  SolveRequestStatus,
  SolveTaskStatusResponseT,
} from "@/types/solveTaskStatus";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  useStartSolve,
  useCancelSolve,
  useGetSolveStatus,
} from "../../../hooks/useSqsSolve";
import { SolvePollingService } from "../services/solvePollingService";

dayjs.extend(utc);

export interface SqsSolveState {
  // Current solve session
  solveId: string | null;
  status: SolveRequestStatus | "IDDLE";
  startedAt: dayjs.Dayjs | null;
  completedAt: dayjs.Dayjs | null;
  errorMessage: string | null;

  // Solve results
  result: {
    schedule?: ScheduleT;
    assignments?: AssignmentT[];
    breaches?: BreachT[];
    requests?: RequestT[];
  } | null;

  // UI state
  isPolling: boolean;
  lastError: string | null;
  retryCount: number;
}

type SqsSolveAction =
  | { type: "SOLVE_START"; payload: { solveId: string } }
  | { type: "SOLVE_STATUS_UPDATE"; payload: SolveTaskStatusResponseT }
  | { type: "SOLVE_COMPLETE"; payload: SolveTaskStatusResponseT }
  | { type: "SOLVE_FAILED"; payload: { error: string } }
  | { type: "SOLVE_ERROR"; payload: { error: string } }
  | { type: "POLLING_START" }
  | { type: "POLLING_STOP" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

const initialState: SqsSolveState = {
  solveId: null,
  status: "IDDLE",
  startedAt: null,
  completedAt: null,
  errorMessage: null,
  result: null,
  isPolling: false,
  lastError: null,
  retryCount: 0,
};

function sqsSolveReducer(
  state: SqsSolveState,
  action: SqsSolveAction
): SqsSolveState {
  switch (action.type) {
    case "SOLVE_START":
      return {
        ...state,
        solveId: action.payload.solveId,
        status: SolveRequestStatus.PENDING,
        startedAt: dayjs().utc(),
        completedAt: null,
        errorMessage: null,
        result: null,
        lastError: null,
        retryCount: 0,
      };

    case "SOLVE_STATUS_UPDATE":
      return {
        ...state,
        status: action.payload.requestStatus,
        startedAt: action.payload.startedAt || state.startedAt,
        completedAt: action.payload.completedAt || state.completedAt,
        errorMessage: action.payload.errorMessage || state.errorMessage,
        result: action.payload.result || state.result,
      };

    case "SOLVE_COMPLETE":
      return {
        ...state,
        status: SolveRequestStatus.COMPLETED,
        completedAt: action.payload.completedAt || dayjs().utc(),
        result: action.payload.result || state.result,
        isPolling: false,
      };

    case "SOLVE_FAILED":
      return {
        ...state,
        status: SolveRequestStatus.FAILED,
        errorMessage: action.payload.error,
        completedAt: dayjs().utc(),
        isPolling: false,
      };

    case "SOLVE_ERROR":
      return {
        ...state,
        lastError: action.payload.error,
        retryCount: state.retryCount + 1,
        isPolling: false,
      };

    case "POLLING_START":
      return {
        ...state,
        isPolling: true,
        lastError: null,
      };

    case "POLLING_STOP":
      return {
        ...state,
        isPolling: false,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        lastError: null,
        errorMessage: null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

interface SqsSolveContextType {
  state: SqsSolveState;
  startSolve: (
    scheduleId: string,
    teamId: string,
    constraints?: string[],
    onComplete?: (result: SolveTaskStatusResponseT) => void
  ) => Promise<void>;
  cancelSolve: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  isActiveSolve: boolean;
}

const SqsSolveContext = createContext<SqsSolveContextType | undefined>(
  undefined
);

export function useSqsSolve() {
  const context = useContext(SqsSolveContext);
  if (context === undefined) {
    throw new Error("useSqsSolve must be used within a SqsSolveProvider");
  }
  return context;
}

interface SqsSolveProviderProps {
  children: ReactNode;
}

export function SqsSolveProvider({ children }: SqsSolveProviderProps) {
  const [state, dispatch] = useReducer(sqsSolveReducer, initialState);
  const [pollingService, setPollingService] =
    React.useState<SolvePollingService | null>(null);

  // Authenticated hooks
  const startSolveApi = useStartSolve();
  const cancelSolveApi = useCancelSolve();
  const getSolveStatusApi = useGetSolveStatus();

  // Use useRef instead of useState to avoid closure issues
  const onCompleteCallbackRef = React.useRef<
    ((result: SolveTaskStatusResponseT) => void) | null
  >(null);

  // Load persisted state on mount
  useEffect(() => {
    const persistedState = localStorage.getItem("sqs-solve-state");
    console.log("Restoring SQS solve state from localStorage:", persistedState);

    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState);
        // Only restore if there's an active solve session
        if (
          parsed.solveId &&
          (parsed.status === "PENDING" || parsed.status === "IN_PROGRESS")
        ) {
          dispatch({ type: "SOLVE_STATUS_UPDATE", payload: parsed });
          // Restart polling if needed - we'll define this inside the effect
          const restartPolling = (solveId: string) => {
            if (pollingService) {
              pollingService.stop();
            }

            const newPollingService = new SolvePollingService(
              solveId,
              getSolveStatusApi,
              {
                onStatusChange: (status: SolveTaskStatusResponseT) => {
                  dispatch({ type: "SOLVE_STATUS_UPDATE", payload: status });
                },
                onComplete: (result: SolveTaskStatusResponseT) => {
                  dispatch({ type: "SOLVE_COMPLETE", payload: result });
                  // Use ref to get current callback
                  if (onCompleteCallbackRef.current) {
                    console.log(
                      "Calling onComplete callback with result:",
                      result
                    );
                    onCompleteCallbackRef.current(result);
                  }
                },
                onFailed: (error: string) => {
                  dispatch({ type: "SOLVE_FAILED", payload: { error } });
                },
                onError: (error: Error) => {
                  dispatch({
                    type: "SOLVE_ERROR",
                    payload: { error: error.message },
                  });
                },
              }
            );

            setPollingService(newPollingService);
            dispatch({ type: "POLLING_START" });
            newPollingService.start();
          };

          restartPolling(parsed.solveId);
        }
      } catch (error) {
        console.warn("Failed to restore SQS solve state:", error);
        localStorage.removeItem("sqs-solve-state");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state changes
  useEffect(() => {
    if (state.solveId) {
      localStorage.setItem(
        "sqs-solve-state",
        JSON.stringify({
          solveId: state.solveId,
          status: state.status,
          startedAt: state.startedAt,
          completedAt: state.completedAt,
          errorMessage: state.errorMessage,
          result: state.result,
        })
      );
    } else {
      localStorage.removeItem("sqs-solve-state");
    }
  }, [state]);
  const startPolling = (solveId: string) => {
    if (pollingService) {
      console.log("Stopping existing polling service before starting new one");
      pollingService.stop();
    }

    const newPollingService = new SolvePollingService(
      solveId,
      getSolveStatusApi,
      {
        onStatusChange: (status: SolveTaskStatusResponseT) => {
          dispatch({ type: "SOLVE_STATUS_UPDATE", payload: status });
        },
        onComplete: (result: SolveTaskStatusResponseT) => {
          dispatch({ type: "SOLVE_COMPLETE", payload: result });
          // Call the completion callback if provided
          if (onCompleteCallbackRef.current) {
            console.log("Calling onComplete callback with result:", result);
            onCompleteCallbackRef.current(result);
          }
        },
        onFailed: (error: string) => {
          dispatch({ type: "SOLVE_FAILED", payload: { error } });
        },
        onError: (error: Error) => {
          dispatch({ type: "SOLVE_ERROR", payload: { error: error.message } });
        },
      }
    );

    setPollingService(newPollingService);
    dispatch({ type: "POLLING_START" });
    newPollingService.start();
  };

  const stopPolling = () => {
    if (pollingService) {
      pollingService.stop();
      setPollingService(null);
    }
    dispatch({ type: "POLLING_STOP" });
  };

  const startSolve = async (
    scheduleId: string,
    teamId: string,
    constraints?: string[],
    onComplete?: (result: SolveTaskStatusResponseT) => void
  ) => {
    try {
      // Set the callback in the ref immediately
      onCompleteCallbackRef.current = onComplete || null;

      const response = await startSolveApi({
        schedule_id: scheduleId,
        team_id: teamId,
      });

      dispatch({
        type: "SOLVE_START",
        payload: { solveId: response.solveId },
      });
      startPolling(response.solveId);
    } catch (error) {
      dispatch({
        type: "SOLVE_ERROR",
        payload: { error: (error as Error).message },
      });
      throw error;
    }
  };

  const cancelSolve = async () => {
    if (!state.solveId) {
      return;
    }

    try {
      await cancelSolveApi(state.solveId);
      stopPolling();
      onCompleteCallbackRef.current = null; // Clear the callback
      dispatch({ type: "RESET" });
    } catch (error) {
      dispatch({
        type: "SOLVE_ERROR",
        payload: { error: (error as Error).message },
      });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const reset = () => {
    stopPolling();
    onCompleteCallbackRef.current = null; // Clear the callback
    dispatch({ type: "RESET" });
  };

  const isActiveSolve =
    state.status === "PENDING" || state.status === "IN_PROGRESS";

  // Cleanup on unmount
  // useEffect(() => {
  //   return () => {
  //     if (pollingService) {
  //       console.log("Stopping polling service on unmount");

  //       pollingService.stop();
  //       setPollingService(null);
  //     }
  //   };
  // }, [pollingService]);

  const contextValue: SqsSolveContextType = {
    state,
    startSolve,
    cancelSolve,
    clearError,
    reset,
    isActiveSolve,
  };

  return (
    <SqsSolveContext.Provider value={contextValue}>
      {children}
    </SqsSolveContext.Provider>
  );
}

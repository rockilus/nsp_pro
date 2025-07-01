// Actions
import { toAssignmentT } from "@/types/assignment";
import { toBreachT } from "@/types/breach";
// Types
import { SolveDetailsStatus, toScheduleT } from "../../types/schedule";
import { toRequestT } from "@/types/request";
// Env Vars
import { API_URL } from "./env";

const apiUrlSSE = API_URL + "/sse";

export type SSECallback = (data: any) => void;

export class SSEManager {
  private eventSource: EventSource | null = null;

  connect(
    onTaskStatusEvent: SSECallback,
    onOutputEventSuccessSolution: SSECallback,
    onOutputEventSuccessSchedule: SSECallback,
    onOutputEventFailure: SSECallback,
    // onMessage: SSECallback,
    onError: () => void,
    taskId?: string,
    scheduleId?: string
  ): void {
    if (this.eventSource) {
      console.warn("SSE connection already exists.");
      return;
    }

    // console.log("Connecting to SSE endpoint:", apiUrlSSE);
    this.eventSource = new EventSource(
      apiUrlSSE +
        (taskId ? `?task_id=${taskId}` : "") +
        (scheduleId ? `&schedule_id=${scheduleId}` : "")
    );

    // this.eventSource.onopen = () => {
    //   console.log("SSE connection opened.");
    // };

    this.eventSource.addEventListener("task_status", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Object.values(SolveDetailsStatus).includes(data.status)) {
          onTaskStatusEvent(data.status);
        } else {
          onError();
        }
      } catch (error) {
        console.error("Error parsing task status event:", error);
      }
    });

    this.eventSource.addEventListener("output", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === SolveDetailsStatus.SUCCESS) {
          if (data.solution) {
            const schedule = toScheduleT(data.solution.schedule);
            const assignments = data.solution.assignments.map(toAssignmentT);
            const breaches = data.solution.breaches.map(toBreachT);
            const requests = data.solution.requests.map(toRequestT);
            onOutputEventSuccessSolution({
              newSchedule: schedule,
              newAssignments: assignments,
              newBreaches: breaches,
              newRequests: requests,
            });
          } else if (data.schedule) {
            const schedule = toScheduleT(data.schedule);
            onOutputEventSuccessSchedule({
              newSchedule: schedule,
            });
          } else {
            onError();
          }
        } else if (data.status === SolveDetailsStatus.FAILURE) {
          if (data.schedule) {
            const schedule = toScheduleT(data.schedule);
            onOutputEventFailure({
              newSchedule: schedule,
            });
          }
        } else {
          onError();
        }
      } catch (error) {
        console.error("Error parsing output event:", error);
      }
    });

    this.eventSource.addEventListener("error", (event) => {
      console.error("Error event received:", event);
      if (onError) {
        onError();
      }
      this.close();
    });

    this.eventSource.onerror = (event) => {
      console.error("SSE connection error:", event);
      if (onError) {
        onError();
      }
      this.close();
    };
  }

  close(): void {
    if (this.eventSource) {
      // console.log("Closing SSE connection.");
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

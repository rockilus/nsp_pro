// Actions
import { toAssignmentT } from "./assignment";
import { toBreachT } from "./breach";
import { toRequestT } from "./request";
import { toScheduleT } from "./schedule";
import { toShiftT } from "./shift";
// Types
import { SolveDetailsStatus } from "../../types/schedule";
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

    console.log("Connecting to SSE endpoint:", apiUrlSSE);
    this.eventSource = new EventSource(
      apiUrlSSE +
        (taskId ? `?task_id=${taskId}` : "") +
        (scheduleId ? `&schedule_id=${scheduleId}` : "")
    );

    this.eventSource.onopen = () => {
      console.log("SSE connection opened.");
    };

    this.eventSource.addEventListener("task_status", (event) => {
      try {
        console.log("Task status event received:", event);
        const data = JSON.parse(event.data);
        console.log("Task status event received:", data);
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
        console.log("Output event received:", event);
        const data = JSON.parse(event.data);
        console.log("Output event received:", data);
        if (data.status === SolveDetailsStatus.SUCCESS) {
          if (data.solution) {
            const schedule = toScheduleT(data.solution.schedule);
            const assignments = data.solution.assignments.map(toAssignmentT);
            const breaches = data.solution.breaches.map(toBreachT);
            const requests = data.solution.requests.map(toRequestT);
            const shiftsRecupNew = data.solution.shiftsRecupNew.map(toShiftT);
            onOutputEventSuccessSolution({
              newSchedule: schedule,
              newAssignments: assignments,
              newBreaches: breaches,
              newRequests: requests,
              newShifts: shiftsRecupNew,
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
      console.log("Closing SSE connection.");
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// // Actions
// import { toAssignmentT } from "./assignment";
// import { toBreachT } from "./breach";
// import { toRequestT } from "./request";
// import { toScheduleT } from "./schedule";
// import { toShiftT } from "./shift";
// // Env Vars
// import { API_URL } from "./env";

// const apiUrlSSE = API_URL + "/sse";

// export type SSECallback = (data: any) => void;

// export class SSEManager {
//   private eventSource: EventSource | null = null;

//   connect(
//     onMessage: SSECallback,
//     onError?: () => void,
//     taskId?: string,
//     scheduleId?: string
//   ): void {
//     if (this.eventSource) {
//       console.warn("SSE connection already exists.");
//       return;
//     }

//     console.log("Connecting to SSE endpoint:", apiUrlSSE);
//     this.eventSource = new EventSource(
//       apiUrlSSE +
//         (taskId ? `?task_id=${taskId}` : "") +
//         (scheduleId ? `&schedule_id=${scheduleId}` : "")
//     );

//     this.eventSource.onopen = () => {
//       console.log("SSE connection opened.");
//     };

//     this.eventSource.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         console.log("SSE message received:", data);
//         const schedule = toScheduleT(data.schedule);
//         const assignments = data.assignments.map(toAssignmentT);
//         const breaches = data.breaches.map(toBreachT);
//         const requests = data.requests.map(toRequestT);
//         const shiftsRecupNew = data.shiftsRecupNew.map(toShiftT);
//         onMessage({
//           newSchedule: schedule,
//           newAssignments: assignments,
//           newBreaches: breaches,
//           newRequests: requests,
//           newShifts: shiftsRecupNew,
//         });
//       } catch (error) {
//         console.error("Error parsing SSE message:", error);
//       }
//     };

//     this.eventSource.onerror = (event) => {
//       console.error("SSE connection error:", event);
//       if (onError) {
//         onError();
//       }
//       this.close();
//     };
//   }

//   close(): void {
//     if (this.eventSource) {
//       console.log("Closing SSE connection.");
//       this.eventSource.close();
//       this.eventSource = null;
//     }
//   }
// }

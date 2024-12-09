// Actions
import { toAssignmentT } from "./assignment";
import { toBreachT } from "./breach";
import { toRequestT } from "./request";
import { toScheduleT } from "./schedule";
import { toShiftT } from "./shift";
// Env Vars
import { API_URL } from "./env";

const apiUrlSSE = API_URL + "/sse";

export type SSECallback = (data: any) => void;

export class SSEManager {
  private eventSource: EventSource | null = null;

  connect(onMessage: SSECallback, onError?: () => void): void {
    if (this.eventSource) {
      console.warn("SSE connection already exists.");
      return;
    }

    console.log("Connecting to SSE endpoint:", apiUrlSSE);
    this.eventSource = new EventSource(apiUrlSSE);

    this.eventSource.onopen = () => {
      console.log("SSE connection opened.");
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE message received:", data);
        const schedule = toScheduleT(data.schedule);
        const assignments = data.assignments.map(toAssignmentT);
        const breaches = data.breaches.map(toBreachT);
        const requests = data.requests.map(toRequestT);
        const shiftsRecupNew = data.shiftsRecupNew.map(toShiftT);
        onMessage({
          newSchedule: schedule,
          newAssignments: assignments,
          newBreaches: breaches,
          newRequests: requests,
          newShifts: shiftsRecupNew,
        });
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

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

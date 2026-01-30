import dayjs from "dayjs";

export enum SwapType {
  DIRECT = "direct",
  OPEN = "open",
}

export enum SwapStatus {
  ACTIVE = "active",
  PENDING_APPROVAL = "pending_approval",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export type SwapBidT = {
  id: string;
  workerId: string;
  offeredAssignmentIds: string[];
  createdAt: dayjs.Dayjs;
  accepted: boolean;
};

export type SwapAuditDataT = {
  assignmentId: string;
  workerId: string;
  shiftId: string;
  dateIso: string;
};

export type SwapRequestT = {
  id: string;
  teamId: string;
  scheduleId: string | null;
  createdByWorkerId: string;
  swapType: SwapType;
  status: SwapStatus;
  offeredAssignmentIds: string[];
  requestedAssignmentIds: string[] | null;
  targetWorkerId: string | null;
  comment: string;
  bids: SwapBidT[];
  createdAt: dayjs.Dayjs;
  completedAt: dayjs.Dayjs | null;
  completedByUserId: string | null;
  auditData: SwapAuditDataT[];
};

// API conversion helpers
export function toSwapBidT(data: any): SwapBidT {
  return {
    id: data.id,
    workerId: data.workerId,
    offeredAssignmentIds: data.offeredAssignmentIds,
    createdAt: dayjs.unix(data.createdAt),
    accepted: data.accepted,
  };
}

export function fromSwapBidT(bid: SwapBidT): any {
  return {
    id: bid.id,
    workerId: bid.workerId,
    offeredAssignmentIds: bid.offeredAssignmentIds,
    createdAt: bid.createdAt.unix(),
    accepted: bid.accepted,
  };
}

export function toSwapRequestT(data: any): SwapRequestT {
  return {
    id: data.id,
    teamId: data.teamId,
    scheduleId: data.scheduleId,
    createdByWorkerId: data.createdByWorkerId,
    swapType: data.swapType as SwapType,
    status: data.status as SwapStatus,
    offeredAssignmentIds: data.offeredAssignmentIds,
    requestedAssignmentIds: data.requestedAssignmentIds,
    targetWorkerId: data.targetWorkerId,
    comment: data.comment,
    bids: (data.bids || []).map(toSwapBidT),
    createdAt: dayjs.unix(data.createdAt),
    completedAt: data.completedAt ? dayjs.unix(data.completedAt) : null,
    completedByUserId: data.completedByUserId,
    auditData: data.auditData || [],
  };
}

export function fromSwapRequestT(swap: Partial<SwapRequestT>): any {
  return {
    id: swap.id,
    teamId: swap.teamId,
    scheduleId: swap.scheduleId,
    createdByWorkerId: swap.createdByWorkerId,
    swapType: swap.swapType,
    status: swap.status,
    offeredAssignmentIds: swap.offeredAssignmentIds,
    requestedAssignmentIds: swap.requestedAssignmentIds,
    targetWorkerId: swap.targetWorkerId,
    comment: swap.comment || "",
    bids: (swap.bids || []).map(fromSwapBidT),
    createdAt: swap.createdAt?.unix(),
    completedAt: swap.completedAt?.unix(),
    completedByUserId: swap.completedByUserId,
    auditData: swap.auditData || [],
  };
}

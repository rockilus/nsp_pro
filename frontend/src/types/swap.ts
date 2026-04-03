import dayjs from 'dayjs';

export enum SwapType {
  DIRECT = 'direct',
  OPEN = 'open',
}

export enum SwapStatus {
  ACTIVE = 'active',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed',
  DENIED = 'denied',
  REVERTED = 'reverted',
}

export type SwapBidT = {
  id: string;
  workerId: string;
  offeredAssignmentIds: string[];
  createdAt: dayjs.Dayjs;
  accepted: boolean;
  obsolete: boolean;
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
  createdByUserId: string;
  swapType: SwapType;
  status: SwapStatus;
  offeredAssignmentIds: string[];
  requestedAssignmentIds: string[] | null;
  targetWorkerId: string | null;
  offeringWorkerId: string;
  comment: string;
  bids: SwapBidT[];
  createdAt: dayjs.Dayjs;
  completedAt: dayjs.Dayjs | null;
  completedByUserId: string | null;
  revertedAt: dayjs.Dayjs | null;
  revertedByUserId: string | null;
  auditData: SwapAuditDataT[];
  obsolete: boolean;
};

// API conversion helpers
export function toSwapBidT(data: any): SwapBidT {
  return {
    id: data.id,
    workerId: data.workerId,
    offeredAssignmentIds: data.offeredAssignmentIds,
    createdAt: dayjs.unix(data.createdAt),
    accepted: data.accepted,
    obsolete: data.obsolete ?? false,
  };
}

export function fromSwapBidT(bid: SwapBidT): any {
  return {
    id: bid.id,
    workerId: bid.workerId,
    offeredAssignmentIds: bid.offeredAssignmentIds,
    createdAt: bid.createdAt.unix(),
    accepted: bid.accepted,
    obsolete: bid.obsolete,
  };
}

export function toSwapRequestT(data: any): SwapRequestT {
  return {
    id: data.id,
    teamId: data.teamId,
    createdByUserId: data.createdByUserId,
    swapType: data.swapType as SwapType,
    status: data.status as SwapStatus,
    offeredAssignmentIds: data.offeredAssignmentIds,
    requestedAssignmentIds: data.requestedAssignmentIds,
    targetWorkerId: data.targetWorkerId,
    offeringWorkerId: data.offeringWorkerId ?? '',
    comment: data.comment,
    bids: (data.bids || []).map(toSwapBidT),
    createdAt: dayjs.unix(data.createdAt),
    completedAt: data.completedAt ? dayjs.unix(data.completedAt) : null,
    completedByUserId: data.completedByUserId,
    revertedAt: data.revertedAt ? dayjs.unix(data.revertedAt) : null,
    revertedByUserId: data.revertedByUserId,
    auditData: data.auditData || [],
    obsolete: data.obsolete ?? false,
  };
}

export function fromSwapRequestT(swap: Partial<SwapRequestT>): any {
  return {
    id: swap.id,
    teamId: swap.teamId,
    createdByUserId: swap.createdByUserId,
    swapType: swap.swapType,
    status: swap.status,
    offeredAssignmentIds: swap.offeredAssignmentIds,
    requestedAssignmentIds: swap.requestedAssignmentIds,
    targetWorkerId: swap.targetWorkerId,
    offeringWorkerId: swap.offeringWorkerId ?? '',
    comment: swap.comment || '',
    bids: (swap.bids || []).map(fromSwapBidT),
    createdAt: swap.createdAt?.unix(),
    completedAt: swap.completedAt?.unix(),
    completedByUserId: swap.completedByUserId,
    revertedAt: swap.revertedAt?.unix(),
    revertedByUserId: swap.revertedByUserId,
    auditData: swap.auditData || [],
    obsolete: swap.obsolete ?? false,
  };
}

import { useState, useEffect } from 'react';
import { ScheduleT } from '@/types/schedule';
import { SolveTaskStatusResponseT, ScheduleSolveStatus } from '@/types/solveTaskStatus';
import { useGetLatestSolveStatus } from '../../../hooks/useSqsSolve';
import { useSqsSolve } from '../contexts/SqsSolveContext';

/**
 * Custom hook to manage the solve status for a campaign schedule
 *
 * This hook:
 * - Fetches the latest solve status for the current campaign
 * - Updates when the campaign changes
 * - Integrates with the SQS solve context for real-time updates
 * - Returns the current ScheduleSolveStatus
 */
export function useCampaignSolveStatus(scheduleCampaign: ScheduleT | null): ScheduleSolveStatus {
  const [latestSolveData, setLatestSolveData] = useState<SolveTaskStatusResponseT | null>(null);
  const { state: sqsState } = useSqsSolve();
  const getLatestSolveStatus = useGetLatestSolveStatus();

  // Fetch latest solve status when campaign changes
  useEffect(() => {
    if (!scheduleCampaign) {
      // Avoid calling setState synchronously inside the effect body
      // (this can trigger cascading renders). Defer to a microtask so
      // the state update runs after the current render.
      Promise.resolve().then(() => setLatestSolveData(null));
      return;
    }

    let isCancelled = false;

    const fetchLatestSolveStatus = async () => {
      try {
        const latestSolveStatus = await getLatestSolveStatus(scheduleCampaign.id);

        if (!isCancelled) {
          setLatestSolveData(latestSolveStatus);
        }
      } catch (error) {
        console.error('Failed to fetch latest solve status:', error);
        if (!isCancelled) {
          setLatestSolveData(null);
        }
      }
    };

    fetchLatestSolveStatus();

    return () => {
      isCancelled = true;
    };
  }, [scheduleCampaign, getLatestSolveStatus]);

  // Return the appropriate solve status
  if (!scheduleCampaign) {
    return ScheduleSolveStatus.NOT_SOLVED;
  }

  // If we have an active solve for this campaign, check if it's the right one
  if (sqsState.solveId && sqsState.status !== 'IDDLE') {
    // We don't have schedule ID in SQS state, so we assume the active solve is for the current campaign
    // This is a reasonable assumption since typically only one solve happens at a time
    if (sqsState.status === 'PENDING' || sqsState.status === 'IN_PROGRESS') {
      // Use the latest known solve status during active solve
      return latestSolveData?.solveStatus || ScheduleSolveStatus.NOT_SOLVED;
    }
  }

  // Return the latest solve status from the API
  return latestSolveData?.solveStatus || ScheduleSolveStatus.NOT_SOLVED;
}

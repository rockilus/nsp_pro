/**
 * RequestTab Component
 *
 * Manages the requests interface with tabs for list view and calendar view.
 * Uses the new request hooks pattern for authenticated API calls.
 *
 * Features:
 * - Add, update, delete, and rescind requests
 * - Toggle between current and past requests
 * - Calendar view for request visualization
 * - Integrated with shift demands data
 */

import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
// Components
import RequestPanel from "./request-panel";
import RequestTable from "./request-table";
import { RequestCalendar } from "./request-calendar";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Hooks
import { useShiftDemands } from "../../app/lib/hooks/useShiftDemands";
import {
  useAddRequest,
  useUpdateRequest,
  useDeleteRequest,
  useRescindRequest,
  useAcceptRequest,
  useDenyRequest,
  useGetRequestsTabData,
} from "../../hooks/useRequest";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
// Types
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT } from "@/types/constraint";

dayjs.extend(utc);

export default function RequestTab({
  lng,
  teamId,
  userId,
  userTeamRole,
}: {
  lng: string;
  teamId: string;
  userId: string;
  userTeamRole: TeamMembershipRole;
}) {
  const { t } = useTranslation(lng, "request-page");

  // Request hooks
  const addRequest = useAddRequest();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const rescindRequest = useRescindRequest();
  const acceptRequest = useAcceptRequest();
  const denyRequest = useDenyRequest();
  const getRequestsTabData = useGetRequestsTabData();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftWorkerOptionT[]>([]);
  const [showPastRequests, setShowPastRequests] = useState<boolean>(false);

  // React Query hooks for shift demands - use broader date range for requests calendar
  const {
    demands: shiftDemands,
    demandsById: shiftDemandsById,
    matrix: shiftDemandMatrix,
    isLoading: isLoadingShiftDemands,
    error: shiftDemandError,
  } = useShiftDemands(
    teamId,
    dayjs().utc().startOf("year").toDate(), // Start of current year
    dayjs().utc().add(1, "year").endOf("year").toDate(), // End of next year
    {
      enabled: true,
      bufferDays: 0, // No buffer needed for requests view
    }
  );

  const userWorker = workers.find((w) => w.userId === userId);

  // Filter requests based on past/future
  const { currentRequests, pastRequests } = useMemo(() => {
    const now = dayjs().utc();
    const current: RequestT[] = [];
    const past: RequestT[] = [];

    requests.forEach((request) => {
      if (request.endDate.isBefore(now, "day")) {
        past.push(request);
      } else {
        current.push(request);
      }
    });

    return { currentRequests: current, pastRequests: past };
  }, [requests]);

  const displayRequests = useMemo(() => {
    return showPastRequests ? requests : currentRequests;
  }, [requests, currentRequests, showPastRequests]);

  //////////////////////////
  // Request Actions
  //////////////////////////

  const handleAddRequest = async (request: RequestT) => {
    try {
      const newRequest = await addRequest(request, teamId);
      setRequests([...requests, newRequest]);
    } catch (error) {
      console.error("Failed to add request:", error);
      // Handle error appropriately (could show a toast notification)
    }
  };

  const handleUpdateRequest = async (request: RequestT) => {
    try {
      const updatedRequest = await updateRequest(request, teamId);
      setRequests(
        requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
      );
    } catch (error) {
      console.error("Failed to update request:", error);
      // Handle error appropriately
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deleteRequest(requestId, teamId);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Failed to delete request:", error);
      // Handle error appropriately
    }
  };

  const handleRescindRequest = async (requestId: string) => {
    try {
      const rescindedRequest = await rescindRequest(requestId, teamId);
      setRequests(
        requests.map((r) =>
          r.id === rescindedRequest.id ? rescindedRequest : r
        )
      );
    } catch (error) {
      console.error("Failed to rescind request:", error);
      // Handle error appropriately
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const acceptedRequest = await acceptRequest(requestId, teamId);
      setRequests(
        requests.map((r) => (r.id === acceptedRequest.id ? acceptedRequest : r))
      );
    } catch (error) {
      console.error("Failed to accept request:", error);
      // Handle error appropriately
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const deniedRequest = await denyRequest(requestId, teamId);
      setRequests(
        requests.map((r) => (r.id === deniedRequest.id ? deniedRequest : r))
      );
    } catch (error) {
      console.error("Failed to deny request:", error);
      // Handle error appropriately
    }
  };

  useEffect(() => {
    const fetchRequestsTabData = async () => {
      setIsLoading(true);
      if (teamId) {
        try {
          const {
            workers: fetchedWorkers,
            shifts: fetchedShifts,
            requests: fetchedRequests,
            shiftOptions: fetchedShiftOptions,
          } = await getRequestsTabData(teamId);
          setWorkers(fetchedWorkers);
          setShifts(fetchedShifts);
          setRequests(fetchedRequests);
          setShiftOptions(fetchedShiftOptions);
        } catch (error) {
          console.error("Failed to fetch requests tab data:", error);
          // Handle error appropriately
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchRequestsTabData();
  }, [teamId, getRequestsTabData]);

  // ToggleButton state for request type

  // Tabs for request status/calendar
  const [statusTab, setStatusTab] = useState(0);

  // Combined loading state
  const isLoadingData = isLoading || isLoadingShiftDemands;

  return (
    <div className="tab-container-wide" data-testid="request-tab">
      {isLoadingData ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            <Tabs
              value={statusTab}
              onChange={(_e, v) => setStatusTab(v)}
              sx={{
                marginLeft: 2,
                "& .MuiTab-root": {
                  textTransform: "none",
                },
              }}
              aria-label="Request Tabs"
              data-testid="request-tabs"
            >
              <Tab
                label={t("requests") || "Requests"}
                data-testid="requests-tab"
              />
              <Tab
                label={t("calendar") || "Calendar"}
                data-testid="calendar-tab"
              />
            </Tabs>

            <div className="flex items-center gap-4">
              {statusTab === 0 && (
                <div className="flex items-center gap-2">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showPastRequests}
                        onChange={(e) => setShowPastRequests(e.target.checked)}
                        size="small"
                        color="primary"
                        data-testid="show-past-requests-switch"
                      />
                    }
                    label={
                      <Typography variant="body2" className="text-gray-600">
                        {t("show_past") || "Show Past"}
                      </Typography>
                    }
                  />
                </div>
              )}

              <RequestPanel
                lng={lng}
                teamId={teamId}
                isEdit={false}
                workers={workers.filter((w) => !w.deleted)}
                shifts={shifts}
                shiftOptions={shiftOptions}
                userWorkerId={userWorker?.id || null}
                userTeamRole={userTeamRole}
                handleAddRequest={handleAddRequest}
                handleUpdateRequest={handleUpdateRequest}
                handleDeleteRequest={handleDeleteRequest}
                handleRescindRequest={handleRescindRequest}
                handleAcceptRequest={handleAcceptRequest}
                handleDenyRequest={handleDenyRequest}
              />
            </div>
          </div>
          {statusTab === 0 && (
            <RequestTable
              lng={lng}
              requests={displayRequests}
              workers={workers}
              shifts={shifts}
              shiftOptions={shiftOptions}
              userWorkerId={userWorker?.id || null}
              userTeamRole={userTeamRole}
              handleUpdateRequest={handleUpdateRequest}
              handleDeleteRequest={handleDeleteRequest}
              handleRescindRequest={handleRescindRequest}
              handleAcceptRequest={handleAcceptRequest}
              handleDenyRequest={handleDenyRequest}
              showPastRequests={showPastRequests}
            />
          )}
          {statusTab === 1 && (
            <RequestCalendar
              workers={workers}
              requests={requests}
              shifts={shifts}
              demands={shiftDemands}
              lng={lng}
              teamId={teamId}
              shiftOptions={shiftOptions}
              userTeamRole={userTeamRole}
              handleAddRequest={handleAddRequest}
              handleUpdateRequest={handleUpdateRequest}
              handleDeleteRequest={handleDeleteRequest}
              handleRescindRequest={handleRescindRequest}
              handleAcceptRequest={handleAcceptRequest}
              handleDenyRequest={handleDenyRequest}
            />
          )}
        </div>
      )}
    </div>
  );
}

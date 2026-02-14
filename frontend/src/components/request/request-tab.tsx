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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
// Components
import RequestPanel from "./request-panel";
import RequestTable from "./request-table";
import { RequestCalendar } from "./request-calendar";
import MobileRequestTab from "./mobile/mobile-request-tab";
// Hooks
import { useIsMobile } from "../../hooks/useIsMobile";
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
import { useUserWorker } from "../../hooks/useUserWorker";
import { useGetShiftOptions } from "../../hooks/useStats";
import { useApiClient } from "../../app/lib/api-client";
// API clients
import { RequestApi } from "../../app/lib/api/requestApi";
import { ShiftApi } from "../../app/lib/api/shiftApi";
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
  const isMobile = useIsMobile();
  const apiClient = useApiClient();

  // Request hooks
  const addRequest = useAddRequest();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const rescindRequest = useRescindRequest();
  const acceptRequest = useAcceptRequest();
  const denyRequest = useDenyRequest();
  const getRequestsTabData = useGetRequestsTabData();
  const getShiftOptions = useGetShiftOptions();

  // Fetch user's worker for role-based filtering (cached via React Query)
  const {
    data: userWorker,
    isLoading: isLoadingUserWorker,
    error: userWorkerError,
  } = useUserWorker(
    teamId,
    userTeamRole === TeamMembershipRole.MEMBER, // Only fetch for members
  );

  const [requests, setRequests] = useState<RequestT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftWorkerOptionT[]>([]);
  const [showPastRequests, setShowPastRequests] = useState<boolean>(false);

  // Check if member has no worker association
  const memberHasNoWorker =
    userTeamRole === TeamMembershipRole.MEMBER &&
    !isLoadingUserWorker &&
    userWorker === null;

  // React Query hooks for shift demands - use broader date range for requests calendar
  // Only fetch shift demands for team owners
  const {
    demands: shiftDemands,
    demandsById: shiftDemandsById,
    matrix: shiftDemandMatrix,
    isLoading: isLoadingShiftDemands,
    error: shiftDemandError,
  } = useShiftDemands(
    teamId,
    dayjs().utc().startOf("year"), // Start of current year
    dayjs().utc().add(1, "year").endOf("year"), // End of next year
    {
      enabled: userTeamRole !== TeamMembershipRole.MEMBER,
      bufferDays: 0, // No buffer needed for requests view
    },
  );

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

  const handleAddRequest = useCallback(
    async (request: RequestT) => {
      try {
        const newRequest = await addRequest(request, teamId);
        setRequests([...requests, newRequest]);
      } catch (error) {
        console.error("Failed to add request:", error);
        // Handle error appropriately (could show a toast notification)
      }
    },
    [addRequest, teamId, requests],
  );

  const handleUpdateRequest = useCallback(
    async (request: RequestT) => {
      try {
        const updatedRequest = await updateRequest(request, teamId);
        setRequests(
          requests.map((r) =>
            r.id === updatedRequest.id ? updatedRequest : r,
          ),
        );
      } catch (error) {
        console.error("Failed to update request:", error);
        // Handle error appropriately
      }
    },
    [updateRequest, teamId, requests],
  );

  const handleDeleteRequest = useCallback(
    async (requestId: string) => {
      try {
        await deleteRequest(requestId, teamId);
        setRequests(requests.filter((r) => r.id !== requestId));
      } catch (error) {
        console.error("Failed to delete request:", error);
        // Handle error appropriately
      }
    },
    [deleteRequest, teamId, requests],
  );

  const handleRescindRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await rescindRequest(requestId, teamId);
        const rescindedRequest = result.request;
        setRequests(
          requests.map((r) =>
            r.id === rescindedRequest.id ? rescindedRequest : r,
          ),
        );
      } catch (error) {
        console.error("Failed to rescind request:", error);
        // Handle error appropriately
      }
    },
    [rescindRequest, teamId, requests],
  );

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await acceptRequest(requestId, teamId);
        // result contains { request, assignments }
        const acceptedRequest = result.request;
        setRequests(
          requests.map((r) =>
            r.id === acceptedRequest.id ? acceptedRequest : r,
          ),
        );
      } catch (error) {
        console.error("Failed to accept request:", error);
        // Handle error appropriately
      }
    },
    [acceptRequest, teamId, requests],
  );

  const handleDenyRequest = useCallback(
    async (requestId: string) => {
      try {
        const deniedRequest = await denyRequest(requestId, teamId);
        setRequests(
          requests.map((r) => (r.id === deniedRequest.id ? deniedRequest : r)),
        );
      } catch (error) {
        console.error("Failed to deny request:", error);
        // Handle error appropriately
      }
    },
    [denyRequest, teamId, requests],
  );

  useEffect(() => {
    const fetchRequestsTabData = async () => {
      if (teamId) {
        try {
          // Check if member has no worker association
          if (memberHasNoWorker) {
            return;
          }

          // For members, pass userWorker.id to filter requests
          // For owners, pass undefined to fetch all requests
          const filterByWorkerId =
            userTeamRole === TeamMembershipRole.MEMBER
              ? userWorker?.id
              : undefined;

          // For members, we already have userWorker from cache - no need to fetch all workers
          // For owners, fetch all workers for the UI
          if (userTeamRole === TeamMembershipRole.MEMBER && userWorker) {
            // Member: only fetch their own data
            const [shifts, requests, shiftOptions] = await Promise.all([
              ShiftApi.getAllShifts(apiClient, teamId),
              RequestApi.getRequests(apiClient, teamId, userWorker.id),
              getShiftOptions(teamId),
            ]);
            setWorkers([userWorker]); // Members only see their own worker
            setShifts(shifts);
            setRequests(requests);
            setShiftOptions(shiftOptions);
          } else {
            // Owner: fetch all data including all workers
            const {
              workers: fetchedWorkers,
              shifts: fetchedShifts,
              requests: fetchedRequests,
              shiftOptions: fetchedShiftOptions,
            } = await getRequestsTabData(teamId, filterByWorkerId);
            setWorkers(fetchedWorkers);
            setShifts(fetchedShifts);
            setRequests(fetchedRequests);
            setShiftOptions(fetchedShiftOptions);
          }
        } catch (error) {
          console.error("Failed to fetch requests tab data:", error);
          // Handle error appropriately
        }
      }
    };
    fetchRequestsTabData();
  }, [
    teamId,
    userTeamRole,
    userWorker,
    getRequestsTabData,
    apiClient,
    getShiftOptions,
    memberHasNoWorker,
    t,
  ]);

  // ToggleButton state for request type

  // Tabs for request status/calendar - with persistence
  const [statusTab, setStatusTab] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("nsp-pro-request-tab-state");
        if (stored) {
          const parsed = JSON.parse(stored);
          return typeof parsed.state?.selectedTab === "number"
            ? parsed.state.selectedTab
            : 0;
        }
      } catch (error) {
        console.error("Error loading selected tab:", error);
      }
    }
    return 0;
  });

  // Save selected tab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("nsp-pro-request-tab-state");
        let current;
        if (stored) {
          current = JSON.parse(stored);
          current.state = current.state || {};
        } else {
          current = { version: "1.0", state: {} };
        }
        current.state.selectedTab = statusTab;
        current.timestamp = Date.now();
        localStorage.setItem(
          "nsp-pro-request-tab-state",
          JSON.stringify(current),
        );
      } catch (error) {
        console.error("Error saving selected tab:", error);
      }
    }
  }, [statusTab]);

  // Render mobile version if on mobile device
  if (isMobile) {
    return (
      <MobileRequestTab
        lng={lng}
        teamId={teamId}
        userId={userId}
        userTeamRole={userTeamRole}
        requests={requests}
        workers={workers}
        shifts={shifts}
        shiftOptions={shiftOptions}
        isLoading={false}
        handleAddRequest={handleAddRequest}
        handleUpdateRequest={handleUpdateRequest}
        handleDeleteRequest={handleDeleteRequest}
        handleRescindRequest={handleRescindRequest}
        handleAcceptRequest={handleAcceptRequest}
        handleDenyRequest={handleDenyRequest}
      />
    );
  }

  return (
    <div className="tab-container-wide" data-testid="request-tab">
      {memberHasNoWorker ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            p: 4,
          }}
        >
          <Alert severity="info" sx={{ maxWidth: "600px" }}>
            <Typography variant="body1">
              {t("error_no_worker_assigned")}
            </Typography>
          </Alert>
        </Box>
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

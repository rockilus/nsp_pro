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
// Actions
import {
  getRequestsTabData,
  addRequest,
  updateRequest,
  deleteRequest,
  rescindRequest,
} from "@/app/lib/request";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
// Types
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [demands, setDemands] = useState<DailyShiftDemandT[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftWorkerOptionT[]>([]);
  const [showPastRequests, setShowPastRequests] = useState<boolean>(false);

  const userWorker = workers.find((w) => w.userId === userId);

  // Filter requests based on past/future
  const { currentRequests, pastRequests } = useMemo(() => {
    const now = new Date();
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
    const newRequest = await addRequest(request, teamId);
    setRequests([...requests, newRequest]);
  };

  const handleUpdateRequest = async (request: RequestT) => {
    const updatedRequest = await updateRequest(request, teamId);
    setRequests(
      requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );
  };

  const handleDeleteRequest = async (requestId: string) => {
    await deleteRequest(requestId, teamId);
    setRequests(requests.filter((r) => r.id !== requestId));
  };

  const handleRescindRequest = async (requestId: string) => {
    const rescindedRequest = await rescindRequest(requestId, teamId);
    setRequests(
      requests.map((r) => (r.id === rescindedRequest.id ? rescindedRequest : r))
    );
  };

  useEffect(() => {
    const fetchRequestsTabData = async () => {
      setIsLoading(true);
      if (teamId) {
        const {
          workers: fetchedWorkers,
          shifts: fetchedShifts,
          requests: fetchedRequests,
          demands: fetchedDemands,
          shiftOptions: fetchedShiftOptions,
        }: {
          workers: WorkerT[];
          shifts: ShiftT[];
          requests: RequestT[];
          demands: DailyShiftDemandT[];
          shiftOptions: ShiftWorkerOptionT[];
        } = await getRequestsTabData(teamId);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setRequests(fetchedRequests);
        setDemands(fetchedDemands);
        setShiftOptions(fetchedShiftOptions);
        setIsLoading(false);
      }
    };
    fetchRequestsTabData();
  }, [teamId]);

  // ToggleButton state for request type

  // Tabs for request status/calendar
  const [statusTab, setStatusTab] = useState(0);

  return (
    <div className="tab-container-wide">
      {isLoading ? (
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
            >
              <Tab label={t("requests") || "Requests"} />
              <Tab label={t("calendar") || "Calendar"} />
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
              showPastRequests={showPastRequests}
            />
          )}
          {statusTab === 1 && (
            <RequestCalendar
              workers={workers}
              requests={requests}
              shifts={shifts}
              demands={demands}
            />
          )}
        </div>
      )}
    </div>
  );
}

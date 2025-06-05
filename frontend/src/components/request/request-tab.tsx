import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
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
} from "@/app/lib/request";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
// Types
import {
  RequestT,
  RequestStatus,
  RequestType,
  FulfillmentStatus,
} from "../../types/request";
import { ShiftT, ShiftType, ShiftRestType } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";

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

  const userWorker = workers.find((w) => w.userId === userId);

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

  useEffect(() => {
    const fetchRequestsTabData = async () => {
      setIsLoading(true);
      if (teamId) {
        const {
          workers: fetchedWorkers,
          shifts: fetchedShifts,
          requests: fetchedRequests,
          demands: fetchedDemands,
        }: {
          workers: WorkerT[];
          shifts: ShiftT[];
          requests: RequestT[];
          demands: DailyShiftDemandT[];
        } = await getRequestsTabData(teamId);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setRequests(fetchedRequests);
        setDemands(fetchedDemands);
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
          <div className="title-container">
            <span className="title">{t("requests")}</span>
            <RequestPanel
              lng={lng}
              isEdit={false}
              request={{
                id: "",
                teamId: teamId,
                requestType: RequestType.WORK_DEMAND,
                workerId: userWorker?.id || "",
                startDate: dayjs.utc().startOf("day"),
                endDate: dayjs.utc().startOf("day"),
                shiftId: "",
                shiftOptions: [],
                negative: false,
                hard: true,
                status: RequestStatus.PENDING,
                fulfillment: FulfillmentStatus.NOT_PROCESSED,
                comment: "",
                createdAt: dayjs.utc(),
                active: true,
                shiftTargetIds: [],
                missingAttributes: [],
              }}
              workers={workers.filter((w) => !w.deleted)}
              shifts={shifts}
              userWorkerId={userWorker?.id || null}
              userTeamRole={userTeamRole}
              handleAddRequest={handleAddRequest}
              handleUpdateRequest={handleUpdateRequest}
            />
          </div>
          <Tabs
            value={statusTab}
            onChange={(_e, v) => setStatusTab(v)}
            sx={{ marginBottom: 2, marginLeft: 2 }}
            aria-label="Request Status Tabs"
          >
            <Tab label={t("pending") || "Pending"} />
            <Tab label={t("approved") || "Approved"} />
            <Tab label={t("denied") || "Denied"} />
            <Tab label={t("calendar") || "Calendar"} />
          </Tabs>
          {[0, 1, 2].includes(statusTab) && (
            <RequestTable
              lng={lng}
              requests={requests.filter((r) => {
                if (statusTab === 0) return r.status === RequestStatus.PENDING;
                if (statusTab === 1) return r.status === RequestStatus.APPROVED;
                if (statusTab === 2) return r.status === RequestStatus.DENIED;
                return false;
              })}
              workers={workers}
              shifts={shifts}
              userWorkerId={userWorker?.id || null}
              userTeamRole={userTeamRole}
              handleUpdateRequest={handleUpdateRequest}
              handleDeleteRequest={handleDeleteRequest}
            />
          )}
          {statusTab === 3 && (
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

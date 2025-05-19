import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Components
import RequestPanel from "./request-panel";
import RequestTable from "./request-table";
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
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";

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
        }: {
          workers: WorkerT[];
          shifts: ShiftT[];
          requests: RequestT[];
        } = await getRequestsTabData(teamId);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setRequests(fetchedRequests);
        setIsLoading(false);
      }
    };
    fetchRequestsTabData();
  }, [teamId]);

  // ToggleButton state for request type
  const [requestType, setRequestType] = useState<RequestType>(
    RequestType.WORK_DEMAND
  );

  return (
    <div className="tab-container">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        <div>
          <div className="title-container">
            <span className="title">{t("requests")}</span>
            <ToggleButtonGroup
              color="primary"
              value={requestType}
              exclusive
              onChange={(_event, value) => {
                if (value !== null) setRequestType(value);
              }}
              aria-label="Request Type"
            >
              <ToggleButton
                value={RequestType.WORK_DEMAND}
                sx={{
                  marginTop: "5px",
                  marginBottom: "5px",
                  marginLeft: "56px",
                  textTransform: "none",
                  height: "30px",
                  width: "105px",
                  fontSize: "0.8rem",
                }}
              >
                {t("work")}
              </ToggleButton>
              <ToggleButton
                value={RequestType.LEAVE}
                sx={{
                  marginTop: "5px",
                  marginBottom: "5px",
                  textTransform: "none",
                  height: "30px",
                  width: "105px",
                  fontSize: "0.8rem",
                }}
              >
                {t("leave")}
              </ToggleButton>
            </ToggleButtonGroup>
            <RequestPanel
              lng={lng}
              isEdit={false}
              request={{
                id: "",
                teamId: teamId,
                requestType: requestType,
                workerId: userWorker?.id || "",
                startDate: dayjs.utc().startOf("day"),
                endDate: dayjs.utc().startOf("day"),
                shiftId: "",
                negative: false,
                hard: true,
                status: RequestStatus.PENDING,
                fulfillmentStatus: FulfillmentStatus.NOT_PROCESSED,
                comment: "",
                createdAt: dayjs.utc(),
                active: true,
              }}
              workers={workers.filter((w) => !w.deleted)}
              shifts={shifts.filter((s) => !s.deleted)}
              userWorkerId={userWorker?.id || null}
              userTeamRole={userTeamRole}
              handleAddRequest={handleAddRequest}
              handleUpdateRequest={handleUpdateRequest}
            />
          </div>
          <RequestTable
            lng={lng}
            requests={requests.filter((r) => r.requestType === requestType)}
            workers={workers}
            shifts={shifts}
            userWorkerId={userWorker?.id || null}
            userTeamRole={userTeamRole}
            handleUpdateRequest={handleUpdateRequest}
            handleDeleteRequest={handleDeleteRequest}
          />
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
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
import { RequestT, RequestStatus } from "../../types/request";
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

  return (
    <div className="tab-container">
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
                workerId: userWorker?.id || "",
                startDate: dayjs.utc().startOf("day"),
                endDate: dayjs.utc().startOf("day"),
                shiftId: "",
                negative: false,
                hard: true,
                status: RequestStatus.PENDING,
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
            requests={requests}
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

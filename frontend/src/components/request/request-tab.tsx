import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import PopoverRHS from "../inputs/popover-rhs";
import RequestPanel from "./request-panel";
import RequestTable from "./request-table";
import TableAddButton from "../buttons/table-add-button";
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
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";

dayjs.extend(utc);

export default function RequestTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "request-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [popoverRhsOpen, setPopoverRhsOpen] = useState<boolean>(false);

  const handleClosePopoverRhs = () => {
    setPopoverRhsOpen(false);
  };

  //////////////////////////
  // Request Actions
  //////////////////////////

  const handleAddRequest = async (request: RequestT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newRequest = await addRequest(request, selectedTeamId);
    setRequests([...requests, newRequest]);
  };

  const handleUpdateRequest = async (request: RequestT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedRequest = await updateRequest(request, selectedTeamId);
    setRequests(
      requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteRequest(requestId, selectedTeamId);
    setRequests(requests.filter((r) => r.id !== requestId));
  };

  useEffect(() => {
    const fetchRequestsTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          workers: fetchedWorkers,
          shifts: fetchedShifts,
          requests: fetchedRequests,
        }: {
          workers: WorkerT[];
          shifts: ShiftT[];
          requests: RequestT[];
        } = await getRequestsTabData(selectedTeamId);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setRequests(fetchedRequests);
        setIsLoading(false);
      }
    };
    fetchRequestsTabData();
  }, [selectedTeamId]);

  return (
    <div className="tab-container">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        <div>
          <div className="title-container">
            <span className="title">{t("requests")}</span>
            <PopoverRHS
              title={t("new_request")}
              buttonContent={<TableAddButton text={t("request")} />}
              content={
                <RequestPanel
                  lng={lng}
                  request={{
                    id: "",
                    workerId: "",
                    startDate: dayjs.utc().startOf("day"),
                    endDate: dayjs.utc().startOf("day"),
                    shiftId: "",
                    hard: true,
                    status: "pending",
                    active: true,
                  }}
                  workers={workers.filter((w) => !w.deleted)}
                  shifts={shifts.filter((s) => !s.deleted)}
                  handleClose={handleClosePopoverRhs}
                  handleAddRequest={handleAddRequest}
                  handleUpdateRequest={handleUpdateRequest}
                />
              }
              open={popoverRhsOpen}
              setOpen={setPopoverRhsOpen}
            />
          </div>
          <RequestTable
            lng={lng}
            requests={requests}
            workers={workers}
            shifts={shifts}
            handleUpdateRequest={handleUpdateRequest}
            handleDeleteRequest={handleDeleteRequest}
          />
        </div>
      )}
    </div>
  );
}

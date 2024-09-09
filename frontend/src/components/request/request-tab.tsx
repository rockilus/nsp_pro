import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import PopoverRHS from "../inputs/popover-rhs";
import RequestPanel from "./request-panel";
import RequestTable from "./request-table";
import TableAddButton from "../buttons/table-add-button";
// Actions
import {
  getRequestsTabData,
  addRequest,
  updateRequest,
  deleteRequest,
} from "@/app/lib/request";
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
      }
    };
    fetchRequestsTabData();
  }, [selectedTeamId]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        backgroundColor: "grey.100",
        minWidth: 200,
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingX: 1,
          borderBottom: "1px solid lightgrey",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography
            variant="subtitle1"
            align="left"
            sx={{ fontWeight: "bold" }}
          >
            {t("requests")}
          </Typography>
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
                }}
                workers={workers}
                shifts={shifts}
                handleClose={handleClosePopoverRhs}
                handleAddRequest={handleAddRequest}
                handleUpdateRequest={handleUpdateRequest}
              />
            }
            open={popoverRhsOpen}
            setOpen={setPopoverRhsOpen}
          />
        </Box>
      </Box>
      <RequestTable
        lng={lng}
        requests={requests}
        workers={workers}
        shifts={shifts}
        handleUpdateRequest={handleUpdateRequest}
        handleDeleteRequest={handleDeleteRequest}
      />
    </Box>
  );
}

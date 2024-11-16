import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import PopoverRHS from "../inputs/popover-rhs";
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
import { getUsers } from "../../app/lib/dashboard";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "./dashboard-tab.css";
// Types
import { RequestT, RequestStatus } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { UserT } from "../../types/user";

dayjs.extend(utc);

export default function DashboardTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "request-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [popoverRhsOpen, setPopoverRhsOpen] = useState<boolean>(false);

  const handleClosePopoverRhs = () => {
    setPopoverRhsOpen(false);
  };

  const tableHeaders: { name: string; label: string }[] = [
    { name: "firstName", label: t("first_name") },
    { name: "lastName", label: t("last_name") },
    { name: "email", label: t("email") },
  ];

  //////////////////////////
  // User Actions
  //////////////////////////

  //////////////////////////
  // Request Actions
  //////////////////////////

  //   const handleAddRequest = async (request: RequestT) => {
  //     if (!selectedTeamId) {
  //       throw new Error("Team not selected");
  //     }
  //     const newRequest = await addRequest(request, selectedTeamId);
  //     setRequests([...requests, newRequest]);
  //   };

  //   const handleUpdateRequest = async (request: RequestT) => {
  //     if (!selectedTeamId) {
  //       throw new Error("Team not selected");
  //     }
  //     const updatedRequest = await updateRequest(request, selectedTeamId);
  //     setRequests(
  //       requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
  //     );
  //   };

  //   const handleDeleteRequest = async (requestId: string) => {
  //     if (!selectedTeamId) {
  //       throw new Error("Team not selected");
  //     }
  //     await deleteRequest(requestId, selectedTeamId);
  //     setRequests(requests.filter((r) => r.id !== requestId));
  //   };

  useEffect(() => {
    // const fetchRequestsTabData = async () => {
    //   setIsLoading(true);
    //   if (selectedTeamId) {
    //     const {
    //       workers: fetchedWorkers,
    //       shifts: fetchedShifts,
    //       requests: fetchedRequests,
    //     }: {
    //       workers: WorkerT[];
    //       shifts: ShiftT[];
    //       requests: RequestT[];
    //     } = await getRequestsTabData(selectedTeamId);
    //     setWorkers(fetchedWorkers);
    //     setShifts(fetchedShifts);
    //     setRequests(fetchedRequests);
    //     setIsLoading(false);
    //   }
    // };
    // fetchRequestsTabData();
    const fetchUsers = async () => {
      setIsLoading(true);
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

  return (
    <div className="tab-container">
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell key={header.name}>{header.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                {tableHeaders.map((header) => (
                  <TableCell key={header.name}>
                    {user[header.name as keyof UserT] as string}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

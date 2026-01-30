import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import SavedCell from "./saved-cell";
import ActionsCell from "./actions-cell";
import ActionsNotInDBCell from "./actions-not-in-db-cell";
// Hooks
import {
  useGetUsersDashboard,
  useGetUserDashboard,
  useImpersonateUser,
  useDeleteUser,
} from "../../hooks/useDashboard";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "./dashboard-tab.css";
// Types
import { UserT, UserDashboardT, UserAuthT } from "../../types/user";

export default function DashboardTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "dashboard-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [usersDashboard, setUsersDashboard] = useState<UserDashboardT[]>([]);

  // Dashboard hooks
  const getUsersDashboard = useGetUsersDashboard();
  const getUserDashboard = useGetUserDashboard();
  const impersonateUser = useImpersonateUser();
  const deleteUser = useDeleteUser();

  const tableHeaders: { name: string; label: string }[] = [
    { name: "firstName", label: t("first_name") },
    { name: "lastName", label: t("last_name") },
    { name: "email", label: t("email") },
    { name: "saved", label: t("saved") },
    { name: "actions", label: t("actions") },
  ];

  //////////////////////////
  // User Actions
  //////////////////////////

  const handleImpersonate = async (targetUser: UserT) => {
    try {
      const impersonateSuccess = await impersonateUser(targetUser.id);
      if (impersonateSuccess) {
        window.location.href = `/${targetUser.language}/plan/workers`;
      }
    } catch (error) {
      console.error("Failed to impersonate user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const deleteSuccess = await deleteUser(userId);
      if (deleteSuccess) {
        const updatedUsers = usersDashboard.filter(
          (ud) =>
            ud.user?.id !== userId &&
            ud.userAuthn?.id !== userId &&
            ud.userAuthz?.id !== userId
        );
        setUsersDashboard(updatedUsers);
      } else {
        const userToDelete = await getUserDashboard(userId);
        if (userToDelete) {
          const updatedUsers = usersDashboard.map((ud) =>
            ud.user?.id === userId ||
            ud.userAuthn?.id === userId ||
            ud.userAuthz?.id === userId
              ? userToDelete
              : ud
          );
          setUsersDashboard(updatedUsers);
        }
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await getUsersDashboard();
        setUsersDashboard(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [getUsersDashboard]);

  return (
    <div className="tab-container-wide" data-testid="dashboard-page-heading">
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
            {usersDashboard.map((ud) => {
              if (ud.user) {
                return (
                  <TableRow
                    key={ud.user.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    {tableHeaders.map((header) =>
                      header.name === "saved" ? (
                        <SavedCell
                          key={ud.user?.id + header.name}
                          database={true}
                          authn={ud.userAuthn !== null}
                          authz={ud.userAuthz !== null}
                        />
                      ) : header.name === "actions" ? (
                        <ActionsCell
                          key={ud.user?.id + header.name}
                          lng={lng}
                          targetUser={ud.user as UserT}
                          handleImpersonate={handleImpersonate}
                        />
                      ) : (
                        <TableCell key={ud.user?.id + header.name}>
                          {ud.user?.[header.name as keyof UserT] as string}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                );
              } else {
                const userAuth = (ud.userAuthn || ud.userAuthz) as UserAuthT;
                return (
                  <TableRow
                    key={userAuth.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    {tableHeaders.map((header) =>
                      header.name === "saved" ? (
                        <SavedCell
                          key={userAuth.id + header.name}
                          database={false}
                          authn={ud.userAuthn !== null}
                          authz={ud.userAuthz !== null}
                        />
                      ) : header.name === "actions" ? (
                        <ActionsNotInDBCell
                          key={userAuth.id + header.name}
                          lng={lng}
                          targetUser={ud}
                          handleDeleteUser={handleDeleteUser}
                        />
                      ) : (
                        <TableCell key={userAuth.id + header.name}>
                          {header.name === "email"
                            ? (userAuth.email as string)
                            : ""}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                );
              }
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

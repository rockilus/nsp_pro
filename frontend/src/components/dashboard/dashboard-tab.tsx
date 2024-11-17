import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Actions
import { getUsersDashboard } from "../../app/lib/dashboard";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "./dashboard-tab.css";
// Types
import { UserT, UserDashboardT, UserAuthT } from "../../types/user";

export default function DashboardTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "request-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [usersDashboard, setUsersDashboard] = useState<UserDashboardT[]>([]);

  const tableHeaders: { name: string; label: string }[] = [
    { name: "firstName", label: t("first_name") },
    { name: "lastName", label: t("last_name") },
    { name: "email", label: t("email") },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const fetchedUsers = await getUsersDashboard();
      setUsersDashboard(fetchedUsers);
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
            {usersDashboard.map((ud) => {
              if (ud.user) {
                return (
                  <TableRow
                    key={ud.user.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    {tableHeaders.map((header) => (
                      <TableCell key={header.name}>
                        {ud.user?.[header.name as keyof UserT] as string}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              } else {
                const userAuth = (ud.userAuthn || ud.userAuthz) as UserAuthT;
                return (
                  <TableRow
                    key={userAuth.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    {tableHeaders.map((header) => (
                      <TableCell key={header.name}>
                        {header.name === "email"
                          ? (userAuth.email as string)
                          : ""}
                      </TableCell>
                    ))}
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

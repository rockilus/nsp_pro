import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Stores
import { useUserStore } from "../../stores/userStore";
// Types
import { UserT } from "./types";

interface Props {
  user: UserT | null;
}

export default function UserProfileTab({ user }: Props) {
  const { t } = useTranslation();

  const fetchUser = useUserStore((state) => state.fetchUser);

  const tableFields: Record<string, string>[] = [
    { name: "firstName", label: t("user.first_name") },
    { name: "lastName", label: t("user.last_name") },
    { name: "email", label: t("user.email") },
  ];

  useEffect(() => {
    if (!user) {
      console.log("fetching user");
      fetchUser();
    }
  }, [user, fetchUser]);

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
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("user.user_profile")}
        </Typography>
      </Box>
      {user ? (
        <TableContainer
          component={Paper}
          sx={{ width: "100%", borderRadius: "0 0 8px 8px" }}
        >
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableBody>
              {tableFields.map((field, index) => (
                <TableRow
                  key={index}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell sx={{ paddingY: 0 }}>{field.label}</TableCell>
                  <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                    {user[field.name as keyof typeof user]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ padding: 2 }}>{t("user.no_user_found")}</Box>
      )}
    </Box>
  );
}

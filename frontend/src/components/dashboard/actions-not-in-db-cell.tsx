import React from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Styles
import "./saved-cell.css";
// Types
import { UserDashboardT } from "../../types/user";

export default function ActionsNotInDBCell({
  lng,
  targetUser,
  handleDeleteUser,
}: {
  lng: string;
  targetUser: UserDashboardT;
  handleDeleteUser: (userId: string) => void;
}) {
  const { t } = useTranslation(lng, "dashboard-page");

  const handleDeleteUserConfirm = async () => {
    if (targetUser.user) return;
    const userId = targetUser.userAuthn?.id || targetUser.userAuthz?.id;
    if (userId) {
      handleDeleteUser(userId);
    }
  };

  return (
    <TableCell>
      <div className="actions-cell-container">
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={handleDeleteUserConfirm}
        >
          <DeleteIcon />
        </IconButton>
      </div>
    </TableCell>
  );
}

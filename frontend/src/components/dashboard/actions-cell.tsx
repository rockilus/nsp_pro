import React from "react";
// import { useTranslation } from "../../app/i18n/client";
// MUI
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
// Styles
import "./saved-cell.css";
// Types
import { UserT } from "../../types/user";

export default function ActionsCell({
  lng,
  targetUser,
  handleImpersonate,
}: {
  lng: string;
  targetUser: UserT;
  handleImpersonate: (targetUser: UserT) => void;
}) {
  // const { t } = useTranslation(lng, "dashboard-page");
  return (
    <TableCell>
      <div className="actions-cell-container">
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={() => handleImpersonate(targetUser)}
        >
          <TheaterComedyIcon />
        </IconButton>
        {/* <button
          className="impersonate-button"
          onClick={() => handleImpersonate(targetUser)}
        >
          {t("impersonate")}
        </button> */}
      </div>
    </TableCell>
  );
}

import React from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
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
  const { t } = useTranslation(lng, "dashboard-page");
  return (
    <TableCell>
      <div className="actions-cell-container">
        <button
          className="impersonate-button"
          onClick={() => handleImpersonate(targetUser)}
        >
          {t("impersonate")}
        </button>
      </div>
    </TableCell>
  );
}

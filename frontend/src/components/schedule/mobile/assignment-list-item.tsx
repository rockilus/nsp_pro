import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ShiftColorMappings } from "../../../constants/constants";

export default function AssignmentListItem({
  assignment,
  shift,
  onClick,
}: {
  assignment: any;
  shift: any;
  onClick?: () => void;
}) {
  const mapping = (shift && ShiftColorMappings[shift.color]) || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        cursor: onClick ? "pointer" : "default",
        backgroundColor: mapping.background,
        color: mapping.text,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{shift?.name || "—"}</Typography>
        <Typography variant="caption" color="inherit">
          {assignment?.date ? new Date(assignment.date).toLocaleString() : ""}
        </Typography>
      </Box>
    </Box>
  );
}

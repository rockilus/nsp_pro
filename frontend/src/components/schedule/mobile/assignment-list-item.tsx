import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function AssignmentListItem({
  assignment,
  shift,
  onClick,
}: {
  assignment: any;
  shift: any;
  onClick?: () => void;
}) {
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
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: shift?.color || "#ccc",
        }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{shift?.name || "—"}</Typography>
        <Typography variant="caption" color="textSecondary">
          {assignment?.date ? new Date(assignment.date).toLocaleString() : ""}
        </Typography>
      </Box>
    </Box>
  );
}

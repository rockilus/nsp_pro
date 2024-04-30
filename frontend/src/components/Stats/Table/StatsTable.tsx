import React from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Stores
import { useStatStore } from "../../../stores/statsStore";
// Types
import { StatsT, StatsValueT, StatsHeaderT } from "../types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
// Constants
import { statsUnitOptions } from "../../../utils/constants";

interface Props {
  stats: StatsT;
  showingCustom: boolean;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function StatsTable({
  stats,
  showingCustom,
  workers,
  shifts,
}: Props) {
  const borderStyle = "1px solid #E8E8E8";

  const addHeaderToCustom = useStatStore((state) => state.addHeaderToCustom);
  const deleteHeaderFromCustom = useStatStore(
    (state) => state.deleteHeaderFromCustom
  );

  const handleAddDeleteHeaderToCustom = (statsHeader: StatsHeaderT) => {
    if (statsHeader.inCustom) {
      deleteHeaderFromCustom(statsHeader.id, statsHeader.teamId);
    } else {
      addHeaderToCustom(statsHeader);
    }
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        marginLeft: 0,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell
                align="left"
                colSpan={stats.statsHeaders.length + 1}
                sx={{ borderLeft: borderStyle, paddingY: 0 }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    display: "flex",
                    fontWeight: "bold",
                    height: 45,
                    alignItems: "center",
                  }}
                >
                  Stats
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              {stats.statsHeaders.map((header, headerIndex) => (
                <TableCell
                  key={headerIndex}
                  align="center"
                  // sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
                >
                  {showingCustom && (
                    <Typography variant="body1" sx={{ fontSize: "0.8rem" }}>
                      {statsUnitOptions.find((u) => u.name === header.statsUnit)
                        ?.label || header.statsUnit}
                    </Typography>
                  )}
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {header.headerUnit === "shift"
                      ? shifts.find((s) => s.id === header.value)?.name
                      : header.value}
                  </Typography>
                  <Button
                    sx={{
                      fontStyle: "italic",
                      fontSize: "0.7rem",
                      padding: "1px",
                      borderRadius: 4,
                      textTransform: "none",
                      border: "1px solid",
                      height: "25px",
                      color: "grey.700",
                      backgroundColor: header.inCustom ? "grey.300" : "none",
                      boxShadow: header.inCustom
                        ? "inset 0 0 5px rgba(0,0,0,0.3)"
                        : "none",
                    }}
                    onClick={() => handleAddDeleteHeaderToCustom(header)}
                  >
                    Custom
                  </Button>
                </TableCell>
              ))}
            </TableRow>
            {showingCustom && (
              <TableRow>
                <TableCell></TableCell>
                {stats.statsHeaders.map((header, headerIndex) => (
                  <TableCell
                    key={headerIndex}
                    align="center"
                    // sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
                  >
                    <Typography
                      variant="body1"
                      sx={{ fontStyle: "italic", fontSize: "0.8rem" }}
                    >
                      {header.selectedShifts.map((ss) => ss.name).join(", ")}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {workers.map((worker, wIndex) => (
              <TableRow key={wIndex}>
                <TableCell align="left">{worker.name}</TableCell>
                {stats.statsHeaders.map((header, headerIndex) => {
                  const statsValue: StatsValueT | null =
                    stats.statsValues.find(
                      (s) =>
                        s.headerId === header.id && s.workerId === worker.id
                    ) || null;
                  return (
                    statsValue && (
                      <TableCell key={wIndex + headerIndex} align="center">
                        {statsValue.value}
                      </TableCell>
                    )
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

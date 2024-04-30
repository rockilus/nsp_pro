import React from "react";
// MUI
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Stores
import { useStatStore } from "../../../stores/statsStore";
// Types
import { StatsT, StatsValueT, StatsHeaderT, StatsOptionsT } from "../types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
import { TeamT } from "../../../containers/types";

interface Props {
  stats: StatsT;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function StatsTable({ stats, workers, shifts }: Props) {
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
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          {/* <TableRow>
            {clusters.map((cluster, clusterIndex) => (
              <TableCell
                key={clusterIndex}
                align="center"
                colSpan={cluster.columnSpan}
                sx={{ borderLeft: borderStyle }}
              >
                {cluster.label}
              </TableCell>
            ))}
          </TableRow> */}
          <TableRow>
            <TableCell></TableCell>
            <TableCell
              align="center"
              colSpan={stats.statsHeaders.length}
              sx={{ borderLeft: borderStyle }}
            >
              {/* {stats.statsHeaders[0].selectedShifts} */}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell></TableCell>
            {stats.statsHeaders.map((header, headerIndex) => (
              <TableCell
                key={headerIndex}
                align="center"
                sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
              >
                {header.headerUnit === "shift"
                  ? shifts.find((s) => s.id === header.value)?.name
                  : header.value}
                <Button
                  variant="contained"
                  color={header.inCustom ? "info" : "primary"}
                  size="small"
                  sx={{
                    textTransform: "none",
                    fontStyle: "italic",
                    fontSize: "0.7rem",
                    padding: "2px",
                  }}
                  onClick={() => handleAddDeleteHeaderToCustom(header)}
                >
                  Add custom
                </Button>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {workers.map((worker, wIndex) => (
            <TableRow key={wIndex}>
              <TableCell align="left">{worker.name}</TableCell>
              {stats.statsHeaders.map((header, headerIndex) => {
                const statsValue: StatsValueT | null =
                  stats.statsValues.find(
                    (s) => s.headerId === header.id && s.workerId === worker.id
                  ) || null;
                return (
                  statsValue && (
                    <TableCell
                      key={wIndex + headerIndex}
                      align="center"
                      sx={{ borderLeft: borderStyle }}
                    >
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
  );
}

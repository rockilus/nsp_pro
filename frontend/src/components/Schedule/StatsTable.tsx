import React from "react";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { StatT, ColumnStatsT, WorkerIdNameT, ShiftIdNameT } from "./types";

interface Props {
  stats: StatT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function StatsTable({ stats, workers, shifts }: Props) {
  const borderStyle = "1px solid #E8E8E8";

  const buildHeaders = () => {
    const clusters: ColumnStatsT[] = [
      { name: "", label: "", columnSpan: 1, cluster: "" },
    ];
    const headers: ColumnStatsT[] = [
      { name: "", label: "", columnSpan: 1, cluster: "" },
    ];
    const clusterNames = new Set(stats.map((stat) => stat.cluster));
    clusterNames.forEach((clusterName: string) => {
      const headerNames = new Set(
        stats
          .filter((stat) => stat.cluster === clusterName)
          .map((stat) => stat.name)
      );
      clusters.push({
        name: clusterName,
        label: clusterName,
        columnSpan: headerNames.size,
        cluster: clusterName,
      });
      headerNames.forEach((headerName: string) => {
        headers.push({
          name: headerName,
          label:
            clusterName === "Worked shifts"
              ? shifts.find((s) => s.id === headerName)?.name || ""
              : headerName,
          columnSpan: 1,
          cluster: clusterName,
        });
      });
    });
    return { clusters, headers };
  };

  const groupByWorkerId = (stats: StatT[]): Record<string, StatT[]> => {
    return stats.reduce((acc: Record<string, StatT[]>, stat: StatT) => {
      const { workerId } = stat;
      if (!acc[workerId]) {
        acc[workerId] = [];
      }
      acc[workerId].push(stat);
      return acc;
    }, {});
  };

  const { clusters, headers } = buildHeaders();
  const rows: StatT[][] = Object.values(groupByWorkerId(stats));

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
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
          </TableRow>
          <TableRow>
            {headers.map((header, headerIndex) => (
              <TableCell
                key={headerIndex}
                sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
              >
                {header.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell align="left">
                {workers.find((w) => w.id === row[0].workerId)?.name}
              </TableCell>
              {headers.map((header, headerIndex) => {
                const stat: StatT | null =
                  row.find((s) => s.name === header.name) || null;
                return (
                  stat && (
                    <TableCell
                      key={headerIndex}
                      align="center"
                      sx={{ borderLeft: borderStyle }}
                    >
                      {stat.value}
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

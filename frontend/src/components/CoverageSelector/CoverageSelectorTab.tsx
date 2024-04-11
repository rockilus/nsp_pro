import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import TableAddButton from "../SharedComponents/TableAddButton";
// Stores
import { useCoverageSelectorStore } from "../../stores/coverageSelectorStore";
// Utils
import { dateToTimeZero } from "../../utils/dateUtils";
// Types
import { CoverageSelectorT } from "./types";
import { TeamT } from "../../containers/types";
import { CoverageT } from "../Coverage/types";

interface Props {
  team: TeamT;
  coverageSelectors: CoverageSelectorT[];
  coverages: CoverageT[];
}

export default function CoverageSelectorTab({
  team,
  coverageSelectors,
  coverages,
}: Props) {
  const columns = useMemo(() => ["Start date", "End date", "Coverage"], []);

  const addCoverageSelector = useCoverageSelectorStore(
    (state) => state.addCoverageSelector
  );
  const updateCoverageSelector = useCoverageSelectorStore(
    (state) => state.updateCoverageSelector
  );
  const deleteCoverageSelector = useCoverageSelectorStore(
    (state) => state.deleteCoverageSelector
  );

  // Rows
  const handleAddCoverageSelector = async () => {
    const newCoverageSelector: CoverageSelectorT = {
      id: "",
      teamId: team.id,
      startDate: dateToTimeZero(new Date()),
      endDate: dateToTimeZero(new Date()),
      coverageId: "",
    };
    await addCoverageSelector(newCoverageSelector);
  };

  const handleUpdateCoverageId = (
    event: SelectChangeEvent,
    coverageSelector: CoverageSelectorT
  ) => {
    const updatedCoverageSelector: CoverageSelectorT = {
      ...coverageSelector,
      coverageId: event.target.value as string,
    };
    updateCoverageSelector(updatedCoverageSelector);
  };

  const handleUpdateCoverageSelector = (
    updatedCoverageSelector: CoverageSelectorT
  ) => {
    updateCoverageSelector(updatedCoverageSelector);
  };

  const handleDeleteCoverageSelector = (rowId: string) => {
    deleteCoverageSelector(rowId, team.id);
  };

  const selectCoverage = (coverageSelector: CoverageSelectorT) => {
    return (
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={
              coverages.find(
                (coverage) => coverage.id === coverageSelector.coverageId
              )
                ? coverageSelector.coverageId
                : ""
            }
            onChange={(e) => handleUpdateCoverageId(e, coverageSelector)}
          >
            {coverages.map((coverage) => (
              <MenuItem key={coverage.id} value={coverage.id}>
                {coverage.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell colSpan={columns.length + 1} sx={{ paddingY: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      Coverage selectors
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              {columns.map((column, colIndex) => (
                <TableCell
                  key={colIndex}
                  component="th"
                  scope="row"
                  sx={{ paddingY: 0, fontWeight: "bold" }}
                >
                  <Box
                    sx={{
                      minHeight: 45,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {column}
                  </Box>
                </TableCell>
              ))}
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverageSelectors.map((coverageSelector) => (
              <TableRow
                key={coverageSelector.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <DatePicker
                    value={dayjs(coverageSelector.startDate)}
                    onChange={(newValue) =>
                      handleUpdateCoverageSelector({
                        ...coverageSelector,
                        startDate: dateToTimeZero(
                          newValue?.toDate() || new Date()
                        ),
                      })
                    }
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  <DatePicker
                    value={dayjs(coverageSelector.endDate)}
                    onChange={(newValue) =>
                      handleUpdateCoverageSelector({
                        ...coverageSelector,
                        endDate: dateToTimeZero(
                          newValue?.toDate() || new Date()
                        ),
                      })
                    }
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  {selectCoverage(coverageSelector)}
                </TableCell>
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button
                      onClick={() =>
                        handleDeleteCoverageSelector(coverageSelector.id)
                      }
                    >
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "grey.100" }}>
              <TableCell colSpan={columns.length + 1} sx={{ paddingY: 0 }}>
                <Box display="flex" alignItems="center" minHeight={45}>
                  <TableAddButton
                    text="Add coverage selector"
                    handleClick={handleAddCoverageSelector}
                  />
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

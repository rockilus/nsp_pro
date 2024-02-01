import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";

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

import { useCoverageSelectorStore } from "../../stores/coverageSelectorStore";
import { useCoverageStore } from "../../stores/coverageStore";
import { CoverageSelectorT } from "./types";

export default function CoverageSelectorTab() {
  const columns = useMemo(() => ["Start date", "End date", "Coverage"], []);

  const coverageSelectors = useCoverageSelectorStore(
    (state) => state.coverageSelectors
  );
  const fetchCoverageSelectors = useCoverageSelectorStore(
    (state) => state.fetchCoverageSelectors
  );
  const addCoverageSelector = useCoverageSelectorStore(
    (state) => state.addCoverageSelector
  );
  const updateCoverageSelector = useCoverageSelectorStore(
    (state) => state.updateCoverageSelector
  );
  const deleteCoverageSelector = useCoverageSelectorStore(
    (state) => state.deleteCoverageSelector
  );

  const coverages = useCoverageStore((state) => state.coverages);
  const fetchCoverages = useCoverageStore((state) => state.fetchCoverages);

  useEffect(() => {
    fetchCoverageSelectors();
  }, [fetchCoverageSelectors]);

  useEffect(() => {
    fetchCoverages();
  }, [fetchCoverages]);

  // Rows

  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const handleAddCoverageSelector = async () => {
    const newCoverageSelector: CoverageSelectorT = {
      id: "",
      startDate: dateToTimeZero(new Date()),
      endDate: dateToTimeZero(new Date()),
      coverageId: "",
    };
    await addCoverageSelector(newCoverageSelector);
  };

  const handleUpdateCoverageId = async (
    event: SelectChangeEvent,
    coverageSelector: CoverageSelectorT
  ) => {
    const updatedCoverageSelector: CoverageSelectorT = {
      ...coverageSelector,
      coverageId: event.target.value as string,
    };
    await updateCoverageSelector(updatedCoverageSelector);
  };

  const handleUpdateCoverageSelector = async (
    updatedCoverageSelector: CoverageSelectorT
  ) => {
    await updateCoverageSelector(updatedCoverageSelector);
  };

  const handleDeleteCoverageSelector = async (rowId: string) => {
    await deleteCoverageSelector(rowId);
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
            label="Coverage"
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
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Coverage Selection
      </Typography>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} component="th" scope="row">
                  {column}
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
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Button onClick={handleAddCoverageSelector}>
                  <AddIcon />
                  New
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

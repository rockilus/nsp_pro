import React, { useCallback, useContext, useEffect, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { TimetablesContext } from "../../context/TimetablesContext";
import { TimetableTimesContext } from "../../context/TimetableTimesContext";
import { TimetableCategoriesContext } from "../../context/TimetableCategoriesContext";
import { TimetablePropertiesContext } from "../../context/TimetablePropertiesContext";

export default function WorkerConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const timetablesContext = useContext(TimetablesContext);
  const timetableTimesContext = useContext(TimetableTimesContext);
  const timetableCategoriesContext = useContext(TimetableCategoriesContext);
  const timetablePropertiesContext = useContext(TimetablePropertiesContext);

  const buildRows = useCallback(() => {
    const newRows = [];
    if (timetableCategoriesContext.currentTimetableCategories) {
      for (let category of timetableCategoriesContext.currentTimetableCategories) {
        if (timetablePropertiesContext.currentTimetableProperties) {
          const properties =
            timetablePropertiesContext.currentTimetableProperties[category._id];
          const rowSpan = properties.length;
          for (let property of properties) {
            let row: Record<string, any> = {};
            for (let column of columns) {
              const property = worker["worker_properties"].find(
                (p: Record<string, any>) => p.worker_param === column._id
              );
              row[column.name] = property ? property.value || "" : "";
            }
            row["_id"] = worker["worker"]["_id"];
            newRows.push(row);
          }
        }
      }
      setRows(newRows);
    }
  }, [columns, workersContext?.currentWorkers]);

  useEffect(() => {
    async function fetchTimetables() {
      const { timetable_times, timetable_categories, timetable_properties } =
        await timetablesContext.getTimetables();
      return { timetable_times, timetable_categories, timetable_properties };
    }
    if (!timetablesContext.currentTimetables) {
      const { timetable_times, timetable_categories, timetable_properties } =
        fetchTimetables();
      timetableCategoriesContext.addToTimetableCategory(timetable_categories);
      timetableTimesContext.addToTimetableTime(timetable_times);
      timetablePropertiesContext.addToTimetableProperty(timetable_properties);
    }
    if (timetableCategoriesContext.currentTimetableCategories) {
      setColumns(timetableCategoriesContext.currentTimetableCategories);
    }
    if (
      timetableCategoriesContext.currentTimetableCategories &&
      timetablePropertiesContext.currentTimetableProperties &&
      columns.length
    ) {
      buildRows();
    }
  }, [
    timetablesContext,
    timetableCategoriesContext,
    timetableTimesContext,
    timetablePropertiesContext,
    columns,
    buildRows,
  ]);

  // useEffect(() => {
  //   async function fetchWorkers() {
  //     await workersContext.getWorkers();
  //   }
  //   if (!workersContext.currentWorkers) {
  //     fetchWorkers();
  //   }
  //   if (workersContext.currentWorkers) {
  //     setRows(workersContext.currentWorkers);
  //   }
  // }, [workersContext]);

  // useEffect(() => {
  //   if (columns.length > 0 && workersContext.currentWorkers) {
  //     buildRows();
  //   }
  // }, [columns, workersContext, buildRows]);

  // Columns

  // const handleAddColumn = async (
  //   label: string,
  //   entryType: string,
  //   entryOptions: string[]
  // ) => {
  //   await workerParamsContext.postCreateWorkerParam(
  //     label,
  //     entryType,
  //     entryOptions
  //   );
  // };

  // const handleEditHeadCell = async (
  //   workerParamId: string,
  //   label: string,
  //   entryType: string,
  //   entryOptions: string[]
  // ) => {
  //   console.log(
  //     "handleEditCell called: ",
  //     workerParamId,
  //     label,
  //     entryType,
  //     entryOptions
  //   );
  //   await workerParamsContext.postUpdateWorkerParam(
  //     workerParamId,
  //     label,
  //     entryType,
  //     entryOptions
  //   );
  // };

  // const handleDeleteColumn = async (workerParamId: string) => {
  //   console.log("handleDeleteColumn called: ", workerParamId);
  //   await workerParamsContext.deleteWorkerParam(workerParamId);
  // };

  // // Rows

  // const handleAddRow = async () => {
  //   console.log("handleAddRow called: ");

  //   await workersContext.postCreateWorker();
  // };

  // const handleEditBodyCell = async (
  //   workerId: string,
  //   workerParamId: string,
  //   value: any
  // ) => {
  //   console.log("handleEditCell called: ", workerId, workerParamId, value);
  //   await workersContext.postUpdateWorkerProperty(
  //     workerId,
  //     workerParamId,
  //     value
  //   );
  // };

  // const handleDeleteRow = async (workerId: string) => {
  //   console.log("handleDeleteRow called: ", workerId);

  //   await workersContext.deleteWorker(workerId);
  // };

  const handleCreateTimetable = async () => {
    const { timetable_times, timetable_categories } =
      await timetablesContext.postCreateTimetable();
    console.log("timetable_categories: ", timetable_categories);
    console.log("timetable_times: ", timetable_times);

    timetableCategoriesContext.addToTimetableCategory(timetable_categories);
    timetableTimesContext.addToTimetableTime(timetable_times);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Timetables Configuration
      </Typography>
      {/* <TableTemplate
        columns={columns}
        rows={rows}
        handleAddColumn={handleAddColumn}
        handleEditHeadCell={handleEditHeadCell}
        handleDeleteColumn={handleDeleteColumn}
        handleAddRow={handleAddRow}
        handleEditBodyCell={handleEditBodyCell}
        handleDeleteRow={handleDeleteRow}
      /> */}
      <Button onClick={handleCreateTimetable}>
        <AddIcon />
        New
      </Button>
    </Box>
  );
}

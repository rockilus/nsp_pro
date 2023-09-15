import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Typography from "@mui/material/Typography";

import TimetableTableTemplate from "./TimetableTableTemplate";

import { TimetablesContext } from "../../context/TimetablesContext";
import { TimetableTimesContext } from "../../context/TimetableTimesContext";
import { TimetableCategoriesContext } from "../../context/TimetableCategoriesContext";
import { TimetablePropertiesContext } from "../../context/TimetablePropertiesContext";
import { log } from "util";

interface Props {
  timetableInfo: Record<string, any>;
}

export default function TimetableProcess({ timetableInfo }: Props) {
  const [timetable, setTimetable] = useState<Record<string, any>>(
    timetableInfo.timetable
  );
  const [timetableTimes, setTimetableTimes] = useState<Record<string, any>[]>(
    timetableInfo.timetable_times
  );
  const [timetableCategories, setTimetableCategories] = useState<
    Record<string, any>[]
  >(timetableInfo.timetable_categories);
  const [timetableProperties, setTimetableProperties] = useState<
    Record<string, any>[]
  >(timetableInfo.timetable_properties);

  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const timetablesContext = useContext(TimetablesContext);
  const timetableTimesContext = useContext(TimetableTimesContext);
  const timetableCategoriesContext = useContext(TimetableCategoriesContext);
  const timetablePropertiesContext = useContext(TimetablePropertiesContext);

  const buildRows = useCallback(
    (
      categoriesArray: Record<string, any>[],
      propertiesArray: Record<string, any>[]
    ) => {
      const newRows = [];
      const propertiesDict = buildProperties(categoriesArray, propertiesArray);
      for (let category of categoriesArray) {
        const addRow = buildAddRow(category._id);
        let categoryCellAdded = false;
        const properties = propertiesDict[category._id];
        const propertiesWithAdd = [...properties, ...addRow];
        // const rowSpan = properties.length + 1;
        let rowCount = 0;
        while (propertiesWithAdd.length > 0) {
          // for (let i = 0; i < 5; i++) {
          let row: Record<string, any> = {};
          for (let column of columns) {
            if (!categoryCellAdded) {
              row["category"] = { ...category };
              categoryCellAdded = true;
            }
            if (column.label !== "category") {
              // Search for the first item with age = 30
              const index = propertiesWithAdd.findIndex(
                (property) => property.timetable_time === column._id
              );
              const propertyFound =
                index !== -1 ? propertiesWithAdd.splice(index, 1)[0] : null;
              row[column.label] = propertyFound ? propertyFound : {};
            }
          }
          row["_id"] = category["_id"];
          newRows.push(row);
          rowCount++;
        }
        newRows[0]["category"]["rowSpan"] = rowCount;
      }
      setRows(newRows);
    },
    [columns]
  );

  const buildProperties = (
    categoriesArray: Record<string, any>[],
    propertiesArray: Record<string, any>[]
  ) => {
    console.log("categoriesArray: ", categoriesArray);
    console.log("propertiesArray: ", propertiesArray);

    const properties: Record<string, any> = {};
    for (let category of categoriesArray) {
      properties[category._id] = propertiesArray.filter(
        (x: Record<string, any>) => x["timetable_category"] === category._id
      );
    }
    return properties;
  };

  const buildAddRow = (categoryId: string) => {
    const addRow: Record<string, any>[] = [];
    for (let column of columns) {
      if (column.label === "category") {
        continue;
      }
      const newAddRow: Record<string, any> = {};
      newAddRow["timetable"] = timetable._id;
      newAddRow["timetable_time"] = column._id;
      newAddRow["timetable_category"] = categoryId;
      newAddRow["_id"] = "addPropertyRow";
      addRow.push(newAddRow);
    }
    return addRow;
  };

  useEffect(() => {
    setColumns([{ label: "category", _id: "category" }, ...timetableTimes]);
  }, [timetableTimes]);

  useEffect(() => {
    if (columns.length > 0) {
      buildRows(timetableCategories, timetableProperties);
    }
  }, [columns, buildRows, timetableCategories, timetableProperties]);

  // Timetable
  const handleDeleteTimetable = async (timetableId: string) => {
    await timetablesContext.deleteTimetable(timetableId);
  };

  // Columns

  const handleAddColumn = async (label: string, timetableId: string) => {
    await timetableCategoriesContext.postCreateTimetableCategory(
      label,
      timetableId
    );
  };

  const handleEditHeadCell = async (
    timetableCategoryId: string,
    label: string
  ) => {
    await timetableCategoriesContext.postUpdateTimetableCategory(
      timetableCategoryId,
      label
    );
  };

  const handleDeleteColumn = async (timetableCategoryId: string) => {
    await timetableCategoriesContext.deleteTimetableCategory(
      timetableCategoryId
    );
  };

  // Categories

  // Rows

  const handleAddRow = async (
    label: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => {
    await timetablePropertiesContext.postCreateTimetableProperty(
      label,
      timetableId,
      timetableCategoryId,
      timetableTimeId
    );
  };

  const handleEditBodyCell = async (
    timetablePropertyId: string,
    label: string
  ) => {
    await timetablePropertiesContext.postUpdateTimetableProperty(
      timetablePropertyId,
      label
    );
  };

  const handleDeleteRow = async (timetablePropertyId: string) => {
    await timetablePropertiesContext.deleteTimetableProperty(
      timetablePropertyId
    );
  };

  // Cell
  const handleAddCell = async (
    value: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => {
    const newProperty =
      await timetablePropertiesContext.postCreateTimetableProperty(
        value,
        timetableId,
        timetableCategoryId,
        timetableTimeId
      );
    console.log("newProperty: ", newProperty);

    setTimetableProperties((prevState) => {
      return [...prevState, newProperty];
    });
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" align="left">
          {timetable.label}
        </Typography>
        <Button onClick={() => handleDeleteTimetable(timetable._id)}>
          <DeleteIcon />
        </Button>
      </Box>
      <TimetableTableTemplate
        columns={columns}
        rows={rows}
        handleAddColumn={handleAddColumn}
        handleEditHeadCell={handleEditHeadCell}
        handleDeleteColumn={handleDeleteColumn}
        handleAddRow={handleAddRow}
        handleEditBodyCell={handleEditBodyCell}
        handleDeleteRow={handleDeleteRow}
        handleAddCell={handleAddCell}
      />
    </Box>
  );
}

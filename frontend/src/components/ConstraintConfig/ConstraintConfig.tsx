import React, { useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { ConstraintParamsContext } from "../../context/ConstraintParamsContext";
import { ConstraintsContext } from "../../context/ConstraintsContext";
import ConstraintTableTemplate from "./ConstraintTableTemplate";

export default function ConstraintConfig() {
  const [columns, setColumns] = useState<string[]>([
    "checkBox",
    "constraint_string",
    "editDelete",
  ]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [constraintParams, setConstraintParams] = useState({});

  const constraintParamsContext = useContext(ConstraintParamsContext);
  const constraintsContext = useContext(ConstraintsContext);

  useEffect(() => {
    async function fetchConstraintParams() {
      await constraintParamsContext.getConstraintParams();
    }
    if (!constraintParamsContext.currentConstraintParams) {
      fetchConstraintParams();
    }
    if (constraintParamsContext.currentConstraintParams) {
      setConstraintParams(constraintParamsContext.currentConstraintParams);
    }
  }, [constraintParamsContext]);

  useEffect(() => {
    async function fetchConstraints() {
      await constraintsContext.getConstraints();
    }
    if (!constraintsContext.currentConstraints) {
      fetchConstraints();
    }
    if (constraintsContext.currentConstraints) {
      setRows(constraintsContext.currentConstraints);
    }
  }, [constraintsContext]);

  const handleAddRow = async (constraint: Record<string, any>) => {
    console.log("handleAddRow called: ");

    await constraintsContext.postCreateConstraint(constraint);
  };

  const handleEditRow = async (
    constraintId: string,
    constraint: Record<string, any>
  ) => {
    await constraintsContext.postUpdateConstraint(constraintId, constraint);
  };

  const handleEditRowStatus = async (constraintId: string, active: boolean) => {
    console.log("handleEditRowStatus called: ", constraintId, active);
    await constraintsContext.postUpdateConstraintStatus(constraintId, active);
  };

  const handleDeleteRow = async (constraintId: string) => {
    await constraintsContext.deleteConstraint(constraintId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Constraints Configuration
      </Typography>
      <ConstraintTableTemplate
        columns={columns}
        rows={rows}
        constraintParams={constraintParams}
        handleAddRow={handleAddRow}
        handleEditRow={handleEditRow}
        handleEditRowStatus={handleEditRowStatus}
        handleDeleteRow={handleDeleteRow}
      />
    </Box>
  );
}

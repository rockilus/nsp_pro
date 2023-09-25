import React, { useCallback, useContext, useEffect, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CancelIcon from "@mui/icons-material/Cancel";
import Typography from "@mui/material/Typography";

import AddTypeTemplate from "./AddTypeTemplate";
import BasicSelect from "../Utils/BasicSelect";
import OrdTypeTemplate from "./OrdTypeTemplate";
import SeqTypeTemplate from "./SeqTypeTemplate";
import SumTypeTemplate from "./SumTypeTemplate";

interface Props {
  setAddingConstraint: (value: boolean) => void;
}

export default function NewConstraint({ setAddingConstraint }: Props) {
  const [constraintType, setConstraintType] = useState("");
  const [softOrHard, setSoftOrHard] = useState("");
  const [softPriority, setSoftPriority] = useState("");

  const constraintTypesOptions: Record<string, string> = {
    add: "Add",
    sum: "Sum",
    sequence: "Sequence",
    order: "Order",
  };

  const softOrHardOptions: Record<string, string> = {
    hard: "Hard",
    soft: "Soft",
  };

  const softPriorityOptions: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          pt: 2,
          pr: 2,
          pl: 2,
        }}
      >
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          New Constraint
        </Typography>
        <CancelIcon
          onClick={() => setAddingConstraint(false)}
          sx={{ color: "text.secondary", cursor: "pointer" }}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <BasicSelect
          label="Constraint Type"
          options={constraintTypesOptions}
          value={constraintType}
          setValue={setConstraintType}
        />
        <BasicSelect
          label="Soft or Hard Constraint"
          options={softOrHardOptions}
          value={softOrHard}
          setValue={setSoftOrHard}
        />
        {softOrHard === "soft" && (
          <BasicSelect
            label="Soft Constraint Priority"
            options={softPriorityOptions}
            value={softPriority}
            setValue={setSoftPriority}
          />
        )}
      </Box>
      {constraintType === "add" && <AddTypeTemplate />}
      {constraintType === "sum" && <SumTypeTemplate />}
      {constraintType === "sequence" && <SeqTypeTemplate />}
      {constraintType === "order" && <OrdTypeTemplate />}
      <Button
        variant="outlined"
        color="primary"
        startIcon={<AddIcon />}
        style={{ marginTop: "10px" }}
      >
        Add Constraint
      </Button>
    </Box>
  );
}

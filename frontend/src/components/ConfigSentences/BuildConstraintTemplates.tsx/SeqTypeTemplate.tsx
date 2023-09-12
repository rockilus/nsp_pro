import React, { useState } from "react";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import BasicSelect from "../../Utils/BasicSelect";

interface Props {
  variableOptions: string[];
  constraintParamOption: Record<string, any>;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  quantifiedVariable: string;
  setQuantifiedVariable: React.Dispatch<React.SetStateAction<string>>;
  varValue: string;
  setVarValue: React.Dispatch<React.SetStateAction<string>>;
  operator: string;
  setOperator: React.Dispatch<React.SetStateAction<string>>;
}

export default function SeqTypeTemplate({
  variableOptions,
  constraintParamOption,
  quantity,
  setQuantity,
  quantifiedVariable,
  setQuantifiedVariable,
  varValue,
  setVarValue,
  operator,
  setOperator,
}: Props) {
  // const variableOptions: Record<string, string> = {
  //   worker: "worker",
  //   day: "day",
  //   shift: "shift",
  // };

  // const operatorOptions: Record<string, string> = {
  //   at_least: "At least",
  //   at_most: "At most",
  // };

  const varValueOptions: string[] = ["off", "morning", "afternoon", "night"];

  // const timingOptions: Record<string, string> = {
  //   per: "per",
  // };

  // const refVarValueOptions: Record<string, string> = {
  //   week: "week",
  // };

  // [At most] [2] consecutive [shift_0]

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <BasicSelect
        label="Operator"
        options={constraintParamOption.operator_options}
        value={operator}
        setValue={setOperator}
      />
      <TextField
        label="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        sx={{ minWidth: 80 }}
      />
      <Typography>consecutive</Typography>
      <BasicSelect
        label="Variable"
        options={variableOptions}
        value={quantifiedVariable}
        setValue={setQuantifiedVariable}
      />
      <BasicSelect
        label="Variable Value"
        options={varValueOptions}
        value={varValue}
        setValue={setVarValue}
      />
    </Box>
  );
}

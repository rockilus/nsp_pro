import React, { useState } from "react";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

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
  timing: string;
  setTiming: React.Dispatch<React.SetStateAction<string>>;
  operator: string;
  setOperator: React.Dispatch<React.SetStateAction<string>>;
  referenceVariable: string;
  setReferenceVariable: React.Dispatch<React.SetStateAction<string>>;
  refVarValue: string | number;
  setRefVarValue: React.Dispatch<React.SetStateAction<string | number>>;
}

export default function SumTypeTemplate({
  variableOptions,
  constraintParamOption,
  quantity,
  setQuantity,
  quantifiedVariable,
  setQuantifiedVariable,
  varValue,
  setVarValue,
  timing,
  setTiming,
  operator,
  setOperator,
  referenceVariable,
  setReferenceVariable,
  refVarValue,
  setRefVarValue,
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

  // [At least] [1] [shift_0] per [week]

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
        type="number"
        onChange={(e) => setQuantity(parseInt(e.target.value))}
        sx={{ minWidth: 80 }}
      />
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
      <BasicSelect
        label="Timing"
        options={constraintParamOption.timing_options}
        value={timing}
        setValue={setTiming}
      />
      <BasicSelect
        label="Variable"
        options={variableOptions}
        value={referenceVariable}
        setValue={setReferenceVariable}
      />
      <BasicSelect
        label="Variable Value"
        options={constraintParamOption.ref_var_value_options}
        value={refVarValue}
        setValue={setRefVarValue}
      />
    </Box>
  );
}

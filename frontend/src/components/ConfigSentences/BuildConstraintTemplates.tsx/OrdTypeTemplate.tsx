import React, { useState } from "react";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import BasicSelect from "../../Utils/BasicSelect";

interface Props {
  variableOptions: string[];
  constraintParamOption: Record<string, any>;
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
  refVarValue: string;
  setRefVarValue: React.Dispatch<React.SetStateAction<string>>;
  otherVariable: string;
  setOtherVariable: React.Dispatch<React.SetStateAction<string>>;
  otherVarValue: string;
  setOtherVarValue: React.Dispatch<React.SetStateAction<string>>;
}

export default function OrdTypeTemplate({
  variableOptions,
  constraintParamOption,
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
  otherVariable,
  setOtherVariable,
  otherVarValue,
  setOtherVarValue,
}: Props) {
  // const variableOptions: Record<string, string> = {
  //   worker: "worker",
  //   day: "day",
  //   shift: "shift",
  // };

  // const operatorOptions: Record<string, string> = {
  //   no: "No",
  // };

  const varValueOptions: string[] = ["off", "morning", "afternoon", "night"];

  // const timingOptions: Record<string, string> = {
  //   after: "after",
  // };

  const refVarValueOptions: string[] = ["off", "morning", "afternoon", "night"];

  // [No] [shift_1] for [1] [day] [after] [shift_3]
  // [No] [shift_1] on [day] [1] [after] [shift_3]

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <BasicSelect
        label="Operator"
        options={constraintParamOption.operator_options}
        value={operator}
        setValue={setOperator}
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
      <Typography variant="body1" sx={{ alignSelf: "center", mx: 1 }}>
        on
      </Typography>
      {/* <BasicSelect
        label="Variable Value"
        options={refVarValueOptions}
        value={refVarValue}
        setValue={setRefVarValue}
      /> */}
      <BasicSelect
        label="Variable"
        options={variableOptions}
        value={referenceVariable}
        setValue={setReferenceVariable}
      />
      <TextField
        label="Quantity"
        value={refVarValue}
        onChange={(e) => setRefVarValue(e.target.value)}
        sx={{ minWidth: 80 }}
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
        value={otherVariable}
        setValue={setOtherVariable}
      />
      <BasicSelect
        label="Variable Value"
        options={refVarValueOptions}
        value={otherVarValue}
        setValue={setOtherVarValue}
      />
    </Box>
  );
}

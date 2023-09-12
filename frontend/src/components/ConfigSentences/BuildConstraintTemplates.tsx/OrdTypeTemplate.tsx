import React, { useState } from "react";

import Box from "@mui/material/Box";

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

  // [No] [shift_1] after [shift_3]

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
        options={refVarValueOptions}
        value={refVarValue}
        setValue={setRefVarValue}
      />
    </Box>
  );
}

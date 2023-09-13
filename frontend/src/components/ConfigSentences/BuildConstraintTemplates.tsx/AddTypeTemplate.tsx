import React, { useEffect, useState } from "react";

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
  timing: string;
  setTiming: React.Dispatch<React.SetStateAction<string>>;
  referenceVariable: string;
  setReferenceVariable: React.Dispatch<React.SetStateAction<string>>;
}

export default function AddTypeTemplate({
  variableOptions,
  constraintParamOption,
  quantity,
  setQuantity,
  quantifiedVariable,
  setQuantifiedVariable,
  timing,
  setTiming,
  referenceVariable,
  setReferenceVariable,
}: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
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
        label="Operator"
        options={constraintParamOption.operator_options}
        value={timing}
        setValue={setTiming}
      />
      <BasicSelect
        label="Variable"
        options={variableOptions}
        value={referenceVariable}
        setValue={setReferenceVariable}
      />
    </Box>
  );
}

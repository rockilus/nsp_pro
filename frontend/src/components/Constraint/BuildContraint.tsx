import React, { useCallback, useContext, useEffect, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import AddTypeTemplate from "./BuildConstraintTemplates.tsx/AddTypeTemplate";
import BasicSelect from "../Utils/BasicSelect";
import OrdTypeTemplate from "./BuildConstraintTemplates.tsx/OrdTypeTemplate";
import SeqTypeTemplate from "./BuildConstraintTemplates.tsx/SeqTypeTemplate";
import SumTypeTemplate from "./BuildConstraintTemplates.tsx/SumTypeTemplate";
import { ConstraintT } from "./types";

interface Props {
  constraintParams: Record<string, any>;
  constraint: Record<string, any>;
  handleAddRow: (newRow: ConstraintT) => void;
  handleEditRow: (rowId: string, constraint: Record<string, any>) => void;
  editMode: boolean;
}

export default function BuildConstraint({
  constraintParams,
  constraint,
  handleAddRow,
  handleEditRow,
  editMode,
}: Props) {
  const [constraintType, setConstraintType] = useState(
    constraint.constraint?.constraint_type || ""
  );
  const [softOrHard, setSoftOrHard] = useState(
    constraint.constraint?.soft_or_hard || ""
  );
  const [softPriority, setSoftPriority] = useState(
    constraint.constraint?.soft_priority || ""
  );

  const [quantity, setQuantity] = useState(
    constraint.constraint_definition?.quantity || 0
  );
  const [quantifiedVariable, setQuantifiedVariable] = useState(
    constraint.constraint_definition?.quantified_variable || ""
  );
  const [varValue, setVarValue] = useState(
    constraint.constraint_definition?.var_value || ""
  );
  const [timing, setTiming] = useState(
    constraint.constraint_definition?.timing || ""
  );
  const [operator, setOperator] = useState(
    constraint.constraint_definition?.operator || ""
  );
  const [referenceVariable, setReferenceVariable] = useState(
    constraint.constraint_definition?.reference_variable || ""
  );
  const [refVarValue, setRefVarValue] = useState<string | number>(
    constraint.constraint_definition?.ref_var_value || ""
  );
  const [otherVariable, setOtherVariable] = useState(
    constraint.constraint_definition?.other_variable || ""
  );
  const [otherVarValue, setOtherVarValue] = useState(
    constraint.constraint_definition?.other_var_value || ""
  );

  const searchConstraintParamOption = (searchValue: string) => {
    return constraintParams.constraint_param_options.find(
      (item: Record<string, any>) => item.constraint_type === searchValue
    );
  };

  const handleBuildAndAddConstraint = async () => {
    const constraint: ConstraintT = {
      id: "",
      name: "",
      type: constraintType,
      hard: softOrHard,
      priority: softPriority,
      active: true,
    };
    const constraintDict = {
      constraint: {
        constraint_type: constraintType,
        soft_or_hard: softOrHard,
        soft_priority: softPriority,
      },
      constraint_definition: {
        quantity: quantity,
        quantified_variable: quantifiedVariable,
        var_value: varValue,
        timing: timing,
        operator: operator,
        reference_variable: referenceVariable,
        ref_var_value: refVarValue,
        other_variable: otherVariable,
        other_var_value: otherVarValue,
      },
    };
    await handleAddRow(constraint);
  };

  const handleEditConstraint = async () => {
    const constraintDict = {
      constraint: {
        constraint_type: constraintType,
        soft_or_hard: softOrHard,
        soft_priority: softPriority,
      },
      constraint_definition: {
        quantity: quantity,
        quantified_variable: quantifiedVariable,
        var_value: varValue,
        timing: timing,
        operator: operator,
        reference_variable: referenceVariable,
        ref_var_value: refVarValue,
      },
    };
    await handleEditRow(constraint._id, constraintDict);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <BasicSelect
          label="Constraint Type"
          options={constraintParams.constraint_param.constraint_types_options}
          value={constraintType}
          setValue={setConstraintType}
        />
        <BasicSelect
          label="Soft or Hard Constraint"
          options={constraintParams.constraint_param.soft_or_hard_options}
          value={softOrHard}
          setValue={setSoftOrHard}
        />
        {softOrHard === "soft" && (
          <BasicSelect
            label="Soft Constraint Priority"
            options={constraintParams.constraint_param.soft_priority_options}
            value={softPriority}
            setValue={setSoftPriority}
          />
        )}
      </Box>
      {constraintType === "add" && (
        <AddTypeTemplate
          variableOptions={constraintParams.constraint_param.variable_options}
          constraintParamOption={searchConstraintParamOption("add")}
          quantity={quantity}
          setQuantity={setQuantity}
          quantifiedVariable={quantifiedVariable}
          setQuantifiedVariable={setQuantifiedVariable}
          timing={timing}
          setTiming={setTiming}
          referenceVariable={referenceVariable}
          setReferenceVariable={setReferenceVariable}
        />
      )}
      {constraintType === "sum" && (
        <SumTypeTemplate
          variableOptions={constraintParams.constraint_param.variable_options}
          constraintParamOption={searchConstraintParamOption("sum")}
          quantity={quantity}
          setQuantity={setQuantity}
          quantifiedVariable={quantifiedVariable}
          setQuantifiedVariable={setQuantifiedVariable}
          varValue={varValue}
          setVarValue={setVarValue}
          timing={timing}
          setTiming={setTiming}
          operator={operator}
          setOperator={setOperator}
          referenceVariable={referenceVariable}
          setReferenceVariable={setReferenceVariable}
          refVarValue={refVarValue}
          setRefVarValue={setRefVarValue}
        />
      )}
      {constraintType === "sequence" && (
        <SeqTypeTemplate
          variableOptions={constraintParams.constraint_param.variable_options}
          constraintParamOption={searchConstraintParamOption("sequence")}
          quantity={quantity}
          setQuantity={setQuantity}
          quantifiedVariable={quantifiedVariable}
          setQuantifiedVariable={setQuantifiedVariable}
          timing={timing}
          setTiming={setTiming}
          operator={operator}
          setOperator={setOperator}
          referenceVariable={referenceVariable}
          setReferenceVariable={setReferenceVariable}
          refVarValue={refVarValue}
          setRefVarValue={setRefVarValue}
        />
      )}
      {constraintType === "order" && (
        <OrdTypeTemplate
          variableOptions={constraintParams.constraint_param.variable_options}
          constraintParamOption={searchConstraintParamOption("order")}
          quantifiedVariable={quantifiedVariable}
          setQuantifiedVariable={setQuantifiedVariable}
          varValue={varValue}
          setVarValue={setVarValue}
          timing={timing}
          setTiming={setTiming}
          operator={operator}
          setOperator={setOperator}
          referenceVariable={referenceVariable}
          setReferenceVariable={setReferenceVariable}
          refVarValue={refVarValue}
          setRefVarValue={setRefVarValue}
          otherVariable={otherVariable}
          setOtherVariable={setOtherVariable}
          otherVarValue={otherVarValue}
          setOtherVarValue={setOtherVarValue}
        />
      )}
      {constraintType === "" && <Box sx={{ height: 56 }}></Box>}
      {editMode ? (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          style={{ marginTop: "10px" }}
          onClick={handleEditConstraint}
        >
          Update Constraint
        </Button>
      ) : (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          style={{ marginTop: "10px" }}
          onClick={handleBuildAndAddConstraint}
        >
          Add Constraint
        </Button>
      )}
    </Box>
  );
}

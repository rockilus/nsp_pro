import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";

import { useConstraintStore } from "../../stores/constraintStore";
import { ConstraintT } from "./types";

interface Props {
  constraint: ConstraintT;
  handleClose: () => void;
}

export default function NewConstraint({ constraint, handleClose }: Props) {
  const [constraintState, setConstraintState] =
    useState<ConstraintT>(constraint);

  const addConstraint = useConstraintStore((state) => state.addConstraint);
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );

  const handleSaveConstraint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (constraintState.id == "") {
      addConstraint(constraintState);
    } else {
      updateConstraint(constraintState);
    }
    handleClose();
  };

  return (
    <FormControl fullWidth>
      <Box
        component={"form"}
        onSubmit={(e) => {
          handleSaveConstraint(e);
        }}
        sx={{
          display: "flex",
          flexDirection: constraint.id === "" ? "row" : "column",
          // alignItems: "center",
        }}
      >
        <TextField
          id="outlined-basic"
          label="Constraint"
          variant="outlined"
          value={constraintState.text}
          onChange={(e) =>
            setConstraintState({ ...constraintState, text: e.target.value })
          }
          sx={{ width: "100%" }}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            // width: "100%",
          }}
        >
          {constraint.id !== "" && (
            <Button
              variant="contained"
              sx={{ marginRight: 1 }}
              onClick={handleClose}
            >
              Cancel
            </Button>
          )}
          <Button variant="contained" type="submit">
            {constraint.id === "" ? "Add" : "Save"}
          </Button>
        </Box>
      </Box>
    </FormControl>
  );
}

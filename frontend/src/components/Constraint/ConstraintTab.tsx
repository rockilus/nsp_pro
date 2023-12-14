import React, { useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import ConstraintList from "./ConstraintList";
import ConstraintButton from "./ConstraintButton";
import { useConstraintStore } from "../../stores/constraintStore";
import { useConstraintTreeStore } from "../../stores/constraintTreeStore";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintTab({ workers, shifts }: Props) {
  const constraints = useConstraintStore((state) => state.constraints);
  const constraintTree = useConstraintTreeStore(
    (state) => state.constraintTree
  );
  const fetchConstraints = useConstraintStore(
    (state) => state.fetchConstraints
  );
  const fetchConstraintTree = useConstraintTreeStore(
    (state) => state.fetchConstraintTree
  );

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  useEffect(() => {
    fetchConstraintTree();
  }, [fetchConstraintTree]);

  const createButton = () => {
    return (
      <Button variant="contained" color="primary" startIcon={<AddIcon />}>
        Create
      </Button>
    );
  };

  return (
    <Box style={{ width: "100%", backgroundColor: "white" }}>
      <Typography variant="h4" align="left" color="black">
        Constraints Configuration
      </Typography>
      <ConstraintButton
        buttonElement={createButton()}
        constraint={{
          id: "",
          buildBlocks: [],
          hard: true,
          priority: "",
          active: true,
        }}
        tree={constraintTree}
        workers={workers}
        shifts={shifts}
      />
      <ConstraintList
        constraints={constraints}
        tree={constraintTree}
        workers={workers}
        shifts={shifts}
      />
    </Box>
  );
}

import React, { useEffect } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import ConstraintCreate from "./ConstraintCreate";
import ConstraintList from "./ConstraintList";
import { useConstraintStore } from "../../stores/constraintStore";
import { useConstraintTreeStore } from "../../stores/constraintTreeStore";
import { ConstraintT, TreeNodeT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintConfig({ workers, shifts }: Props) {
  const constraints = useConstraintStore((state) => state.constraints);
  const constraintTree = useConstraintTreeStore(
    (state) => state.constraintTree
  );
  const fetchConstraints = useConstraintStore(
    (state) => state.fetchConstraints
  );
  const addConstraint = useConstraintStore((state) => state.addConstraint);
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );
  const deleteConstraint = useConstraintStore(
    (state) => state.deleteConstraint
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

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Constraints Configuration
      </Typography>
      <ConstraintCreate
        constraint={{
          id: "",
          buildBlocks: [],
          hard: true,
          priority: "no",
          active: true,
        }}
        tree={constraintTree}
        workers={workers}
        shifts={shifts}
      />
      <ConstraintList
        constraints={constraints}
        workers={workers}
        shifts={shifts}
      />
    </Box>
  );
}

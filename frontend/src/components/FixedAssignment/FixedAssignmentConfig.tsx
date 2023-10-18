import React, { useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import FixedAssignmentButton from "./FixedAssignmentButton";
import FixedAssignmentsList from "./FixedAssignmentsList";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FixedAssignmentConfig({ workers, shifts }: Props) {
  const fixedAssignments = useFixedAssignmentStore(
    (state) => state.fixedAssignments
  );
  const fetchFixedAssignments = useFixedAssignmentStore(
    (state) => state.fetchFixedAssignments
  );

  useEffect(() => {
    fetchFixedAssignments();
  }, [fetchFixedAssignments]);

  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const createButton = () => {
    return (
      <Button variant="contained" color="primary" startIcon={<AddIcon />}>
        Create
      </Button>
    );
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        FixedAssignment Selection
      </Typography>
      <FixedAssignmentButton
        buttonElement={createButton()}
        fixedAssignment={{
          id: "",
          workerId: "",
          date: dateToTimeZero(new Date()),
          shiftId: "",
        }}
        workers={workers}
        shifts={shifts}
      />
      <FixedAssignmentsList
        fixedAssignments={fixedAssignments}
        workers={workers}
        shifts={shifts}
      />
    </Box>
  );
}

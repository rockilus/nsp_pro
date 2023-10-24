import React, { useCallback, useEffect, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import FARButton from "./FARButton";
import FARList from "./FARList";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
import { FixedAssignmentT, RequestT, FarT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FARConfig({ workers, shifts }: Props) {
  const [fars, setFars] = useState<FarT[]>([]);
  const fixedAssignments = useFixedAssignmentStore(
    (state) => state.fixedAssignments
  );
  const requests = useRequestStore((state) => state.requests);
  const fetchFixedAssignments = useFixedAssignmentStore(
    (state) => state.fetchFixedAssignments
  );
  const fetchRequests = useRequestStore((state) => state.fetchRequests);

  const FixedAssignmentToFar = (fa: FixedAssignmentT): FarT => {
    const far: FarT = {
      ...fa,
      priority: "",
      isFA: true,
    };
    return far;
  };
  const RequestoFar = (r: RequestT) => {
    const far: FarT = {
      ...r,
      isFA: false,
    };
    return far;
  };

  const buildFarsArray = useCallback(
    (fixedAssignments: FixedAssignmentT[], requests: RequestT[]): FarT[] => {
      const fars: FarT[] = [
        ...fixedAssignments.map(FixedAssignmentToFar),
        ...requests.map(RequestoFar),
      ];
      return fars.sort((a, b) => {
        return a.date.getTime() - b.date.getTime();
      });
    },
    []
  );

  useEffect(() => {
    fetchFixedAssignments();
  }, [fetchFixedAssignments]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setFars(buildFarsArray(fixedAssignments, requests));
  }, [fixedAssignments, requests, buildFarsArray]);

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
        Fixed Assignments and Requests
      </Typography>
      <FARButton
        buttonElement={createButton()}
        far={{
          id: "",
          workerId: "",
          date: dateToTimeZero(new Date()),
          shiftId: "",
          priority: "",
          isFA: true,
          status: "pending",
        }}
        workers={workers}
        shifts={shifts}
      />
      <FARList fars={fars} workers={workers} shifts={shifts} />
    </Box>
  );
}

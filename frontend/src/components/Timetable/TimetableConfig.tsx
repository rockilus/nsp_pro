import React, { useContext, useEffect, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import TimetableProcess from "./TimetableProcess";

import { TimetablesContext } from "../../context/TimetablesContext";

export default function TimetableConfig() {
  const [timetables, setTimetables] = useState<Record<string, any>[]>([]);

  const timetablesContext = useContext(TimetablesContext);

  useEffect(() => {
    async function fetchTimetables() {
      await timetablesContext.getTimetables();
    }
    if (!timetablesContext.currentTimetables) {
      fetchTimetables();
    }
    if (timetablesContext.currentTimetables) {
      setTimetables(timetablesContext.currentTimetables);
    }
  }, [timetablesContext]);

  const handleCreateTimetable = async () => {
    await timetablesContext.postCreateTimetable();
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Timetables Configuration
      </Typography>
      <Button onClick={handleCreateTimetable}>
        <AddIcon />
        New Timetable
      </Button>
      {timetables.map((timetable) => (
        <TimetableProcess
          key={timetable.timetable._id}
          timetableInfo={timetable}
        />
      ))}
    </Box>
  );
}

import React, { useContext } from "react";

import DoctorCard from "./DoctorCard";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import { DoctorsContext } from "../../context/DoctorsContext";
import { styled } from "@mui/material/styles";

import { Doctor } from "../../types/index";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

export default function RenderDoctorCards() {
  const doctorsContext = useContext(DoctorsContext);

  return (
    <Grid
      container
      spacing={2}
      direction="column"
      justifyContent="flex-start"
      alignItems="stretch"
    >
      {doctorsContext.currentDoctors?.map((doctor: Doctor) => (
        <Grid item xs={8} key={doctor._id}>
          <Item>
            <DoctorCard doctor={doctor} />
          </Item>
        </Grid>
      ))}
    </Grid>
  );
}

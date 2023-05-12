import React, { useContext, useState } from "react";

import EditIcon from "@mui/icons-material/Edit";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { HospitalContext } from "../context/HospitalContext";

interface ParameterEntryProps {
  parameter: string;
  value: string;
}

const ParameterEntry = (props: ParameterEntryProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(props.value);
  const hospitalContext = useContext(HospitalContext);

  const handleSave = async () => {
    await hospitalContext.updateParameter(
      props.parameter,
      value,
      hospitalContext.currentHospital?._id || ""
    );
    setIsEditing(false);
  };

  return (
    <>
      <Grid item xs={2}>
        <Typography>{props.parameter}:</Typography>
      </Grid>
      {isEditing ? (
        <>
          <Grid item xs={4}>
            <TextField
              id="standard-basic"
              variant="standard"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
              }}
            />
          </Grid>
          <Grid item xs={1}>
            <CheckCircleOutlineIcon
              onClick={handleSave}
              sx={{ cursor: "pointer" }}
            ></CheckCircleOutlineIcon>
            <CancelOutlinedIcon
              onClick={() => setIsEditing(false)}
              sx={{ cursor: "pointer" }}
            ></CancelOutlinedIcon>
          </Grid>
        </>
      ) : (
        <>
          <Grid item xs={4}>
            <Typography>{props.value}</Typography>
          </Grid>
          <Grid item xs={1}>
            <EditIcon
              onClick={() => setIsEditing(true)}
              sx={{ cursor: "pointer" }}
            ></EditIcon>
          </Grid>
        </>
      )}
    </>
  );
};

export default function Parameters() {
  const hospitalContext = useContext(HospitalContext);

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="stretch"
    >
      {Object.entries(hospitalContext.currentHospital?.parameters || {}).map(
        ([key, value]) => {
          return (
            <Grid
              container
              direction="row"
              justifyContent="flex-start"
              alignItems="stretch"
              key={key}
            >
              <ParameterEntry parameter={key} value={value}></ParameterEntry>
            </Grid>
          );
        }
      )}
    </Grid>
  );
}

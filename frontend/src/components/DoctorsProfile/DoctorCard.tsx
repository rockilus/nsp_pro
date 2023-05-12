import React, { useContext, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { red } from "@mui/material/colors";

import { Doctor } from "../../types";
import { HospitalContext } from "../../context/HospitalContext";
import { DoctorsContext } from "../../context/DoctorsContext";

const bull = (
  <Box
    component="span"
    sx={{ display: "inline-block", mx: "2px", transform: "scale(0.8)" }}
  >
    •
  </Box>
);

interface DoctorCardProps {
  doctor: Doctor;
}

function getInitials(firstName: string, lastName: string): string[] {
  const initials = [];

  const firstNames = firstName.split("-");
  const lastNames = lastName.split("-");

  for (let i = 0; i < firstNames.length; i++) {
    const firstInitial = firstNames[i][0].toUpperCase();
    if (lastNames.length === 1) {
      const lastInitial = lastNames[0][0].toUpperCase();
      initials.push(`${firstInitial}${lastInitial}`);
    } else {
      for (let j = 0; j < lastNames.length; j++) {
        const lastInitial = lastNames[j][0].toUpperCase();
        initials.push(`${firstInitial}${lastInitial}`);
      }
    }
  }

  return initials;
}
interface EditDoctorProfileProps {
  doctor: Doctor;
  handleCancel: () => void;
}

const EditDoctorProfile = (props: EditDoctorProfileProps) => {
  const hospitalContext = useContext(HospitalContext);
  const doctorsContext = useContext(DoctorsContext);
  const [profile, setProfile] = useState(
    props.doctor.profile ? props.doctor.profile : {}
  );

  const handleChange = (event: SelectChangeEvent) => {
    setProfile((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async () => {
    await doctorsContext.saveUserProfile(profile, props.doctor._id);
    props.handleCancel();
  };

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="stretch"
    >
      {Object.entries(
        hospitalContext.currentHospital?.profile_validation || {}
      ).map(([key, value]) => {
        return (
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            key={key}
          >
            <Grid item xs={4}>
              <Typography>{key}:</Typography>
            </Grid>
            <Grid item xs={8}>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={profile[key] || ""}
                label={key}
                name={key}
                onChange={handleChange}
              >
                {value.map((item: any) => {
                  return (
                    <MenuItem value={item} key={item}>
                      {item}
                    </MenuItem>
                  );
                })}
              </Select>
            </Grid>
          </Grid>
        );
      })}
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="stretch"
      >
        <Grid item>
          <Button variant="contained" onClick={props.handleCancel}>
            Cancel
          </Button>
        </Grid>
        <Grid item>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};

interface ShowDoctorProfileProps {
  doctor: Doctor;
  handleEdit: () => void;
}

const ShowDoctorProfile = (props: ShowDoctorProfileProps) => {
  const hospitalContext = useContext(HospitalContext);
  const doctorsContext = useContext(DoctorsContext);
  const [profile, setProfile] = useState(
    props.doctor.profile ? props.doctor.profile : {}
  );

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="stretch"
    >
      {Object.entries(
        hospitalContext.currentHospital?.profile_validation || {}
      ).map(([key, value]) => {
        return (
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            key={key}
          >
            <Grid item xs={4}>
              <Typography>{key}:</Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography>{props.doctor.profile[key]}</Typography>
            </Grid>
          </Grid>
        );
      })}
      <Button variant="contained" onClick={props.handleEdit}>
        Edit
      </Button>
    </Grid>
  );
};

export default function DoctorCard(props: DoctorCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="stretch"
    >
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="stretch"
      >
        <Grid item xs="auto">
          <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe">
            {getInitials(props.doctor.first_name, props.doctor.last_name)}
          </Avatar>
        </Grid>
        <Grid item xs={8}>
          <Typography
            variant="h5"
            component="div"
            sx={{ textAlign: "left", marginLeft: "10px" }}
          >
            {`${props.doctor.first_name} ${props.doctor.last_name}`}
          </Typography>
        </Grid>
      </Grid>
      {isEditing ? (
        <EditDoctorProfile
          doctor={props.doctor}
          handleCancel={() => setIsEditing(false)}
        />
      ) : (
        <ShowDoctorProfile
          doctor={props.doctor}
          handleEdit={() => setIsEditing(true)}
        />
      )}
    </Grid>
  );
}

import React, { useContext, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { DoctorsContext } from "../../context/DoctorsContext";
import { HospitalContext } from "../../context/HospitalContext";

export default function BasicTextFields() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const doctorsContext = useContext(DoctorsContext);
  const hospitalContext = useContext(HospitalContext);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Submit new doctor");

    await doctorsContext.createUser(
      firstName,
      lastName,
      email,
      hospitalContext.currentHospital?._id || ""
    );
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        "& > :not(style)": { m: 1, width: "25ch" },
      }}
      noValidate
      autoComplete="off"
    >
      <TextField
        id="firstName"
        label="First Name"
        variant="standard"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <TextField
        id="lastName"
        label="Last Name"
        variant="standard"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <TextField
        id="email"
        label="Email"
        variant="standard"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
        Create Doctor
      </Button>
    </Box>
  );
}

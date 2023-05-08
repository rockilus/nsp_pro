import React, { useState, useEffect } from "react";

import AddOptionChip from "./AddOptionChip";
import NewEntryTextFields from "./NewEntryTextField";
import { getHospitalProfile } from "../api/configuration";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ValidateCancelChips from "./ValidateCancelChips";
import { Stack } from "@mui/material";

export default function HospitalProfile() {
  const [addOptionStatus, setAddOptionStatus] = useState(0);
  const [hospitalProfile, setHospitalProfile] = useState({});

  const handleAddOptionNextStep = () => {
    setAddOptionStatus(addOptionStatus + 1);
  };

  const handleAddOptionPreviousStep = () => {
    setAddOptionStatus(addOptionStatus - 1);
  };

  const fetchHospitalProfile = async () => {
    const response = await getHospitalProfile();
    console.log("response useEffect", response);
    setHospitalProfile(response);
  };

  //   useEffect(() => {
  //     fetchHospitalProfile();
  //   }, []);

  return (
    <Box>
      {
        [
          <AddOptionChip
            handleAddOptionNextStep={handleAddOptionNextStep}
            key={0}
          />,
          <NewEntryTextFields
            handleAddOptionNextStep={handleAddOptionNextStep}
            handleAddOptionPreviousStep={handleAddOptionPreviousStep}
            key={1}
          />,
        ][addOptionStatus]
      }
    </Box>
  );

  //   return (
  //     <Box>
  //       <div>
  //         <Typography variant="h6" gutterBottom>
  //           Doctor Profile Options
  //         </Typography>
  //       </div>
  //       {addOptionStatus === 1 && (
  //         <NewEntryTextFields
  //           handleAddOptionNextStep={handleAddOptionNextStep}
  //           handleAddOptionPreviousStep={handleAddOptionPreviousStep}
  //         />
  //       )}
  //       {addOptionStatus === 0 && (
  //         <AddOptionChip handleAddOptionNextStep={handleAddOptionNextStep} />
  //       )}
  //     </Box>
  //   );
}

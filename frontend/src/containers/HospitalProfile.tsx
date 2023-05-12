import React, { useState, useContext } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import NewEntryTextFields from "../components/HospitalProfile/NewEntryTextField";
import renderDictionary from "../components/HospitalProfile/RenderDictionary";
import { HospitalContext } from "../context/HospitalContext";

export default function HospitalProfile() {
  const [addingOption, setAddingOption] = useState(false);
  const hospitalContext = useContext(HospitalContext);

  const handleAddingOption = () => {
    setAddingOption(true);
  };

  const handleAddOptionCancel = () => {
    setAddingOption(false);
  };

  return (
    <Box>
      {hospitalContext.currentHospital &&
        typeof hospitalContext.currentHospital.profile === "object" &&
        renderDictionary(hospitalContext.currentHospital.profile, 0, [])}
      {addingOption ? (
        <NewEntryTextFields
          dictPath={[]}
          handleAddOptionCancel={handleAddOptionCancel}
        />
      ) : (
        <Chip
          icon={<AddIcon />}
          onClick={handleAddingOption}
          label="Add new option"
        />
      )}
    </Box>
  );
}

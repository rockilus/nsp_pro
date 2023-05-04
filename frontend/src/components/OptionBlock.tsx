import React, { useState } from "react";

import AddOptionChip from "./AddOptionChip";
import NewEntryTextFields from "./NewEntryTextField";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function OptionBlock() {
  const [addOptionStatus, setAddOptionStatus] = useState(0);

  const handleAddOptionNextStep = () => {
    setAddOptionStatus(addOptionStatus + 1);
  };

  const handleAddOptionPreviousStep = () => {
    setAddOptionStatus(addOptionStatus - 1);
  };

  return (
    <Box>
      <div>
        <Typography variant="h6" gutterBottom>
          Doctor Profile Options
        </Typography>
      </div>
      {addOptionStatus === 1 && (
        <NewEntryTextFields
          handleAddOptionNextStep={handleAddOptionNextStep}
          handleAddOptionPreviousStep={handleAddOptionPreviousStep}
        />
      )}
      {addOptionStatus === 0 && (
        <AddOptionChip handleAddOptionNextStep={handleAddOptionNextStep} />
      )}
    </Box>
  );
}

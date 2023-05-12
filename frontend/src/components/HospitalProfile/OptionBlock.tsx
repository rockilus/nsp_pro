import React, { useState, useContext } from "react";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import NewEntryTextFields from "./NewEntryTextField";
import { HospitalContext } from "../../context/HospitalContext";

const formatString = (inputString: string): string => {
  return inputString
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface OptionBlockProps {
  inputString: string;
  marginPx: number;
  dictPath: string[];
}

export default function OptionBlock(props: OptionBlockProps) {
  const [addingOption, setAddingOption] = useState(false);
  const hospitalContext = useContext(HospitalContext);

  const indent = {
    marginLeft: `${props.marginPx}px`,
  };

  const handleAddingOption = () => {
    setAddingOption(true);
  };

  const handleAddOptionCancel = () => {
    setAddingOption(false);
  };

  const handleDeleteOption = () => {
    hospitalContext.deleteOptionFromProfile(
      props.dictPath,
      hospitalContext.currentHospital?._id || ""
    );
  };

  return (
    <Stack direction="column" spacing={2}>
      <Stack direction="row" spacing={2}>
        <Typography key={props.inputString} style={indent}>
          {formatString(props.inputString)}
        </Typography>
        {!addingOption && (
          <Stack direction="row" spacing={0}>
            <Chip label="+" onClick={handleAddingOption} />
            <Chip label="-" onClick={handleDeleteOption} />
          </Stack>
        )}
      </Stack>
      {addingOption && (
        <NewEntryTextFields
          dictPath={props.dictPath}
          handleAddOptionCancel={handleAddOptionCancel}
        />
      )}
    </Stack>
  );
}

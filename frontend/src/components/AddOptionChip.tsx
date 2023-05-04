import * as React from "react";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FaceIcon from "@mui/icons-material/Face";
import Stack from "@mui/material/Stack";

// test

interface IconChipsProps {
  handleAddOptionNextStep: () => void;
}

const IconChips: React.FC<IconChipsProps> = (props) => {
  const handleClick = () => {
    props.handleAddOptionNextStep();
  };

  return (
    <Chip icon={<AddIcon />} onClick={handleClick} label="Add new option" />
  );
};

export default IconChips;

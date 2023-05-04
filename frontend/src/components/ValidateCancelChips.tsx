import * as React from "react";

import CheckIcon from "@mui/icons-material/Check";
import Chip from "@mui/material/Chip";
import ClearIcon from "@mui/icons-material/Clear";
import Stack from "@mui/material/Stack";

interface ValidateCancelChipsProps {
  handleAddOptionNextStep: () => void;
  handleAddOptionPreviousStep: () => void;
}

const ValidateCancelChips: React.FC<ValidateCancelChipsProps> = (props) => {
  const handleSubmitClick = () => {
    props.handleAddOptionNextStep();
  };

  const handleCancelClick = () => {
    props.handleAddOptionPreviousStep();
  };

  return (
    <Stack spacing={1} alignItems="center">
      <Stack direction="row" spacing={1}>
        <Chip
          icon={<CheckIcon />}
          color="primary"
          variant="outlined"
          onClick={handleSubmitClick}
        />
        <Chip
          icon={<ClearIcon />}
          color="primary"
          variant="outlined"
          onClick={handleCancelClick}
        />
      </Stack>
    </Stack>
  );
};

export default ValidateCancelChips;

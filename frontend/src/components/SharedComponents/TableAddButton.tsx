import * as React from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";

interface Props {
  text: string;
  handleClick?: () => void;
  showIcon?: boolean;
}

const TableAddButton = ({ text, handleClick, showIcon = true }: Props) => {
  return (
    <Button
      onClick={() => handleClick && handleClick()}
      startIcon={showIcon ? <AddIcon sx={{ height: "17px" }} /> : null}
      sx={{
        borderRadius: 4,
        textTransform: "none",
        border: "1px solid",
        height: "30px",
        color: "grey.700",
        "& .MuiButton-startIcon": {
          marginRight: "0px",
        },
      }}
    >
      {text}
    </Button>
  );
};
export default TableAddButton;

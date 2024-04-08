import * as React from "react";
// MUI
import Button from "@mui/material/Button";

interface Props {
  text: string;
  handleClick?: () => void;
}

const TableAddButton = ({ text, handleClick }: Props) => {
  return (
    <Button
      onClick={() => handleClick && handleClick()}
      sx={{
        borderRadius: 4,
        textTransform: "none",
        border: "1px solid",
        height: "30px",
        color: "grey.700",
        marginY: 1,
      }}
    >
      {text}
    </Button>
  );
};
export default TableAddButton;

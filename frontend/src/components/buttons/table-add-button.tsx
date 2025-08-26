import * as React from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
// Styles
import "./table-add-button.css";

const TableAddButton = ({
  text,
  handleClick,
  showIcon = true,
}: {
  text: string;
  handleClick?: () => void;
  showIcon?: boolean;
}) => {
  return (
    <button
      className="add-button"
      onClick={() => handleClick && handleClick()}
      data-testid={`add-${text.toLowerCase()}-button`}
    >
      {showIcon && <AddIcon sx={{ height: "17px" }} />}
      {text}
    </button>
  );
};
export default TableAddButton;

import React from "react";
// MUI
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// Styles
import "./lhs-header.css";

interface CreateAssignmentProps {
  lhsHeaderTitle: string;
  onClose: () => void;
}

const LHSHEader: React.FC<CreateAssignmentProps> = ({
  lhsHeaderTitle,
  onClose,
}) => {
  return (
    <div className="lhs-header-container">
      <span className="lhs-header-title">{lhsHeaderTitle}</span>
      <IconButton onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </div>
  );
};

export default LHSHEader;

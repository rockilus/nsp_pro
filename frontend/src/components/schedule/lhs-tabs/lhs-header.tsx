import React from "react";
// Styles
import "./lhs-header.css";

interface LHSHeaderProps {
  lhsHeaderTitle: string;
  onClose: () => void;
}

export default function LHSHEader({ lhsHeaderTitle, onClose }: LHSHeaderProps) {
  return (
    <div className="lhs-header-container">
      <span className="lhs-header-title">{lhsHeaderTitle}</span>
      <button className="lhs-header-close-button" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

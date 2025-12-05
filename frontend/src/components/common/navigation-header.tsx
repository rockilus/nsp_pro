"use client";

import React from "react";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// Styles
import "../../styles/navigation-styles.css";

interface NavigationHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton: boolean;
}

export default function NavigationHeader({
  title,
  onBack,
  showBackButton,
}: NavigationHeaderProps) {
  return (
    <div className="navigation-header">
      {showBackButton && onBack && (
        <IconButton
          onClick={onBack}
          aria-label="back"
          sx={{ padding: 0, marginRight: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
      )}
      <span className="navigation-header-title">{title}</span>
    </div>
  );
}
